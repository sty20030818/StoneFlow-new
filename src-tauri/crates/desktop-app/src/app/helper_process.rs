//! 管理 StoneFlow Helper 子进程的生命周期。
//!
//! 生命周期语义：
//! - 主 App `setup()` 完成时 spawn 一次；
//! - `RunEvent::Exit` 到来时 `shutdown()`，确保 Helper 不会成为孤儿进程；
//! - 环境变量 `STONEFLOW_HELPER_DISABLED=1` 跳过 spawn（用于本地调试纯主 App 路径，或临时回滚）。
//!
//! 设计取舍：不在主 App 里做自动重启（避免快捷键注册失败时反复重启拖慢启动），
//! Helper 自身即使失败只影响 Quick Capture 功能本身，不影响主 App 使用。

use std::path::{Path, PathBuf};
use std::process::{Child, Command};
use std::sync::Mutex;

use anyhow::{anyhow, Context, Result};

/// Helper 可执行文件名（对应 `src-tauri/helper-bin/Cargo.toml` 的 [[bin]].name）。
const HELPER_BIN_NAME: &str = if cfg!(windows) {
    "stoneflow-helper.exe"
} else {
    "stoneflow-helper"
};

/// 生产 bundle 中 Helper 相对于主 App 可执行文件的路径。
///
/// 约定：`StoneFlow.app/Contents/MacOS/stoneflow` → `StoneFlow.app/Contents/Library/LoginItems/StoneFlow Helper.app/Contents/MacOS/stoneflow-helper`
#[cfg(target_os = "macos")]
const MACOS_BUNDLE_HELPER_REL: &str =
    "Library/LoginItems/StoneFlow Helper.app/Contents/MacOS/stoneflow-helper";

/// Helper 子进程句柄，通过 `app.manage()` 放入 Tauri state，供 `RunEvent::Exit` 清理。
#[derive(Default)]
pub(crate) struct HelperProcessState {
    child: Mutex<Option<Child>>,
}

impl HelperProcessState {
    /// 替换（并清理旧的）Helper 子进程。调用方保证 `child` 正在运行。
    fn store(&self, child: Child) {
        let mut slot = match self.child.lock() {
            Ok(g) => g,
            Err(poisoned) => poisoned.into_inner(),
        };
        if let Some(mut old) = slot.take() {
            // 正常路径走不到，只是防御性 kill，避免句柄泄漏。
            let _ = old.kill();
            let _ = old.wait();
        }
        *slot = Some(child);
    }

    /// 退出时调用：kill + wait，最长阻塞到子进程退出或 kill 返回。
    pub(crate) fn shutdown(&self) {
        let mut slot = match self.child.lock() {
            Ok(g) => g,
            Err(poisoned) => poisoned.into_inner(),
        };
        if let Some(mut child) = slot.take() {
            match child.kill() {
                Ok(()) => log::info!("helper 子进程已请求退出 (pid={})", child.id()),
                Err(error) => log::warn!("helper 子进程 kill 失败: {error}"),
            }
            // 不强制 wait（阻塞时间敏感），但 try_wait 清理僵尸状态。
            let _ = child.wait();
        }
    }
}

/// Spawn Helper 子进程并把句柄记录到状态中。
///
/// 返回 Err 时主 App 继续正常启动，Quick Capture 降级为不可用；用户仍可通过主窗口创建任务。
pub(crate) fn spawn_helper(state: &HelperProcessState) -> Result<()> {
    if std::env::var("STONEFLOW_HELPER_DISABLED").ok().as_deref() == Some("1") {
        log::info!("检测到 STONEFLOW_HELPER_DISABLED=1，跳过 Helper 启动");
        return Ok(());
    }

    let binary =
        resolve_helper_binary_path().with_context(|| "无法定位 StoneFlow Helper 可执行文件")?;
    log::info!("即将启动 Helper: {}", binary.display());

    let child = Command::new(&binary)
        .spawn()
        .with_context(|| format!("spawn helper failed: {}", binary.display()))?;

    state.store(child);
    Ok(())
}

/// 根据构建模式解析 Helper 可执行文件的绝对路径。
fn resolve_helper_binary_path() -> Result<PathBuf> {
    let current_exe = std::env::current_exe().context("failed to read current executable path")?;

    // Debug 构建：所有 workspace bin 在同一 target/<profile>/ 目录下。
    if cfg!(debug_assertions) {
        let sibling_dir = current_exe
            .parent()
            .ok_or_else(|| anyhow!("current exe has no parent dir"))?
            .to_path_buf();
        let sibling = sibling_dir.join(HELPER_BIN_NAME);
        if sibling.exists() && !is_debug_helper_binary_stale(&sibling, &current_exe)? {
            return Ok(sibling);
        }

        // `tauri dev` 只会构建主 App 本身，不会顺带构建 Helper 二进制。
        // 这里 dev 下在二进制缺失或源码更新时做一次即时 `cargo build -p stoneflow-helper`：
        // - 首次启动会多等几秒（增量构建之后近乎瞬时）
        // - Helper 源码改动后不会继续启动旧二进制，避免快捷键逻辑与源码脱节
        // - 未装 cargo 或 workspace 不完整的场景会返回友好错误，主 App 启动不受影响（Quick Capture 降级不可用）
        try_cargo_build_helper(&current_exe)?;

        if sibling.exists() {
            return Ok(sibling);
        }
        return Err(anyhow!(
            "helper binary `{}` still not found after `cargo build`: {}",
            HELPER_BIN_NAME,
            sibling.display()
        ));
    }

    // Release / bundle 构建：
    #[cfg(target_os = "macos")]
    {
        // StoneFlow.app/Contents/MacOS/stoneflow → parent × 2 = Contents/
        let contents = current_exe
            .parent()
            .and_then(|p| p.parent())
            .ok_or_else(|| anyhow!("macOS bundle layout unexpected: {}", current_exe.display()))?;
        let candidate = contents.join(MACOS_BUNDLE_HELPER_REL);
        if candidate.exists() {
            return Ok(candidate);
        }
        Err(anyhow!(
            "helper binary not found in bundle: {}",
            candidate.display()
        ))
    }

    // 非 macOS 的 release 路径初版暂未定型（Windows 计划用 portable sibling，Linux TBD）。
    #[cfg(not(target_os = "macos"))]
    {
        let sibling = current_exe
            .parent()
            .ok_or_else(|| anyhow!("current exe has no parent dir"))?
            .join(HELPER_BIN_NAME);
        if sibling.exists() {
            return Ok(sibling);
        }
        Err(anyhow!(
            "helper binary `{}` not found (non-macOS release path not finalized)",
            HELPER_BIN_NAME
        ))
    }
}

/// Dev 兜底：就地 `cargo build -p stoneflow-helper`。
///
/// `--manifest-path` 从 `current_exe = <workspace>/target/debug/<bin>` 反推出
/// `<workspace>/Cargo.toml`，避免依赖当前进程 cwd。
fn try_cargo_build_helper(current_exe: &Path) -> Result<()> {
    let workspace_root = resolve_workspace_root_from_exe(current_exe)?;
    let manifest = workspace_root.join("Cargo.toml");
    if !manifest.exists() {
        return Err(anyhow!(
            "workspace Cargo.toml 不存在: {}（当前 exe: {}）",
            manifest.display(),
            current_exe.display()
        ));
    }

    log::info!(
        "Helper 二进制缺失，尝试 `cargo build -p stoneflow-helper` (manifest={})",
        manifest.display()
    );

    let status = Command::new("cargo")
        .args([
            "build",
            "--manifest-path",
            manifest
                .to_str()
                .ok_or_else(|| anyhow!("manifest path 含非 UTF-8 字符"))?,
            "--package",
            "stoneflow-helper",
        ])
        .status()
        .with_context(|| "执行 cargo 失败（PATH 中是否包含 cargo？）")?;

    if !status.success() {
        return Err(anyhow!(
            "cargo build stoneflow-helper 失败（退出状态 {status}）"
        ));
    }

    Ok(())
}

fn resolve_workspace_root_from_exe(current_exe: &Path) -> Result<PathBuf> {
    current_exe
        .parent() // target/debug
        .and_then(|p| p.parent()) // target
        .and_then(|p| p.parent()) // <workspace>
        .map(Path::to_path_buf)
        .ok_or_else(|| {
            anyhow!(
                "无法从主 App 可执行路径反推 workspace 根目录: {}",
                current_exe.display()
            )
        })
}

/// Dev 模式下判断 Helper 二进制是否落后于 Helper 相关源码。
fn is_debug_helper_binary_stale(binary: &Path, current_exe: &Path) -> Result<bool> {
    let binary_modified = binary
        .metadata()
        .with_context(|| format!("读取 Helper 二进制元数据失败: {}", binary.display()))?
        .modified()
        .with_context(|| format!("读取 Helper 二进制修改时间失败: {}", binary.display()))?;
    let workspace_root = resolve_workspace_root_from_exe(current_exe)?;

    let mut newest_source = std::time::SystemTime::UNIX_EPOCH;
    for path in [
        workspace_root.join("Cargo.toml"),
        workspace_root.join("helper-bin").join("Cargo.toml"),
        workspace_root
            .join("crates")
            .join("helper-app")
            .join("Cargo.toml"),
    ] {
        update_newest_modified(&path, &mut newest_source)?;
    }

    update_newest_modified_recursive(
        &workspace_root.join("helper-bin").join("src"),
        &mut newest_source,
    )?;
    update_newest_modified_recursive(
        &workspace_root.join("crates").join("helper-app").join("src"),
        &mut newest_source,
    )?;

    let stale = newest_source > binary_modified;
    if stale {
        log::info!(
            "Helper 二进制已过期，将重新构建 (binary={}, binary_modified={binary_modified:?}, newest_source={newest_source:?})",
            binary.display()
        );
    }
    Ok(stale)
}

fn update_newest_modified(path: &Path, newest: &mut std::time::SystemTime) -> Result<()> {
    if !path.exists() {
        return Ok(());
    }

    let modified = path
        .metadata()
        .with_context(|| format!("读取文件元数据失败: {}", path.display()))?
        .modified()
        .with_context(|| format!("读取文件修改时间失败: {}", path.display()))?;
    if modified > *newest {
        *newest = modified;
    }
    Ok(())
}

fn update_newest_modified_recursive(path: &Path, newest: &mut std::time::SystemTime) -> Result<()> {
    if !path.exists() {
        return Ok(());
    }

    for entry in
        std::fs::read_dir(path).with_context(|| format!("读取目录失败: {}", path.display()))?
    {
        let entry = entry.with_context(|| format!("读取目录项失败: {}", path.display()))?;
        let entry_path = entry.path();
        if entry_path.is_dir() {
            update_newest_modified_recursive(&entry_path, newest)?;
        } else {
            update_newest_modified(&entry_path, newest)?;
        }
    }
    Ok(())
}

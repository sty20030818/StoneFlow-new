use std::path::PathBuf;

use desktop_app::app::error::AppError;

pub async fn resolve_or_build_helper() -> Result<PathBuf, AppError> {
    if cfg!(debug_assertions) {
        log::info!("dev 模式：启动前强制重新编译 helper");
        build_helper_binary().await?;
        return find_helper_binary();
    }

    if let Ok(path) = find_helper_binary() {
        return Ok(path);
    }

    log::info!("helper 二进制不存在，尝试自动编译...");
    build_helper_binary().await?;
    find_helper_binary()
}

fn find_helper_binary() -> Result<PathBuf, AppError> {
    let current_exe =
        std::env::current_exe().map_err(|error| AppError::initialization(error.to_string()))?;
    let exe_dir = current_exe
        .parent()
        .ok_or_else(|| AppError::initialization("无法解析主程序目录"))?;
    let helper_binary_name = if cfg!(windows) {
        "stoneflow-helper.exe"
    } else {
        "stoneflow-helper"
    };

    #[cfg(not(target_os = "macos"))]
    let candidates = vec![exe_dir.join(helper_binary_name)];

    #[cfg(target_os = "macos")]
    let mut candidates = vec![exe_dir.join(helper_binary_name)];

    #[cfg(target_os = "macos")]
    {
        let login_item = exe_dir
            .parent()
            .and_then(|path| path.parent())
            .map(|contents_dir| {
                contents_dir
                    .join("Library")
                    .join("LoginItems")
                    .join("StoneFlow Helper.app")
                    .join("Contents")
                    .join("MacOS")
                    .join("stoneflow-helper")
            });
        if let Some(path) = login_item {
            candidates.insert(0, path);
        }
    }

    for path in &candidates {
        if path.exists() {
            return Ok(path.clone());
        }
    }

    Err(AppError::initialization(format!(
        "找不到 Helper 二进制，已检查: {}",
        candidates
            .iter()
            .map(|path| path.display().to_string())
            .collect::<Vec<_>>()
            .join(", ")
    )))
}

async fn build_helper_binary() -> Result<(), AppError> {
    let manifest_path = find_cargo_manifest_path()?;

    log::info!("编译 helper: cargo build -p stoneflow-helper");
    let output = tokio::process::Command::new("cargo")
        .args(["build", "-p", "stoneflow-helper"])
        .arg("--manifest-path")
        .arg(&manifest_path)
        .output()
        .await
        .map_err(|error| AppError::initialization(format!("cargo build 执行失败: {error}")))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(AppError::initialization(format!(
            "helper 编译失败:\n{stderr}"
        )));
    }

    log::info!("helper 编译完成");
    Ok(())
}

fn find_cargo_manifest_path() -> Result<PathBuf, AppError> {
    let current_exe =
        std::env::current_exe().map_err(|error| AppError::initialization(error.to_string()))?;
    let mut dir = current_exe
        .parent()
        .ok_or_else(|| AppError::initialization("无法解析主程序目录"))?;

    for _ in 0..5 {
        let candidate = dir.join("Cargo.toml");
        if candidate.exists() {
            return Ok(candidate);
        }
        if let Some(parent) = dir.parent() {
            dir = parent;
        } else {
            break;
        }
    }

    Err(AppError::initialization(
        "找不到 Cargo.toml，无法自动编译 helper".to_owned(),
    ))
}


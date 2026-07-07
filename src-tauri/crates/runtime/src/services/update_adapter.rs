//! Tauri updater adapter：封装 `tauri-plugin-updater`，实现 usecase 层的 `UpdatePort`。

use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;

use tauri_plugin_updater::UpdaterExt;

use stoneflow_domain::UpdateChannel;
use stoneflow_usecase::update::{UpdateInfo, UpdatePort};
use stoneflow_usecase::UsecaseError;

/// 生产环境 CDN 更新基础 URL。
const PROD_UPDATES_BASE_URL: &str = "https://release.sty20030818.space/stoneflow/updates";

/// 本地 Mock 服务器默认地址（配合 `bun run mock:updates` 使用）。
const MOCK_UPDATES_BASE_URL: &str = "http://localhost:1420/stoneflow/updates";

/// 环境变量名：设置后覆盖更新基础 URL（用于开发/测试）。
const ENV_UPDATES_BASE_URL: &str = "STONEFLOW_UPDATES_BASE_URL";

/// 环境变量名：设置为任意值时，自动使用本地 Mock 服务器地址。
const ENV_USE_MOCK: &str = "STONEFLOW_USE_MOCK_UPDATES";

/// Tauri 实现的更新端口。
#[derive(Clone)]
pub struct TauriUpdateAdapter {
    app: tauri::AppHandle,
}

impl TauriUpdateAdapter {
    pub fn new(app: tauri::AppHandle) -> Self {
        Self { app }
    }

    /// 解析当前应使用的更新基础 URL。
    ///
    /// 优先级：
    /// 1. `STONEFLOW_UPDATES_BASE_URL` 环境变量（最高优先级）
    /// 2. `STONEFLOW_USE_MOCK_UPDATES=1` 环境变量 → 使用本地 Mock 地址
    /// 3. debug 编译且 Mock 端口（1420）可访问 → 自动使用 Mock（仅 debug）
    /// 4. 默认使用生产地址
    fn resolve_base_url() -> String {
        // 1. 显式指定基础 URL
        if let Ok(url) = std::env::var(ENV_UPDATES_BASE_URL) {
            if !url.is_empty() {
                log::info!(target: "updater", "使用自定义更新地址: {url}");
                return url;
            }
        }

        // 2. 显式开启 Mock
        if let Ok(val) = std::env::var(ENV_USE_MOCK) {
            if val == "1" || val == "true" {
                log::info!(target: "updater", "使用本地 Mock 更新服务器: {MOCK_UPDATES_BASE_URL}");
                return MOCK_UPDATES_BASE_URL.to_string();
            }
        }

        // 3. Debug 模式下尝试自动检测 Mock 服务器（TCP 连接检测，200ms 超时）
        #[cfg(debug_assertions)]
        {
            if is_mock_server_reachable() {
                log::info!(target: "updater", "检测到本地 Mock 服务器，自动切换到: {MOCK_UPDATES_BASE_URL}");
                return MOCK_UPDATES_BASE_URL.to_string();
            }
        }

        // 4. 默认生产地址
        PROD_UPDATES_BASE_URL.to_string()
    }

    /// 根据渠道构造远端 endpoint URL。
    fn endpoint_url(channel: UpdateChannel, base_url: &str) -> String {
        format!("{}/{}/latest.json", base_url, channel.path_segment())
    }

    /// 根据渠道构建 UpdaterBuilder（配置 endpoint 和版本比较器）。
    fn build_updater(
        &self,
        channel: UpdateChannel,
    ) -> Result<tauri_plugin_updater::Updater, UsecaseError> {
        let base_url = Self::resolve_base_url();
        let url = Self::endpoint_url(channel, &base_url);
        let parsed_url: url::Url = url
            .parse()
            .map_err(|e: url::ParseError| UsecaseError::update(format!("endpoint URL 无效: {e}")))?;

        // release 构建中禁止 HTTP，防止意外配置错误（dangerousInsecureTransportProtocol 在 tauri.conf.json 中开启，
        // 仅用于 debug 模式下的本地 mock 测试；此处双重保险）
        #[cfg(not(debug_assertions))]
        if parsed_url.scheme() == "http" {
            return Err(UsecaseError::update(
                "release 构建禁止使用 HTTP 更新端点，请使用 HTTPS".to_string(),
            ));
        }

        #[cfg(debug_assertions)]
        if parsed_url.scheme() == "http" {
            log::warn!(target: "updater", "使用 HTTP 端点（仅开发/测试）: {url}");
        }

        let mut builder = self
            .app
            .updater_builder()
            .endpoints(vec![parsed_url])
            .map_err(|e| UsecaseError::update(format!("配置 updater endpoint 失败: {e}")))?;

        // Stable 渠道过滤掉预发布版本（如 0.2.0-beta.1）
        if channel == UpdateChannel::Stable {
            builder = builder.version_comparator(|_current, remote| {
                remote.version.pre.is_empty()
            });
        }

        builder
            .build()
            .map_err(|e| UsecaseError::update(format!("构建 updater 失败: {e}")))
    }
}

/// Debug 模式下快速检测 Mock 服务器是否运行（TCP 连接，超时 200ms）。
#[cfg(debug_assertions)]
fn is_mock_server_reachable() -> bool {
    use std::net::TcpStream;
    use std::time::Duration;

    // 用 TCP 连接检测 1420 端口是否开放，不依赖额外 HTTP 客户端
    TcpStream::connect_timeout(
        &"127.0.0.1:1420".parse().unwrap(),
        Duration::from_millis(200),
    )
    .is_ok()
}

impl UpdatePort for TauriUpdateAdapter {
    async fn check(
        &self,
        channel: UpdateChannel,
    ) -> Result<Option<UpdateInfo>, UsecaseError> {
        let updater = self.build_updater(channel)?;

        let update = updater
            .check()
            .await
            .map_err(|e| UsecaseError::update(format!("检查更新失败: {e}")))?;

        Ok(update.map(|u| {
            let pub_date = u.date.map(|d| {
                // OffsetDateTime 实现了 Display，输出为 ISO 8601 / RFC 3339 格式
                d.to_string()
            });
            UpdateInfo {
                version: u.version.to_string(),
                body: u.body.clone(),
                pub_date,
            }
        }))
    }

    async fn download_and_install(
        &self,
        channel: UpdateChannel,
        on_progress: impl Fn(u64, Option<u64>) + Send + Sync + 'static,
    ) -> Result<(), UsecaseError> {
        let updater = self.build_updater(channel)?;

        let update = updater
            .check()
            .await
            .map_err(|e| UsecaseError::update(format!("检查更新失败: {e}")))?
            .ok_or_else(|| UsecaseError::update("当前没有可用更新"))?;

        let downloaded = Arc::new(AtomicU64::new(0));
        let downloaded_clone = downloaded.clone();
        update
            .download_and_install(
                move |chunk_length, content_length| {
                    downloaded_clone.fetch_add(chunk_length as u64, Ordering::SeqCst);
                    let total = downloaded_clone.load(Ordering::SeqCst);
                    on_progress(total, content_length);
                },
                || {},
            )
            .await
            .map_err(|e| UsecaseError::update(format!("下载或安装更新失败: {e}")))?;

        Ok(())
    }

    async fn restart(&self) -> Result<(), UsecaseError> {
        self.app.restart();
        // restart() 会终止当前进程，以下代码仅为类型兼容
        #[allow(unreachable_code)]
        Ok(())
    }
}

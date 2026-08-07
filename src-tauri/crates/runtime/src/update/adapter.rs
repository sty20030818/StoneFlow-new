//! Tauri updater adapter：封装 `tauri-plugin-updater`，实现 usecase 层的 `UpdatePort`。

use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;

use tauri_plugin_updater::UpdaterExt;

use stoneflow_application::update::{CheckedUpdate, UpdatePort};
use stoneflow_application::ApplicationError;
use stoneflow_domain::UpdateChannel;

use crate::release_endpoint::resolve_release_base_url;

/// Tauri 实现的更新端口。
#[derive(Clone)]
pub struct TauriUpdateAdapter {
    app: tauri::AppHandle,
}

impl TauriUpdateAdapter {
    pub fn new(app: tauri::AppHandle) -> Self {
        Self { app }
    }

    /// 根据渠道构造远端 endpoint URL（各平台独立指针）。
    ///
    /// Tauri 会替换 `{{target}}` / `{{arch}}`，例如：
    /// `.../beta/platforms/darwin-aarch64/latest.json`
    pub(crate) fn endpoint_url(channel: UpdateChannel, release_base_url: &str) -> String {
        let base = release_base_url.trim_end_matches('/');
        format!(
            "{}/updates/{}/platforms/{{{{target}}}}-{{{{arch}}}}/latest.json",
            base,
            channel.path_segment()
        )
    }

    /// 本平台无可用清单时视为「无更新」，而不是检查失败。
    pub(crate) fn is_absent_platform_update_error(message: &str) -> bool {
        let lower = message.to_ascii_lowercase();
        lower.contains("none of the fallback platforms")
            || lower.contains("were not found in the response")
            || lower.contains("404 not found")
            || (lower.contains("status code") && lower.contains("404"))
    }

    /// 根据渠道构建 UpdaterBuilder（配置 endpoint 和版本比较器）。
    fn build_updater(
        &self,
        channel: UpdateChannel,
    ) -> Result<tauri_plugin_updater::Updater, ApplicationError> {
        let release_base_url = resolve_release_base_url();
        let url = Self::endpoint_url(channel, &release_base_url);
        let parsed_url: url::Url = url.parse().map_err(|e: url::ParseError| {
            ApplicationError::update(format!("endpoint URL 无效: {e}"))
        })?;

        // release 构建中禁止 HTTP，防止开发 Mock 配置被错误带入发布包；此处是配置隔离之外的第二层防线。
        #[cfg(not(debug_assertions))]
        if parsed_url.scheme() == "http" {
            return Err(ApplicationError::update(
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
            .map_err(|e| ApplicationError::update(format!("配置 updater endpoint 失败: {e}")))?;

        // Stable 渠道只接受更高的正式版本，过滤同版本、低版本和预发布版本。
        if channel == UpdateChannel::Stable {
            builder = builder.version_comparator(|current, remote| {
                remote.version > current && remote.version.pre.is_empty()
            });
        }

        builder
            .build()
            .map_err(|e| ApplicationError::update(format!("构建 updater 失败: {e}")))
    }
}

impl UpdatePort for TauriUpdateAdapter {
    type Handle = tauri_plugin_updater::Update;

    async fn check(
        &self,
        channel: UpdateChannel,
    ) -> Result<Option<CheckedUpdate<Self::Handle>>, ApplicationError> {
        let updater = self.build_updater(channel)?;

        let update = match updater.check().await {
            Ok(update) => update,
            Err(e) => {
                let message = e.to_string();
                if Self::is_absent_platform_update_error(&message) {
                    log::warn!(
                        target: "updater",
                        "本平台无可用更新清单，视为已最新: {message}"
                    );
                    return Ok(None);
                }
                return Err(ApplicationError::update(format!("检查更新失败: {message}")));
            }
        };

        Ok(update.map(|handle| CheckedUpdate {
            version: handle.version.to_string(),
            channel,
            handle,
        }))
    }

    async fn download_package(
        &self,
        checked: Arc<CheckedUpdate<Self::Handle>>,
        on_progress: impl Fn(u64, Option<u64>) + Send + Sync + 'static,
    ) -> Result<Vec<u8>, ApplicationError> {
        // 只 download，不 install。
        // Windows 上 install() 会启动 NSIS 并 process::exit，等同「自动安装」；
        // 必须等用户点「重启」再 install。
        let downloaded = Arc::new(AtomicU64::new(0));
        let downloaded_clone = downloaded.clone();
        let bytes = checked
            .handle
            .download(
                move |chunk_length, content_length| {
                    downloaded_clone.fetch_add(chunk_length as u64, Ordering::SeqCst);
                    let total = downloaded_clone.load(Ordering::SeqCst);
                    on_progress(total, content_length);
                },
                || {},
            )
            .await
            .map_err(|e| ApplicationError::update(format!("下载更新失败: {e}")))?;

        log::info!(
            target: "updater",
            "更新包已下载并暂存 v{}（{} bytes），等待用户确认安装",
            checked.version,
            bytes.len()
        );

        Ok(bytes)
    }

    async fn install_package(
        &self,
        checked: Arc<CheckedUpdate<Self::Handle>>,
        bytes: Vec<u8>,
    ) -> Result<(), ApplicationError> {
        log::info!(
            target: "updater",
            "开始安装更新 v{}（Windows 上将退出进程）",
            checked.version
        );

        // Windows：内部 ShellExecute 安装器后 process::exit(0)，不会返回。
        checked
            .handle
            .install(bytes)
            .map_err(|e| ApplicationError::update(format!("安装更新失败: {e}")))?;

        Ok(())
    }

    async fn restart(&self) -> Result<(), ApplicationError> {
        self.app.restart();
        // restart() 会终止当前进程，以下代码仅为类型兼容
        #[allow(unreachable_code)]
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use stoneflow_application::update::UpdatePort;
    use stoneflow_domain::UpdateChannel;

    use super::TauriUpdateAdapter;

    #[test]
    fn adapter_should_keep_the_native_update_as_opaque_handle() {
        fn assert_handle<P: UpdatePort<Handle = tauri_plugin_updater::Update>>() {}

        assert_handle::<TauriUpdateAdapter>();
    }

    #[test]
    fn endpoint_url_should_use_per_platform_latest_pointer() {
        assert_eq!(
            TauriUpdateAdapter::endpoint_url(
                UpdateChannel::Beta,
                "https://release.example/stoneflow"
            ),
            "https://release.example/stoneflow/updates/beta/platforms/{{target}}-{{arch}}/latest.json"
        );
        assert_eq!(
            TauriUpdateAdapter::endpoint_url(
                UpdateChannel::Stable,
                "https://release.example/stoneflow/"
            ),
            "https://release.example/stoneflow/updates/stable/platforms/{{target}}-{{arch}}/latest.json"
        );
    }

    #[test]
    fn absent_platform_update_errors_are_recognized() {
        assert!(TauriUpdateAdapter::is_absent_platform_update_error(
            r#"None of the fallback platforms `["darwin-aarch64-app", "darwin-aarch64"]` were found in the response `platforms` object"#
        ));
        assert!(TauriUpdateAdapter::is_absent_platform_update_error(
            "error sending request for url: status code 404"
        ));
        assert!(!TauriUpdateAdapter::is_absent_platform_update_error(
            "network timeout while contacting update server"
        ));
    }
}

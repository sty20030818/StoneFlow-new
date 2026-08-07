//! Release 静态资源根地址解析，供 updater 与 changelog 边界共用。

#[cfg(debug_assertions)]
use std::net::{SocketAddr, TcpStream};
#[cfg(debug_assertions)]
use std::time::Duration;

const PROD_RELEASE_BASE_URL: &str = "https://release.sty20030818.space/stoneflow";
const MOCK_RELEASE_BASE_URL: &str = "http://localhost:1420/stoneflow";
const ENV_UPDATES_BASE_URL: &str = "STONEFLOW_UPDATES_BASE_URL";
const ENV_USE_MOCK: &str = "STONEFLOW_USE_MOCK_UPDATES";

pub(crate) fn resolve_release_base_url() -> String {
    let custom_updates_base_url = std::env::var(ENV_UPDATES_BASE_URL).ok();
    let use_mock = std::env::var(ENV_USE_MOCK).ok();

    select_release_base_url(
        custom_updates_base_url.as_deref(),
        use_mock.as_deref(),
        || {
            #[cfg(debug_assertions)]
            {
                is_mock_server_reachable()
            }
            #[cfg(not(debug_assertions))]
            {
                false
            }
        },
    )
}

fn select_release_base_url(
    custom_updates_base_url: Option<&str>,
    use_mock: Option<&str>,
    mock_reachable: impl FnOnce() -> bool,
) -> String {
    if let Some(base_url) = custom_updates_base_url
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        return release_root_from_updates_base(base_url);
    }
    if matches!(use_mock, Some("1" | "true")) || mock_reachable() {
        return MOCK_RELEASE_BASE_URL.to_owned();
    }
    PROD_RELEASE_BASE_URL.to_owned()
}

fn release_root_from_updates_base(updates_base_url: &str) -> String {
    let base_url = updates_base_url.trim_end_matches('/');
    base_url
        .strip_suffix("/updates")
        .unwrap_or(base_url)
        .to_owned()
}

#[cfg(debug_assertions)]
fn is_mock_server_reachable() -> bool {
    TcpStream::connect_timeout(
        &SocketAddr::from(([127, 0, 0, 1], 1420)),
        Duration::from_millis(200),
    )
    .is_ok()
}

#[cfg(test)]
mod tests {
    use super::{select_release_base_url, MOCK_RELEASE_BASE_URL, PROD_RELEASE_BASE_URL};

    #[test]
    fn custom_updates_base_should_resolve_to_release_root() {
        assert_eq!(
            select_release_base_url(
                Some("https://release.example/stoneflow/updates/"),
                None,
                || false,
            ),
            "https://release.example/stoneflow"
        );
    }

    #[test]
    fn explicit_mock_flag_should_select_mock_release_root() {
        assert_eq!(
            select_release_base_url(None, Some("true"), || false),
            MOCK_RELEASE_BASE_URL
        );
    }

    #[test]
    fn reachable_debug_mock_should_select_mock_release_root() {
        assert_eq!(
            select_release_base_url(None, None, || true),
            MOCK_RELEASE_BASE_URL
        );
    }

    #[test]
    fn production_release_root_should_be_the_default() {
        assert_eq!(
            select_release_base_url(None, None, || false),
            PROD_RELEASE_BASE_URL
        );
    }
}

//! 远端 changelog 文本读取命令。

use std::time::Duration;

use crate::release_endpoint::resolve_release_base_url;

const CHANGELOG_REQUEST_TIMEOUT: Duration = Duration::from_secs(5);

#[tauri::command]
pub async fn get_changelog() -> Option<String> {
    fetch_changelog(&resolve_release_base_url(), CHANGELOG_REQUEST_TIMEOUT).await
}

fn changelog_url(release_base_url: &str) -> String {
    format!("{}/CHANGELOG.md", release_base_url.trim_end_matches('/'))
}

async fn fetch_changelog(release_base_url: &str, timeout: Duration) -> Option<String> {
    let url = changelog_url(release_base_url);
    let client = match reqwest::Client::builder().timeout(timeout).build() {
        Ok(client) => client,
        Err(error) => {
            log::warn!(target: "changelog", "构建 changelog HTTP client 失败: {error}");
            return None;
        }
    };
    let response = match client.get(&url).send().await {
        Ok(response) if response.status().is_success() => response,
        Ok(response) => {
            log::warn!(target: "changelog", "读取 changelog 失败: {url} HTTP {}", response.status());
            return None;
        }
        Err(error) => {
            log::warn!(target: "changelog", "读取 changelog 失败: {url}: {error}");
            return None;
        }
    };

    match response.text().await {
        Ok(content) if !content.trim().is_empty() => Some(content),
        Ok(_) => None,
        Err(error) => {
            log::warn!(target: "changelog", "读取 changelog 内容失败: {url}: {error}");
            None
        }
    }
}

#[cfg(test)]
mod tests {
    use std::time::Duration;

    use tokio::io::AsyncWriteExt;
    use tokio::net::TcpListener;

    use super::{changelog_url, fetch_changelog};

    async fn serve_once(status: &'static str, body: &'static str, delay: Duration) -> String {
        let listener = TcpListener::bind("127.0.0.1:0")
            .await
            .expect("test server should bind");
        let address = listener
            .local_addr()
            .expect("test server should have an address");

        let _server = tokio::spawn(async move {
            let (mut stream, _) = listener.accept().await.expect("test server should accept");
            tokio::time::sleep(delay).await;
            let response = format!(
                "HTTP/1.1 {status}\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
                body.len()
            );
            let _ = stream.write_all(response.as_bytes()).await;
        });

        format!("http://{address}")
    }

    #[test]
    fn changelog_url_should_belong_to_release_root() {
        assert_eq!(
            changelog_url("https://release.example/stoneflow/"),
            "https://release.example/stoneflow/CHANGELOG.md"
        );
    }

    #[tokio::test]
    async fn fetch_changelog_should_return_non_empty_success_body() {
        let base_url = serve_once("200 OK", "# Changelog", Duration::ZERO).await;

        let result = fetch_changelog(&base_url, Duration::from_secs(1)).await;

        assert_eq!(result.as_deref(), Some("# Changelog"));
    }

    #[tokio::test]
    async fn fetch_changelog_should_ignore_non_success_response() {
        let base_url = serve_once("404 Not Found", "missing", Duration::ZERO).await;

        let result = fetch_changelog(&base_url, Duration::from_secs(1)).await;

        assert_eq!(result, None);
    }

    #[tokio::test]
    async fn fetch_changelog_should_ignore_empty_success_body() {
        let base_url = serve_once("200 OK", " \n", Duration::ZERO).await;

        let result = fetch_changelog(&base_url, Duration::from_secs(1)).await;

        assert_eq!(result, None);
    }

    #[tokio::test]
    async fn fetch_changelog_should_respect_request_timeout() {
        let base_url = serve_once("200 OK", "too late", Duration::from_millis(200)).await;

        let result = fetch_changelog(&base_url, Duration::from_millis(20)).await;

        assert_eq!(result, None);
    }
}

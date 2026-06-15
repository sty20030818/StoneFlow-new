use tokio::io::{AsyncBufReadExt, BufReader};

pub fn forward_helper_output(
    stdout: Option<impl tokio::io::AsyncRead + Unpin + Send + 'static>,
    stderr: Option<impl tokio::io::AsyncRead + Unpin + Send + 'static>,
    pid: u32,
) {
    if let Some(stdout) = stdout {
        tokio::spawn(forward_lines(stdout, "STDOUT", pid));
    }

    if let Some(stderr) = stderr {
        tokio::spawn(forward_lines(stderr, "STDERR", pid));
    }
}

async fn forward_lines<R>(reader: R, stream_name: &'static str, pid: u32)
where
    R: tokio::io::AsyncRead + Unpin + Send + 'static,
{
    let mut lines = BufReader::new(reader).lines();
    loop {
        match lines.next_line().await {
            Ok(Some(line)) => forward_helper_log_line(pid, stream_name, &line),
            Ok(None) => break,
            Err(error) => {
                log::warn!("helper[{pid}][{stream_name}] 读取失败: {error}");
                break;
            }
        }
    }
}

fn forward_helper_log_line(pid: u32, stream_name: &'static str, line: &str) {
    let Some(parsed) = parse_helper_log_line(line) else {
        log::info!("helper[{pid}][{stream_name}] {line}");
        return;
    };

    match parsed.level {
        "ERROR" => log::error!("helper[{pid}] {}", parsed.message),
        "WARN" => log::warn!("helper[{pid}] {}", parsed.message),
        "DEBUG" | "TRACE" => log::debug!("helper[{pid}] {}", parsed.message),
        _ => log::info!("helper[{pid}] {}", parsed.message),
    }
}

struct HelperLogLine<'a> {
    level: &'a str,
    message: &'a str,
}

fn parse_helper_log_line(line: &str) -> Option<HelperLogLine<'_>> {
    let mut rest = line;
    let mut parts = Vec::with_capacity(4);

    for _ in 0..4 {
        let part_end = rest.strip_prefix('[')?.find(']')?;
        parts.push(&rest[1..=part_end]);
        rest = &rest[part_end + 2..];
    }

    Some(HelperLogLine {
        level: parts[3],
        message: rest.trim_start(),
    })
}


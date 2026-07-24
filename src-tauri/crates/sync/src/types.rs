/// 云端副本（用户自备 Postgres）连接配置。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SyncCloudConfig {
    /// 标准 Postgres 连接串（Neon / 自建同一形态）。
    pub database_url: String,
}

/// 上传 operation 的结果。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct PushResult {
    pub committed_seq: i64,
    pub was_already_applied: bool,
}

/// 门面白话名。
pub type UploadResult = PushResult;

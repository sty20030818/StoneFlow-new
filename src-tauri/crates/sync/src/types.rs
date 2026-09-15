/// 云端副本（用户自备 Postgres）连接配置。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SyncCloudConfig {
    /// 标准 Postgres 连接串（Neon / 自建同一形态）。
    pub database_url: String,
    /// 已绑定的远端实例；有值时每条短连接都必须重新核验，防止连接期间远端被替换。
    pub expected_instance_id: Option<String>,
}

/// 上传 operation 的结果。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct UploadResult {
    pub committed_seq: i64,
    pub was_already_applied: bool,
}

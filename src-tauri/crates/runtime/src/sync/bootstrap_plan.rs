//! 同步引导决策：纯函数，无 IO。
//!
//! 场景矩阵见任务文档 BOOTSTRAP.md。

/// 本机是否已有需保护的业务数据（不含「仅默认 Space」）。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LocalContent {
    Empty,
    HasData,
}

/// 云端副本是否已有同步数据。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RemoteContent {
    Empty,
    HasData,
}

/// 本机是否已有同步位置。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LocalCursor {
    Missing,
    Present,
}

/// 一次同步应执行的引导计划。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BootstrapPlan {
    /// 日常：上传 + 增量下载。
    Incremental,
    /// 双方皆空：只落 cursor=0。
    EmptyPair,
    /// 本机是源：seed → 上传 → adopt cursor（不 wipe）。
    LocalIsOrigin,
    /// 云端是源：全量 baseline 物化本机。
    RemoteIsOrigin,
    /// 两边都有数据且无 cursor：v1 默认本机优先（与 LocalIsOrigin 同执行，带警告）。
    BothPreferLocal,
}

/// 根据三维状态分类。无 IO，可单测。
pub fn classify(local: LocalContent, remote: RemoteContent, cursor: LocalCursor) -> BootstrapPlan {
    if matches!(cursor, LocalCursor::Present) {
        return BootstrapPlan::Incremental;
    }
    match (local, remote) {
        (LocalContent::Empty, RemoteContent::Empty) => BootstrapPlan::EmptyPair,
        (LocalContent::HasData, RemoteContent::Empty) => BootstrapPlan::LocalIsOrigin,
        (LocalContent::Empty, RemoteContent::HasData) => BootstrapPlan::RemoteIsOrigin,
        (LocalContent::HasData, RemoteContent::HasData) => BootstrapPlan::BothPreferLocal,
    }
}

impl BootstrapPlan {
    pub fn label(self) -> &'static str {
        match self {
            Self::Incremental => "日常增量",
            Self::EmptyPair => "双方皆空",
            Self::LocalIsOrigin => "本机是源",
            Self::RemoteIsOrigin => "云端是源",
            Self::BothPreferLocal => "两边都有-本机优先",
        }
    }

    /// 是否需要 origin seed。
    pub fn needs_origin_seed(self) -> bool {
        matches!(self, Self::LocalIsOrigin | Self::BothPreferLocal)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn matrix_matches_bootstrap_doc() {
        assert_eq!(
            classify(
                LocalContent::Empty,
                RemoteContent::Empty,
                LocalCursor::Missing
            ),
            BootstrapPlan::EmptyPair
        );
        assert_eq!(
            classify(
                LocalContent::HasData,
                RemoteContent::Empty,
                LocalCursor::Missing
            ),
            BootstrapPlan::LocalIsOrigin
        );
        assert_eq!(
            classify(
                LocalContent::Empty,
                RemoteContent::HasData,
                LocalCursor::Missing
            ),
            BootstrapPlan::RemoteIsOrigin
        );
        assert_eq!(
            classify(
                LocalContent::HasData,
                RemoteContent::HasData,
                LocalCursor::Missing
            ),
            BootstrapPlan::BothPreferLocal
        );
        assert_eq!(
            classify(
                LocalContent::HasData,
                RemoteContent::HasData,
                LocalCursor::Present
            ),
            BootstrapPlan::Incremental
        );
    }
}

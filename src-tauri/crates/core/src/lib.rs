//! StoneFlow 纯领域常量与默认系统配置。

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

/// 任务资源类型。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ResourceType {
    /// 文档链接。
    DocLink,
    /// 本地文件。
    LocalFile,
    /// 本地文件夹。
    LocalFolder,
}

impl ResourceType {
    /// 返回稳定字符串标识。
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::DocLink => "doc_link",
            Self::LocalFile => "local_file",
            Self::LocalFolder => "local_folder",
        }
    }
}

/// Focus 视图类型。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum FocusViewType {
    /// 系统内置视图。
    System,
    /// 用户自定义视图。
    UserDefined,
}

impl FocusViewType {
    /// 返回稳定字符串标识。
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::System => "system",
            Self::UserDefined => "user_defined",
        }
    }
}

/// 系统默认 Focus 视图 key。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum FocusViewKey {
    /// 手动 pin 的焦点任务。
    Focus,
    /// 按截止时间聚合的即将到期任务。
    Upcoming,
    /// 按创建时间回看的最近任务。
    Recent,
    /// 高优先级任务。
    HighPriority,
}

impl FocusViewKey {
    /// 返回稳定字符串标识。
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Focus => "focus",
            Self::Upcoming => "upcoming",
            Self::Recent => "recent",
            Self::HighPriority => "high_priority",
        }
    }

    /// 返回默认显示名称。
    pub const fn display_name(self) -> &'static str {
        match self {
            Self::Focus => "Focus",
            Self::Upcoming => "Upcoming",
            Self::Recent => "最近添加",
            Self::HighPriority => "高优先级",
        }
    }
}

/// 默认 Space seed 定义。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct DefaultSpaceSeed {
    /// 展示名称。
    pub name: &'static str,
    /// 稳定 slug。
    pub slug: &'static str,
    /// 默认排序。
    pub sort_order: i32,
}

/// 系统默认 FocusView 定义。
#[derive(Debug, Clone, PartialEq)]
pub struct SystemFocusViewDefinition {
    /// 稳定视图 key。
    pub key: FocusViewKey,
    /// 展示名称。
    pub name: &'static str,
    /// 排序权重。
    pub sort_order: i32,
    /// 最小筛选配置。
    pub filter_config: Value,
    /// 最小排序配置。
    pub sort_config: Value,
    /// 最小分组配置。
    pub group_config: Value,
}

/// 返回默认 Space 定义。
pub const fn default_space_seed() -> DefaultSpaceSeed {
    DefaultSpaceSeed {
        name: "工作",
        slug: "default",
        sort_order: 0,
    }
}

/// 返回 4 个系统默认 FocusView 定义。
pub fn system_focus_view_definitions() -> Vec<SystemFocusViewDefinition> {
    vec![
        SystemFocusViewDefinition {
            key: FocusViewKey::Focus,
            name: FocusViewKey::Focus.display_name(),
            sort_order: 0,
            filter_config: json!({
              "status": "todo",
              "pinned": true,
              "deleted": false,
            }),
            sort_config: json!({
              "field": "updated_at",
              "direction": "desc",
            }),
            group_config: json!({}),
        },
        SystemFocusViewDefinition {
            key: FocusViewKey::Upcoming,
            name: FocusViewKey::Upcoming.display_name(),
            sort_order: 1,
            filter_config: json!({
              "status": "todo",
              "has_due_at": true,
              "deleted": false,
            }),
            sort_config: json!({
              "field": "due_at",
              "direction": "asc",
            }),
            group_config: json!({}),
        },
        SystemFocusViewDefinition {
            key: FocusViewKey::Recent,
            name: FocusViewKey::Recent.display_name(),
            sort_order: 2,
            filter_config: json!({
              "status": "todo",
              "deleted": false,
            }),
            sort_config: json!({
              "field": "created_at",
              "direction": "desc",
            }),
            group_config: json!({}),
        },
        SystemFocusViewDefinition {
            key: FocusViewKey::HighPriority,
            name: FocusViewKey::HighPriority.display_name(),
            sort_order: 3,
            filter_config: json!({
              "status": "todo",
              "priority": ["high", "urgent"],
              "deleted": false,
            }),
            sort_config: json!({
              "field": "updated_at",
              "direction": "desc",
            }),
            group_config: json!({}),
        },
    ]
}

/// 返回当前领域层阶段说明，供工程自检使用。
pub fn stage_label() -> &'static str {
    "m2-a-core-entity-bootstrap"
}

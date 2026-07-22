//! 静态默认数据定义。

use crate::entities::common::ViewEntityKind;
use serde_json::{json, Value};

pub struct DefaultSpaceSeed {
    pub name: &'static str,
    pub icon_key: &'static str,
    pub color_key: &'static str,
    pub is_default: bool,
    pub sort_order: i32,
}

pub struct DefaultViewSeed {
    pub key: &'static str,
    pub name: &'static str,
    pub entity_type: ViewEntityKind,
    pub filters: Value,
    pub sort: Value,
    pub group_by: Option<&'static str>,
    pub is_visible: bool,
    pub sort_order: i32,
}

pub struct DefaultSettingSeed {
    pub key: &'static str,
    pub value: Value,
}

pub fn default_space() -> DefaultSpaceSeed {
    DefaultSpaceSeed {
        name: "个人",
        icon_key: "user",
        color_key: "blue",
        is_default: true,
        sort_order: 1000,
    }
}

pub fn default_views() -> Vec<DefaultViewSeed> {
    vec![
        DefaultViewSeed {
            key: "today",
            name: "今天",
            entity_type: ViewEntityKind::Task,
            filters: json!({
                "status": ["todo", "doing", "waiting"],
                "archived": false,
                "deleted": false,
                "due": { "mode": "today" }
            }),
            sort: json!([{ "field": "dueAt", "direction": "asc" }]),
            group_by: None,
            is_visible: true,
            sort_order: 100,
        },
        DefaultViewSeed {
            key: "focus",
            name: "聚焦",
            entity_type: ViewEntityKind::Task,
            filters: json!({
                "status": ["todo", "doing", "waiting"],
                "priority": { "gte": 3 },
                "archived": false,
                "deleted": false
            }),
            sort: json!([{ "field": "priority", "direction": "desc" }]),
            group_by: None,
            is_visible: true,
            sort_order: 200,
        },
        DefaultViewSeed {
            key: "upcoming",
            name: "即将到来",
            entity_type: ViewEntityKind::Task,
            filters: json!({
                "status": ["todo", "doing", "waiting"],
                "archived": false,
                "deleted": false,
                "due": { "mode": "future" }
            }),
            sort: json!([{ "field": "dueAt", "direction": "asc" }]),
            group_by: None,
            is_visible: true,
            sort_order: 300,
        },
        DefaultViewSeed {
            key: "recently_added",
            name: "最近添加",
            entity_type: ViewEntityKind::Task,
            filters: json!({
                "archived": false,
                "deleted": false
            }),
            sort: json!([{ "field": "createdAt", "direction": "desc" }]),
            group_by: None,
            is_visible: true,
            sort_order: 400,
        },
        DefaultViewSeed {
            key: "waiting",
            name: "等待中",
            entity_type: ViewEntityKind::Task,
            filters: json!({
                "status": ["waiting"],
                "archived": false,
                "deleted": false
            }),
            sort: json!([{ "field": "updatedAt", "direction": "desc" }]),
            group_by: None,
            is_visible: true,
            sort_order: 500,
        },
        DefaultViewSeed {
            key: "overdue",
            name: "已逾期",
            entity_type: ViewEntityKind::Task,
            filters: json!({
                "status": ["todo", "doing", "waiting"],
                "archived": false,
                "deleted": false,
                "due": { "mode": "overdue" }
            }),
            sort: json!([{ "field": "dueAt", "direction": "asc" }]),
            group_by: None,
            is_visible: true,
            sort_order: 600,
        },
        DefaultViewSeed {
            key: "active_projects",
            name: "进行中",
            entity_type: ViewEntityKind::Project,
            filters: json!({
                "completed": false,
                "archived": false,
                "deleted": false
            }),
            sort: json!([{ "field": "updatedAt", "direction": "desc" }]),
            group_by: None,
            is_visible: true,
            sort_order: 700,
        },
        DefaultViewSeed {
            key: "completed_projects",
            name: "已完成",
            entity_type: ViewEntityKind::Project,
            filters: json!({
                "completed": true,
                "archived": false,
                "deleted": false
            }),
            sort: json!([{ "field": "completedAt", "direction": "desc" }]),
            group_by: None,
            is_visible: true,
            sort_order: 800,
        },
        DefaultViewSeed {
            key: "archived_projects",
            name: "已归档",
            entity_type: ViewEntityKind::Project,
            filters: json!({
                "archived": true,
                "deleted": false
            }),
            sort: json!([{ "field": "archivedAt", "direction": "desc" }]),
            group_by: None,
            is_visible: true,
            sort_order: 900,
        },
        DefaultViewSeed {
            key: "all_projects",
            name: "全部",
            entity_type: ViewEntityKind::Project,
            filters: json!({
                "deleted": false
            }),
            sort: json!([{ "field": "sortOrder", "direction": "asc" }]),
            group_by: None,
            is_visible: true,
            sort_order: 1000,
        },
    ]
}

pub fn default_settings() -> Vec<DefaultSettingSeed> {
    vec![
        DefaultSettingSeed {
            key: "app.sidebar.preferences",
            value: json!({
                "mainItems": {
                    "inbox": { "visible": true, "order": 100 },
                    "allTasks": { "visible": true, "order": 200 },
                    "views": { "visible": true, "order": 300 },
                    "projectOverview": { "visible": true, "order": 400 }
                },
                "projectSection": {
                    "visible": true,
                    "order": 500,
                    "showCounts": true,
                    "showCompleted": true
                },
                "footerItems": {
                    "archive": { "visible": true, "order": 900 },
                    "trash": { "visible": true, "order": 1000 }
                }
            }),
        },
        DefaultSettingSeed {
            key: "app.launcher",
            value: json!({
                "defaultSpaceStrategy": "current_or_default",
                "whenScopeAll": "default_space",
                "defaultInboxBehavior": "inbox_when_no_project",
                "allowNoProjectShortcut": true,
                "defaultOpenAfterCreate": false
            }),
        },
        DefaultSettingSeed {
            key: "app.taskDefaults",
            value: json!({
                "status": "todo",
                "priority": 0,
                "projectId": null,
                "dueAt": null,
                "scheduledAt": null,
                "reminderAt": null
            }),
        },
        DefaultSettingSeed {
            key: "app.ui.preferences",
            value: json!({
                "theme": "system",
                "density": "comfortable"
            }),
        },
        DefaultSettingSeed {
            key: "app.sync.config",
            value: json!({
                "url": null,
                "token": null
            }),
        },
    ]
}

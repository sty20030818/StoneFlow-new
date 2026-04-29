//! Activity 应用模块：集中承载阶段 2 的输入、输出、Diff 与编排能力。

mod action;
mod diff;
mod models;
mod service;

pub use action::ActivityAction;
pub use diff::create_changes;
pub use models::{
    ActivityChangeInput, ActivityTimelineChange, ActivityTimelineEntry, GetEntityActivitiesInput,
    RecordActivityInput,
};
pub use service::ActivityService;

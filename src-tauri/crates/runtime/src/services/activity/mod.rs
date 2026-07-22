//! Activity 应用模块：集中承载阶段 2 的输入、输出、Diff 与编排能力。

mod adapter;
mod service;

pub use adapter::ActivityPersistenceAdapter;
pub use service::{
    create_changes, ActivityAction, ActivityChangeInput, ActivityService, ActivityTimelineChange,
};
pub use stoneflow_application::activity::{
    ActivityTimelineEntry, GetEntityActivitiesInput, RecordActivityInput,
};

//! Lifecycle 归档与回收站列表编排。
//!
//! 写路径由各实体 application service 承担，本模块只读取统一列表。

#![allow(async_fn_in_trait)]

use crate::{
    lifecycle::{
        executor::{build_archive_entries, build_trash_entries, normalize_scope},
        types::{
            LifecycleEntry, LifecycleProjectListRecord, LifecycleTaskListRecord,
            ListLifecycleEntriesInput,
        },
    },
    space::SpaceRecord,
    ApplicationError,
};

/// Archive / Trash 列表所需的 Space 读边界。
pub trait LifecycleSpaceReader: Send + Sync {
    async fn list_archived(
        &self,
        scope_space_id: Option<&str>,
    ) -> Result<Vec<SpaceRecord>, ApplicationError>;
    async fn list_trashed(
        &self,
        scope_space_id: Option<&str>,
    ) -> Result<Vec<SpaceRecord>, ApplicationError>;
}

/// Archive / Trash 列表所需的 Project 读边界。
pub trait LifecycleProjectReader: Send + Sync {
    async fn list_archived(
        &self,
        scope_space_id: Option<&str>,
    ) -> Result<Vec<LifecycleProjectListRecord>, ApplicationError>;
    async fn list_trashed(
        &self,
        scope_space_id: Option<&str>,
    ) -> Result<Vec<LifecycleProjectListRecord>, ApplicationError>;
}

/// Archive / Trash 列表所需的 Task 读边界。
pub trait LifecycleTaskReader: Send + Sync {
    async fn list_archived(
        &self,
        scope_space_id: Option<&str>,
    ) -> Result<Vec<LifecycleTaskListRecord>, ApplicationError>;
    async fn list_trashed(
        &self,
        scope_space_id: Option<&str>,
    ) -> Result<Vec<LifecycleTaskListRecord>, ApplicationError>;
}

/// Lifecycle 用例编排。
#[derive(Debug, Clone)]
pub struct LifecycleService<SP, PP, TP>
where
    SP: LifecycleSpaceReader,
    PP: LifecycleProjectReader,
    TP: LifecycleTaskReader,
{
    spaces: SP,
    projects: PP,
    tasks: TP,
}

impl<SP, PP, TP> LifecycleService<SP, PP, TP>
where
    SP: LifecycleSpaceReader,
    PP: LifecycleProjectReader,
    TP: LifecycleTaskReader,
{
    pub fn new(spaces: SP, projects: PP, tasks: TP) -> Self {
        Self {
            spaces,
            projects,
            tasks,
        }
    }

    pub async fn list_archive_entries(
        &self,
        input: ListLifecycleEntriesInput,
    ) -> Result<Vec<LifecycleEntry>, ApplicationError> {
        let scope = normalize_scope(&input.scope)?;
        let spaces = self.spaces.list_archived(scope.as_deref()).await?;
        let projects = self.projects.list_archived(scope.as_deref()).await?;
        let tasks = self.tasks.list_archived(scope.as_deref()).await?;
        let mut entries = build_archive_entries(spaces, projects, tasks);
        if let Some(filter) = input.entity_filter {
            entries.retain(|entry| entry.entity_type == filter);
        }
        Ok(entries)
    }

    pub async fn list_trash_entries(
        &self,
        input: ListLifecycleEntriesInput,
    ) -> Result<Vec<LifecycleEntry>, ApplicationError> {
        let scope = normalize_scope(&input.scope)?;
        let spaces = self.spaces.list_trashed(scope.as_deref()).await?;
        let projects = self.projects.list_trashed(scope.as_deref()).await?;
        let tasks = self.tasks.list_trashed(scope.as_deref()).await?;
        let mut entries = build_trash_entries(spaces, projects, tasks);
        if let Some(filter) = input.entity_filter {
            entries.retain(|entry| entry.entity_type == filter);
        }
        Ok(entries)
    }
}

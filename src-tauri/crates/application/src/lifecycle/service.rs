//! Lifecycle 用例编排。
//!
//! 两阶段删除：Delete=软删进回收站（仍同步）；PermanentlyDelete=物理删+tombstone。
//! 完整仓储接线留给 R3–R5；当前写路径仍 stub，但契约与列表语义已对齐产品。

#![allow(async_fn_in_trait)]
#![allow(dead_code)]

use stoneflow_domain::{validate_project_id, validate_space_id, validate_task_id};

use crate::{
    activity::{ActivityPersistence, ActivityService},
    lifecycle::{
        executor::{build_archive_entries, build_trash_entries, normalize_scope},
        types::{
            LifecycleEntry, LifecycleProjectListRecord, LifecycleTaskListRecord,
            ListLifecycleEntriesInput,
        },
    },
    project::ProjectRecord,
    space::SpaceRecord,
    task::TaskRecord,
    ApplicationError,
};

fn pending(op: &str) -> ApplicationError {
    ApplicationError::internal(format!(
        "lifecycle「{op}」仓储/outbox 写路径尚未接线（契约已恢复两阶段删除）"
    ))
}

/// 同步钩子：软删走 upsert；永久删走 tombstone。
pub trait LifecycleSyncHook: Send + Sync {
    type Connection: Send + Sync;

    async fn enqueue_space_upsert(
        &self,
        _connection: &Self::Connection,
        _space: &SpaceRecord,
    ) -> Result<(), ApplicationError> {
        Ok(())
    }

    async fn enqueue_space_tombstone(
        &self,
        _connection: &Self::Connection,
        _space: &SpaceRecord,
    ) -> Result<(), ApplicationError> {
        Ok(())
    }

    async fn enqueue_project_upsert(
        &self,
        _connection: &Self::Connection,
        _project: &ProjectRecord,
    ) -> Result<(), ApplicationError> {
        Ok(())
    }

    async fn enqueue_project_tombstone(
        &self,
        _connection: &Self::Connection,
        _project: &ProjectRecord,
    ) -> Result<(), ApplicationError> {
        Ok(())
    }

    async fn enqueue_task_upsert(
        &self,
        _connection: &Self::Connection,
        _task: &TaskRecord,
    ) -> Result<(), ApplicationError> {
        Ok(())
    }

    async fn enqueue_task_tombstone(
        &self,
        _connection: &Self::Connection,
        _task: &TaskRecord,
    ) -> Result<(), ApplicationError> {
        Ok(())
    }
}

/// Space 生命周期持久化边界。
pub trait LifecycleSpacePersistence: Send + Sync {
    type Connection: Send + Sync;

    async fn begin(&self) -> Result<Self::Connection, ApplicationError>;
    async fn commit(&self, connection: Self::Connection) -> Result<(), ApplicationError>;
    async fn get(&self, space_id: &str) -> Result<Option<SpaceRecord>, ApplicationError>;
    async fn get_default(&self) -> Result<Option<SpaceRecord>, ApplicationError>;
    async fn list_by_ids(&self, space_ids: &[String])
        -> Result<Vec<SpaceRecord>, ApplicationError>;
    async fn list_archived(
        &self,
        scope_space_id: Option<&str>,
    ) -> Result<Vec<SpaceRecord>, ApplicationError>;
    async fn list_trashed(
        &self,
        scope_space_id: Option<&str>,
    ) -> Result<Vec<SpaceRecord>, ApplicationError>;
    async fn archive_raw(
        &self,
        connection: &Self::Connection,
        space_id: &str,
        archived_at: &str,
        updated_at: &str,
    ) -> Result<Option<SpaceRecord>, ApplicationError>;
    async fn soft_delete_raw(
        &self,
        connection: &Self::Connection,
        space_id: &str,
        deleted_at: &str,
        updated_at: &str,
    ) -> Result<Option<SpaceRecord>, ApplicationError>;
    async fn restore_raw(
        &self,
        connection: &Self::Connection,
        space_id: &str,
        updated_at: &str,
    ) -> Result<Option<SpaceRecord>, ApplicationError>;
    async fn hard_delete(
        &self,
        connection: &Self::Connection,
        space_id: &str,
    ) -> Result<(), ApplicationError>;
}

/// Project 生命周期持久化边界。
pub trait LifecycleProjectPersistence: Send + Sync {
    type Connection: Send + Sync;

    async fn begin(&self) -> Result<Self::Connection, ApplicationError>;
    async fn commit(&self, connection: Self::Connection) -> Result<(), ApplicationError>;
    async fn get(&self, project_id: &str) -> Result<Option<ProjectRecord>, ApplicationError>;
    async fn list_by_space(&self, space_id: &str) -> Result<Vec<ProjectRecord>, ApplicationError>;
    async fn list_archived(
        &self,
        scope_space_id: Option<&str>,
    ) -> Result<Vec<LifecycleProjectListRecord>, ApplicationError>;
    async fn list_trashed(
        &self,
        scope_space_id: Option<&str>,
    ) -> Result<Vec<LifecycleProjectListRecord>, ApplicationError>;
    async fn archive_raw(
        &self,
        connection: &Self::Connection,
        project_id: &str,
        archived_at: &str,
        updated_at: &str,
    ) -> Result<Option<ProjectRecord>, ApplicationError>;
    async fn soft_delete_raw(
        &self,
        connection: &Self::Connection,
        project_id: &str,
        deleted_at: &str,
        updated_at: &str,
    ) -> Result<Option<ProjectRecord>, ApplicationError>;
    async fn restore_raw(
        &self,
        connection: &Self::Connection,
        project_id: &str,
        updated_at: &str,
    ) -> Result<Option<ProjectRecord>, ApplicationError>;
    async fn hard_delete(
        &self,
        connection: &Self::Connection,
        project_id: &str,
    ) -> Result<(), ApplicationError>;
}

/// Task 生命周期持久化边界（归档 + 软删；永久删除=硬删+tombstone）。
pub trait LifecycleTaskPersistence: Send + Sync {
    type Connection: Send + Sync;

    async fn begin(&self) -> Result<Self::Connection, ApplicationError>;
    async fn commit(&self, connection: Self::Connection) -> Result<(), ApplicationError>;
    async fn get(&self, task_id: &str) -> Result<Option<TaskRecord>, ApplicationError>;
    async fn list_by_space(&self, space_id: &str) -> Result<Vec<TaskRecord>, ApplicationError>;
    async fn list_by_project(&self, project_id: &str) -> Result<Vec<TaskRecord>, ApplicationError>;
    async fn list_archived(
        &self,
        scope_space_id: Option<&str>,
    ) -> Result<Vec<LifecycleTaskListRecord>, ApplicationError>;
    async fn list_trashed(
        &self,
        scope_space_id: Option<&str>,
    ) -> Result<Vec<LifecycleTaskListRecord>, ApplicationError>;
    async fn archive_raw(
        &self,
        connection: &Self::Connection,
        task_id: &str,
        archived_at: &str,
        updated_at: &str,
    ) -> Result<Option<TaskRecord>, ApplicationError>;
    async fn soft_delete_raw(
        &self,
        connection: &Self::Connection,
        task_id: &str,
        deleted_at: &str,
        updated_at: &str,
    ) -> Result<Option<TaskRecord>, ApplicationError>;
    async fn restore_raw(
        &self,
        connection: &Self::Connection,
        task_id: &str,
        updated_at: &str,
    ) -> Result<Option<TaskRecord>, ApplicationError>;
    async fn hard_delete(
        &self,
        connection: &Self::Connection,
        task_id: &str,
    ) -> Result<(), ApplicationError>;
}

/// Lifecycle 用例编排。
#[derive(Debug, Clone)]
pub struct LifecycleService<SP, PP, TP, AP, SH>
where
    SP: LifecycleSpacePersistence,
    PP: LifecycleProjectPersistence<Connection = SP::Connection>,
    TP: LifecycleTaskPersistence<Connection = SP::Connection>,
    AP: ActivityPersistence<Connection = SP::Connection>,
    SH: LifecycleSyncHook<Connection = SP::Connection>,
{
    spaces: SP,
    projects: PP,
    tasks: TP,
    #[allow(dead_code)]
    activity: ActivityService<AP>,
    #[allow(dead_code)]
    sync_hook: SH,
}

impl<SP, PP, TP, AP, SH> LifecycleService<SP, PP, TP, AP, SH>
where
    SP: LifecycleSpacePersistence,
    PP: LifecycleProjectPersistence<Connection = SP::Connection>,
    TP: LifecycleTaskPersistence<Connection = SP::Connection>,
    AP: ActivityPersistence<Connection = SP::Connection>,
    SH: LifecycleSyncHook<Connection = SP::Connection>,
{
    pub fn new(
        spaces: SP,
        projects: PP,
        tasks: TP,
        activity: ActivityService<AP>,
        sync_hook: SH,
    ) -> Self {
        Self {
            spaces,
            projects,
            tasks,
            activity,
            sync_hook,
        }
    }

    pub async fn archive_space(&self, space_id: &str) -> Result<SpaceRecord, ApplicationError> {
        let _ = validate_space_id(space_id)?;
        Err(pending("archive_space"))
    }

    pub async fn restore_space(&self, space_id: &str) -> Result<SpaceRecord, ApplicationError> {
        let _ = validate_space_id(space_id)?;
        Err(pending("restore_space"))
    }

    /// 软删进回收站（仍同步）。
    pub async fn delete_space(&self, space_id: &str) -> Result<SpaceRecord, ApplicationError> {
        let _ = validate_space_id(space_id)?;
        Err(pending("delete_space"))
    }

    /// 回收站永久删除（物理删 + tombstone）。
    pub async fn permanently_delete_space(&self, space_id: &str) -> Result<(), ApplicationError> {
        let _ = validate_space_id(space_id)?;
        Err(pending("permanently_delete_space"))
    }

    pub async fn archive_project(
        &self,
        project_id: &str,
    ) -> Result<ProjectRecord, ApplicationError> {
        let _ = validate_project_id(project_id)?;
        Err(pending("archive_project"))
    }

    pub async fn restore_project(
        &self,
        project_id: &str,
    ) -> Result<ProjectRecord, ApplicationError> {
        let _ = validate_project_id(project_id)?;
        Err(pending("restore_project"))
    }

    pub async fn delete_project(
        &self,
        project_id: &str,
    ) -> Result<ProjectRecord, ApplicationError> {
        let _ = validate_project_id(project_id)?;
        Err(pending("delete_project"))
    }

    pub async fn permanently_delete_project(
        &self,
        project_id: &str,
    ) -> Result<(), ApplicationError> {
        let _ = validate_project_id(project_id)?;
        Err(pending("permanently_delete_project"))
    }

    pub async fn archive_task(&self, task_id: &str) -> Result<TaskRecord, ApplicationError> {
        let _ = validate_task_id(task_id)?;
        Err(pending("archive_task"))
    }

    pub async fn restore_task(&self, task_id: &str) -> Result<TaskRecord, ApplicationError> {
        let _ = validate_task_id(task_id)?;
        Err(pending("restore_task"))
    }

    /// 软删进回收站（仍同步）。
    pub async fn delete_task(&self, task_id: &str) -> Result<TaskRecord, ApplicationError> {
        let _ = validate_task_id(task_id)?;
        Err(pending("delete_task"))
    }

    pub async fn permanently_delete_task(&self, task_id: &str) -> Result<(), ApplicationError> {
        let _ = validate_task_id(task_id)?;
        Err(pending("permanently_delete_task"))
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

//! Lifecycle Archive / Trash 列表读边界与 application service 工厂。

use sea_orm::{ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, QueryOrder};
use stoneflow_application::{
    lifecycle::{
        LifecycleProjectListRecord, LifecycleProjectReader, LifecycleService, LifecycleSpaceReader,
        LifecycleTaskListRecord, LifecycleTaskReader,
    },
    space::SpaceRecord,
    ApplicationError,
};

use crate::adapters::error::from_display;
use crate::entities::prelude::{Project, Space, Task};
use crate::entities::{project, space, task};

/// 已装配的 Lifecycle 列表 application service。
pub type LifecycleAppService =
    LifecycleService<LifecyclePortsAdapter, LifecyclePortsAdapter, LifecyclePortsAdapter>;

/// 从数据库连接构造 Lifecycle 列表用例。
pub fn build_lifecycle_service(connection: DatabaseConnection) -> LifecycleAppService {
    let adapter = LifecyclePortsAdapter::new(connection);
    LifecycleService::new(adapter.clone(), adapter.clone(), adapter)
}

/// Lifecycle Archive / Trash 列表读 adapter。
#[derive(Debug, Clone)]
pub struct LifecyclePortsAdapter {
    db: DatabaseConnection,
}

impl LifecyclePortsAdapter {
    pub fn new(connection: DatabaseConnection) -> Self {
        Self { db: connection }
    }
}

impl LifecycleSpaceReader for LifecyclePortsAdapter {
    async fn list_archived(
        &self,
        scope_space_id: Option<&str>,
    ) -> Result<Vec<SpaceRecord>, ApplicationError> {
        let mut query = Space::find()
            .filter(space::Column::ArchivedAt.is_not_null())
            .filter(space::Column::DeletedAt.is_null())
            .order_by_desc(space::Column::ArchivedAt);
        if let Some(space_id) = scope_space_id {
            query = query.filter(space::Column::Id.eq(space_id));
        }
        query
            .all(&self.db)
            .await
            .map(|rows| rows.into_iter().map(map_space).collect())
            .map_err(from_display)
    }

    async fn list_trashed(
        &self,
        scope_space_id: Option<&str>,
    ) -> Result<Vec<SpaceRecord>, ApplicationError> {
        let mut query = Space::find()
            .filter(space::Column::DeletedAt.is_not_null())
            .order_by_desc(space::Column::DeletedAt);
        if let Some(space_id) = scope_space_id {
            query = query.filter(space::Column::Id.eq(space_id));
        }
        query
            .all(&self.db)
            .await
            .map(|rows| rows.into_iter().map(map_space).collect())
            .map_err(from_display)
    }
}

impl LifecycleProjectReader for LifecyclePortsAdapter {
    async fn list_archived(
        &self,
        scope_space_id: Option<&str>,
    ) -> Result<Vec<LifecycleProjectListRecord>, ApplicationError> {
        let mut query = Project::find()
            .filter(project::Column::ArchivedAt.is_not_null())
            .filter(project::Column::DeletedAt.is_null())
            .order_by_desc(project::Column::ArchivedAt);
        if let Some(space_id) = scope_space_id {
            query = query.filter(project::Column::SpaceId.eq(space_id));
        }
        query
            .all(&self.db)
            .await
            .map(|rows| {
                rows.into_iter()
                    .map(|row| LifecycleProjectListRecord {
                        id: row.id,
                        space_id: row.space_id,
                        name: row.name,
                        archived_at: row.archived_at,
                        deleted_at: row.deleted_at,
                    })
                    .collect()
            })
            .map_err(from_display)
    }

    async fn list_trashed(
        &self,
        scope_space_id: Option<&str>,
    ) -> Result<Vec<LifecycleProjectListRecord>, ApplicationError> {
        let mut query = Project::find()
            .filter(project::Column::DeletedAt.is_not_null())
            .order_by_desc(project::Column::DeletedAt);
        if let Some(space_id) = scope_space_id {
            query = query.filter(project::Column::SpaceId.eq(space_id));
        }
        query
            .all(&self.db)
            .await
            .map(|rows| {
                rows.into_iter()
                    .map(|row| LifecycleProjectListRecord {
                        id: row.id,
                        space_id: row.space_id,
                        name: row.name,
                        archived_at: row.archived_at,
                        deleted_at: row.deleted_at,
                    })
                    .collect()
            })
            .map_err(from_display)
    }
}

impl LifecycleTaskReader for LifecyclePortsAdapter {
    async fn list_archived(
        &self,
        scope_space_id: Option<&str>,
    ) -> Result<Vec<LifecycleTaskListRecord>, ApplicationError> {
        let mut query = Task::find()
            .filter(task::Column::ArchivedAt.is_not_null())
            .filter(task::Column::DeletedAt.is_null())
            .order_by_desc(task::Column::ArchivedAt);
        if let Some(space_id) = scope_space_id {
            query = query.filter(task::Column::SpaceId.eq(space_id));
        }
        query
            .all(&self.db)
            .await
            .map(|rows| {
                rows.into_iter()
                    .map(|row| LifecycleTaskListRecord {
                        id: row.id,
                        space_id: row.space_id,
                        project_id: row.project_id,
                        title: row.title,
                        archived_at: row.archived_at,
                        deleted_at: row.deleted_at,
                    })
                    .collect()
            })
            .map_err(from_display)
    }

    async fn list_trashed(
        &self,
        scope_space_id: Option<&str>,
    ) -> Result<Vec<LifecycleTaskListRecord>, ApplicationError> {
        let mut query = Task::find()
            .filter(task::Column::DeletedAt.is_not_null())
            .order_by_desc(task::Column::DeletedAt);
        if let Some(space_id) = scope_space_id {
            query = query.filter(task::Column::SpaceId.eq(space_id));
        }
        query
            .all(&self.db)
            .await
            .map(|rows| {
                rows.into_iter()
                    .map(|row| LifecycleTaskListRecord {
                        id: row.id,
                        space_id: row.space_id,
                        project_id: row.project_id,
                        title: row.title,
                        archived_at: row.archived_at,
                        deleted_at: row.deleted_at,
                    })
                    .collect()
            })
            .map_err(from_display)
    }
}

fn map_space(model: space::Model) -> SpaceRecord {
    SpaceRecord {
        id: model.id,
        name: model.name,
        icon_key: model.icon_key,
        color_key: model.color_key,
        is_default: model.is_default,
        position: model.position,
        generation: model.generation,
        archived_at: model.archived_at,
        deleted_at: model.deleted_at,
        archived_by_operation_id: model.archived_by_operation_id,
        deleted_by_operation_id: model.deleted_by_operation_id,
        created_at: model.created_at,
        updated_at: model.updated_at,
    }
}

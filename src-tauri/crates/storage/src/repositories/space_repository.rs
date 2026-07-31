//! Space Repository。

use crate::entities::{
    prelude::{Project, Space, Task},
    project, space, task,
};
use sea_orm::sea_query::ExprTrait;
use sea_orm::{
    sea_query::Expr, ActiveModelTrait, ColumnTrait, ConnectionTrait, DatabaseConnection,
    EntityTrait, QueryFilter, QueryOrder, QuerySelect, Set,
};

use crate::error::StorageError;
use stoneflow_application::operation::{SyncEntityKind, TombstoneRecord};
use stoneflow_domain::POSITION_STEP;

use super::TombstoneRepository;

/// 创建 Space 所需的持久化字段。
#[derive(Debug, Clone)]
pub struct CreateSpaceRecord {
    pub id: String,
    pub name: String,
    pub icon_key: String,
    pub color_key: String,
    pub is_default: bool,
    pub position: i64,
    pub created_at: String,
    pub updated_at: String,
}

/// 更新 Space 基础字段的 patch。
#[derive(Debug, Clone, Default)]
pub struct UpdateSpacePatch {
    pub name: Option<String>,
    pub icon_key: Option<String>,
    pub color_key: Option<String>,
}

/// 一次 Space 生命周期操作影响的实体数量。
#[derive(Debug, Clone)]
pub struct SpaceCascadeResult {
    pub space: space::Model,
    pub affected_project_count: u64,
    pub affected_task_count: u64,
}

/// 永久删除前保留的最小同步元数据。
#[derive(Debug, Clone)]
pub struct SpaceCascadeEntities {
    pub space: space::Model,
    pub projects: Vec<project::Model>,
    pub tasks: Vec<task::Model>,
}

#[derive(Debug, Clone)]
pub struct SpaceRepository {
    db: DatabaseConnection,
}

impl SpaceRepository {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    pub fn connection(&self) -> &DatabaseConnection {
        &self.db
    }

    pub async fn list_visible(&self) -> Result<Vec<space::Model>, StorageError> {
        Space::find()
            .filter(space::Column::ArchivedAt.is_null())
            .filter(space::Column::DeletedAt.is_null())
            .order_by_asc(space::Column::Position)
            .order_by_asc(space::Column::CreatedAt)
            .all(self.connection())
            .await
            .map_err(StorageError::from)
    }

    pub async fn get(&self, space_id: &str) -> Result<Option<space::Model>, StorageError> {
        self.get_in_connection(self.connection(), space_id).await
    }

    /// 按 id 批量读取 Space；空切片直接返回，避免无效 `IN ()`。
    pub async fn list_by_ids(&self, ids: &[String]) -> Result<Vec<space::Model>, StorageError> {
        if ids.is_empty() {
            return Ok(Vec::new());
        }
        Space::find()
            .filter(space::Column::Id.is_in(ids.iter().cloned()))
            .all(self.connection())
            .await
            .map_err(StorageError::from)
    }

    pub async fn get_in_connection<C>(
        &self,
        connection: &C,
        space_id: &str,
    ) -> Result<Option<space::Model>, StorageError>
    where
        C: ConnectionTrait,
    {
        Space::find_by_id(space_id.to_owned())
            .one(connection)
            .await
            .map_err(StorageError::from)
    }

    pub async fn get_default(&self) -> Result<Option<space::Model>, StorageError> {
        Space::find()
            .filter(space::Column::IsDefault.eq(true))
            .filter(space::Column::ArchivedAt.is_null())
            .filter(space::Column::DeletedAt.is_null())
            .one(self.connection())
            .await
            .map_err(StorageError::from)
    }

    pub async fn next_position<C>(&self, connection: &C) -> Result<i64, StorageError>
    where
        C: ConnectionTrait,
    {
        let max = Space::find()
            .select_only()
            .column_as(space::Column::Position.max(), "max_position")
            .into_tuple::<Option<i64>>()
            .one(connection)
            .await
            .map_err(StorageError::from)?
            .flatten()
            .unwrap_or(0);
        Ok(max + POSITION_STEP)
    }

    pub async fn list_active_except<C>(
        &self,
        connection: &C,
        excluded_space_id: &str,
    ) -> Result<Vec<space::Model>, StorageError>
    where
        C: ConnectionTrait,
    {
        Space::find()
            .filter(space::Column::Id.ne(excluded_space_id))
            .filter(space::Column::ArchivedAt.is_null())
            .filter(space::Column::DeletedAt.is_null())
            .order_by_asc(space::Column::Position)
            .order_by_asc(space::Column::CreatedAt)
            .all(connection)
            .await
            .map_err(StorageError::from)
    }

    pub async fn create<C>(
        &self,
        connection: &C,
        record: CreateSpaceRecord,
    ) -> Result<space::Model, StorageError>
    where
        C: ConnectionTrait,
    {
        space::ActiveModel {
            id: Set(record.id),
            name: Set(record.name),
            icon_key: Set(record.icon_key),
            color_key: Set(record.color_key),
            is_default: Set(record.is_default),
            position: Set(record.position),
            generation: Set(1),
            archived_at: Set(None),
            deleted_at: Set(None),
            archived_by_operation_id: Set(None),
            deleted_by_operation_id: Set(None),
            created_at: Set(record.created_at),
            updated_at: Set(record.updated_at),
        }
        .insert(connection)
        .await
        .map_err(StorageError::from)
    }

    pub async fn update<C>(
        &self,
        connection: &C,
        space_id: &str,
        patch: UpdateSpacePatch,
        updated_at: &str,
    ) -> Result<Option<space::Model>, StorageError>
    where
        C: ConnectionTrait,
    {
        let Some(current) = self.get_in_connection(connection, space_id).await? else {
            return Ok(None);
        };
        let mut model: space::ActiveModel = current.into();
        if let Some(name) = patch.name {
            model.name = Set(name);
        }
        if let Some(icon_key) = patch.icon_key {
            model.icon_key = Set(icon_key);
        }
        if let Some(color_key) = patch.color_key {
            model.color_key = Set(color_key);
        }
        let next_generation = match &model.generation {
            sea_orm::ActiveValue::Set(value) | sea_orm::ActiveValue::Unchanged(value) => value + 1,
            sea_orm::ActiveValue::NotSet => 1,
        };
        model.updated_at = Set(updated_at.to_owned());
        model.generation = Set(next_generation);
        model
            .update(connection)
            .await
            .map(Some)
            .map_err(StorageError::from)
    }

    pub async fn clear_default<C>(
        &self,
        connection: &C,
        updated_at: &str,
    ) -> Result<u64, StorageError>
    where
        C: ConnectionTrait,
    {
        Space::update_many()
            .col_expr(space::Column::IsDefault, Expr::value(false))
            .col_expr(space::Column::UpdatedAt, Expr::value(updated_at))
            .filter(space::Column::IsDefault.eq(true))
            .exec(connection)
            .await
            .map(|result| result.rows_affected)
            .map_err(StorageError::from)
    }

    pub async fn set_default<C>(
        &self,
        connection: &C,
        space_id: &str,
        updated_at: &str,
    ) -> Result<Option<space::Model>, StorageError>
    where
        C: ConnectionTrait,
    {
        let Some(current) = Space::find_by_id(space_id.to_owned())
            .one(connection)
            .await
            .map_err(StorageError::from)?
        else {
            return Ok(None);
        };
        let mut model: space::ActiveModel = current.into();
        model.is_default = Set(true);
        let next_generation = match &model.generation {
            sea_orm::ActiveValue::Set(value) | sea_orm::ActiveValue::Unchanged(value) => value + 1,
            sea_orm::ActiveValue::NotSet => 1,
        };
        model.updated_at = Set(updated_at.to_owned());
        model.generation = Set(next_generation);
        model
            .update(connection)
            .await
            .map(Some)
            .map_err(StorageError::from)
    }

    pub async fn archive_cascade<C>(
        &self,
        connection: &C,
        space_id: &str,
        operation_id: &str,
        archived_at: &str,
    ) -> Result<Option<SpaceCascadeResult>, StorageError>
    where
        C: ConnectionTrait,
    {
        let Some(current) = self.get_in_connection(connection, space_id).await? else {
            return Ok(None);
        };
        if current.archived_at.is_some() || current.deleted_at.is_some() {
            return Ok(None);
        }

        let project_result = Project::update_many()
            .col_expr(project::Column::ArchivedAt, Expr::value(archived_at))
            .col_expr(
                project::Column::ArchivedByOperationId,
                Expr::value(operation_id),
            )
            .col_expr(project::Column::UpdatedAt, Expr::value(archived_at))
            .col_expr(
                project::Column::Generation,
                Expr::col(project::Column::Generation).add(1),
            )
            .filter(project::Column::SpaceId.eq(space_id))
            .filter(project::Column::ArchivedAt.is_null())
            .filter(project::Column::DeletedAt.is_null())
            .exec(connection)
            .await?;
        let task_result = Task::update_many()
            .col_expr(task::Column::ArchivedAt, Expr::value(archived_at))
            .col_expr(
                task::Column::ArchivedByOperationId,
                Expr::value(operation_id),
            )
            .col_expr(task::Column::UpdatedAt, Expr::value(archived_at))
            .col_expr(
                task::Column::Generation,
                Expr::col(task::Column::Generation).add(1),
            )
            .filter(task::Column::SpaceId.eq(space_id))
            .filter(task::Column::ArchivedAt.is_null())
            .filter(task::Column::DeletedAt.is_null())
            .exec(connection)
            .await?;

        let mut model: space::ActiveModel = current.into();
        model.is_default = Set(false);
        model.archived_at = Set(Some(archived_at.to_owned()));
        model.archived_by_operation_id = Set(Some(operation_id.to_owned()));
        model.updated_at = Set(archived_at.to_owned());
        model.generation = Set(next_generation(&model.generation));
        let space = model.update(connection).await?;

        Ok(Some(SpaceCascadeResult {
            space,
            affected_project_count: project_result.rows_affected,
            affected_task_count: task_result.rows_affected,
        }))
    }

    pub async fn soft_delete_cascade<C>(
        &self,
        connection: &C,
        space_id: &str,
        operation_id: &str,
        deleted_at: &str,
    ) -> Result<Option<SpaceCascadeResult>, StorageError>
    where
        C: ConnectionTrait,
    {
        let Some(current) = self.get_in_connection(connection, space_id).await? else {
            return Ok(None);
        };
        if current.deleted_at.is_some() {
            return Ok(None);
        }

        let project_result = Project::update_many()
            .col_expr(project::Column::DeletedAt, Expr::value(deleted_at))
            .col_expr(
                project::Column::DeletedByOperationId,
                Expr::value(operation_id),
            )
            .col_expr(project::Column::UpdatedAt, Expr::value(deleted_at))
            .col_expr(
                project::Column::Generation,
                Expr::col(project::Column::Generation).add(1),
            )
            .filter(project::Column::SpaceId.eq(space_id))
            .filter(project::Column::DeletedAt.is_null())
            .exec(connection)
            .await?;
        let task_result = Task::update_many()
            .col_expr(task::Column::DeletedAt, Expr::value(deleted_at))
            .col_expr(
                task::Column::DeletedByOperationId,
                Expr::value(operation_id),
            )
            .col_expr(task::Column::UpdatedAt, Expr::value(deleted_at))
            .col_expr(
                task::Column::Generation,
                Expr::col(task::Column::Generation).add(1),
            )
            .filter(task::Column::SpaceId.eq(space_id))
            .filter(task::Column::DeletedAt.is_null())
            .exec(connection)
            .await?;

        let mut model: space::ActiveModel = current.into();
        model.is_default = Set(false);
        model.deleted_at = Set(Some(deleted_at.to_owned()));
        model.deleted_by_operation_id = Set(Some(operation_id.to_owned()));
        model.updated_at = Set(deleted_at.to_owned());
        model.generation = Set(next_generation(&model.generation));
        let space = model.update(connection).await?;

        Ok(Some(SpaceCascadeResult {
            space,
            affected_project_count: project_result.rows_affected,
            affected_task_count: task_result.rows_affected,
        }))
    }

    pub async fn restore_archive_cascade<C>(
        &self,
        connection: &C,
        space_id: &str,
        operation_id: &str,
        updated_at: &str,
    ) -> Result<Option<SpaceCascadeResult>, StorageError>
    where
        C: ConnectionTrait,
    {
        let Some(current) = self.get_in_connection(connection, space_id).await? else {
            return Ok(None);
        };
        if current.archived_by_operation_id.as_deref() != Some(operation_id) {
            return Ok(None);
        }

        let project_result = Project::update_many()
            .col_expr(
                project::Column::ArchivedAt,
                Expr::value(Option::<String>::None),
            )
            .col_expr(
                project::Column::ArchivedByOperationId,
                Expr::value(Option::<String>::None),
            )
            .col_expr(project::Column::UpdatedAt, Expr::value(updated_at))
            .col_expr(
                project::Column::Generation,
                Expr::col(project::Column::Generation).add(1),
            )
            .filter(project::Column::SpaceId.eq(space_id))
            .filter(project::Column::ArchivedByOperationId.eq(operation_id))
            .exec(connection)
            .await?;
        let task_result = Task::update_many()
            .col_expr(
                task::Column::ArchivedAt,
                Expr::value(Option::<String>::None),
            )
            .col_expr(
                task::Column::ArchivedByOperationId,
                Expr::value(Option::<String>::None),
            )
            .col_expr(task::Column::UpdatedAt, Expr::value(updated_at))
            .col_expr(
                task::Column::Generation,
                Expr::col(task::Column::Generation).add(1),
            )
            .filter(task::Column::SpaceId.eq(space_id))
            .filter(task::Column::ArchivedByOperationId.eq(operation_id))
            .exec(connection)
            .await?;

        let mut model: space::ActiveModel = current.into();
        model.archived_at = Set(None);
        model.archived_by_operation_id = Set(None);
        model.updated_at = Set(updated_at.to_owned());
        model.generation = Set(next_generation(&model.generation));
        let space = model.update(connection).await?;

        Ok(Some(SpaceCascadeResult {
            space,
            affected_project_count: project_result.rows_affected,
            affected_task_count: task_result.rows_affected,
        }))
    }

    pub async fn restore_deleted_cascade<C>(
        &self,
        connection: &C,
        space_id: &str,
        operation_id: &str,
        updated_at: &str,
    ) -> Result<Option<SpaceCascadeResult>, StorageError>
    where
        C: ConnectionTrait,
    {
        let Some(current) = self.get_in_connection(connection, space_id).await? else {
            return Ok(None);
        };
        if current.deleted_by_operation_id.as_deref() != Some(operation_id) {
            return Ok(None);
        }

        let project_result = Project::update_many()
            .col_expr(
                project::Column::DeletedAt,
                Expr::value(Option::<String>::None),
            )
            .col_expr(
                project::Column::DeletedByOperationId,
                Expr::value(Option::<String>::None),
            )
            .col_expr(project::Column::UpdatedAt, Expr::value(updated_at))
            .col_expr(
                project::Column::Generation,
                Expr::col(project::Column::Generation).add(1),
            )
            .filter(project::Column::SpaceId.eq(space_id))
            .filter(project::Column::DeletedByOperationId.eq(operation_id))
            .exec(connection)
            .await?;
        let task_result = Task::update_many()
            .col_expr(task::Column::DeletedAt, Expr::value(Option::<String>::None))
            .col_expr(
                task::Column::DeletedByOperationId,
                Expr::value(Option::<String>::None),
            )
            .col_expr(task::Column::UpdatedAt, Expr::value(updated_at))
            .col_expr(
                task::Column::Generation,
                Expr::col(task::Column::Generation).add(1),
            )
            .filter(task::Column::SpaceId.eq(space_id))
            .filter(task::Column::DeletedByOperationId.eq(operation_id))
            .exec(connection)
            .await?;

        let mut model: space::ActiveModel = current.into();
        model.deleted_at = Set(None);
        model.deleted_by_operation_id = Set(None);
        model.updated_at = Set(updated_at.to_owned());
        model.generation = Set(next_generation(&model.generation));
        let space = model.update(connection).await?;

        Ok(Some(SpaceCascadeResult {
            space,
            affected_project_count: project_result.rows_affected,
            affected_task_count: task_result.rows_affected,
        }))
    }

    pub async fn collect_cascade_entities<C>(
        &self,
        connection: &C,
        space_id: &str,
    ) -> Result<Option<SpaceCascadeEntities>, StorageError>
    where
        C: ConnectionTrait,
    {
        let Some(space) = self.get_in_connection(connection, space_id).await? else {
            return Ok(None);
        };
        let projects = Project::find()
            .filter(project::Column::SpaceId.eq(space_id))
            .all(connection)
            .await?;
        let tasks = Task::find()
            .filter(task::Column::SpaceId.eq(space_id))
            .all(connection)
            .await?;
        Ok(Some(SpaceCascadeEntities {
            space,
            projects,
            tasks,
        }))
    }

    pub async fn permanently_delete_cascade<C>(
        &self,
        connection: &C,
        space_id: &str,
        deleted_at: &str,
    ) -> Result<Option<SpaceCascadeResult>, StorageError>
    where
        C: ConnectionTrait,
    {
        let Some(entities) = self.collect_cascade_entities(connection, space_id).await? else {
            return Ok(None);
        };
        let tombstones = TombstoneRepository::new(self.db.clone());
        for project in &entities.projects {
            tombstones
                .insert_in_connection(
                    connection,
                    &TombstoneRecord {
                        entity_type: SyncEntityKind::Project,
                        entity_id: project.id.clone(),
                        generation: project.generation + 1,
                        deletion_seq: 0,
                        deleted_at: deleted_at.to_owned(),
                    },
                )
                .await?;
        }
        for task in &entities.tasks {
            tombstones
                .insert_in_connection(
                    connection,
                    &TombstoneRecord {
                        entity_type: SyncEntityKind::Task,
                        entity_id: task.id.clone(),
                        generation: task.generation + 1,
                        deletion_seq: 0,
                        deleted_at: deleted_at.to_owned(),
                    },
                )
                .await?;
        }
        tombstones
            .insert_in_connection(
                connection,
                &TombstoneRecord {
                    entity_type: SyncEntityKind::Space,
                    entity_id: entities.space.id.clone(),
                    generation: entities.space.generation + 1,
                    deletion_seq: 0,
                    deleted_at: deleted_at.to_owned(),
                },
            )
            .await?;

        let space = entities.space.clone();
        self.delete_physical(connection, space_id).await?;
        Ok(Some(SpaceCascadeResult {
            space,
            affected_project_count: entities.projects.len() as u64,
            affected_task_count: entities.tasks.len() as u64,
        }))
    }

    /// 物理删除 Space。
    pub async fn delete_physical<C>(
        &self,
        connection: &C,
        space_id: &str,
    ) -> Result<u64, StorageError>
    where
        C: ConnectionTrait,
    {
        Space::delete_by_id(space_id.to_owned())
            .exec(connection)
            .await
            .map(|result| result.rows_affected)
            .map_err(StorageError::from)
    }
}

fn next_generation(value: &sea_orm::ActiveValue<i64>) -> i64 {
    match value {
        sea_orm::ActiveValue::Set(value) | sea_orm::ActiveValue::Unchanged(value) => value + 1,
        sea_orm::ActiveValue::NotSet => 1,
    }
}

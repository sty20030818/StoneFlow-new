//! Project 持久化：Project SQL 与其 Task 生命周期级联保持在同一事务。

use sea_orm::{
    sea_query::Expr, ActiveModelTrait, ColumnTrait, ConnectionTrait, DatabaseConnection,
    EntityTrait, PaginatorTrait, QueryFilter, QueryOrder, QuerySelect, Set,
};
use stoneflow_domain::{WorkStatus, POSITION_STEP};

use crate::{
    entities::{
        activity_event,
        common::WorkStatus as StorageWorkStatus,
        prelude::{Project, Task},
        project, task,
    },
    error::StorageError,
};
use stoneflow_application::operation::{SyncEntityKind, TombstoneRecord};

use super::TombstoneRepository;

#[derive(Debug, Clone)]
pub struct CreateProjectRecord {
    pub id: String,
    pub space_id: String,
    pub name: String,
    pub description: Option<String>,
    pub status: WorkStatus,
    pub priority: i32,
    pub planned_at: Option<String>,
    pub due_at: Option<String>,
    pub remind_at: Option<String>,
    pub status_changed_at: String,
    pub completed_at: Option<String>,
    pub position: i64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Default)]
pub struct UpdateProjectPatch {
    pub name: Option<String>,
    pub description: Option<Option<String>>,
    pub status: Option<WorkStatus>,
    pub priority: Option<i32>,
    pub planned_at: Option<Option<String>>,
    pub due_at: Option<Option<String>>,
    pub remind_at: Option<Option<String>>,
    pub status_changed_at: Option<String>,
    pub completed_at: Option<Option<String>>,
    pub position: Option<i64>,
}

#[derive(Debug, Clone)]
pub struct ProjectCascadeResult {
    pub project: project::Model,
    pub affected_task_count: u64,
}

#[derive(Debug, Clone)]
pub struct ProjectRepository {
    db: DatabaseConnection,
}

impl ProjectRepository {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    pub fn connection(&self) -> &DatabaseConnection {
        &self.db
    }

    pub async fn get(&self, project_id: &str) -> Result<Option<project::Model>, StorageError> {
        self.get_in_connection(&self.db, project_id).await
    }

    pub async fn get_in_connection<C>(
        &self,
        connection: &C,
        project_id: &str,
    ) -> Result<Option<project::Model>, StorageError>
    where
        C: ConnectionTrait,
    {
        Project::find_by_id(project_id.to_owned())
            .one(connection)
            .await
            .map_err(Into::into)
    }

    pub async fn get_visible_by_name(
        &self,
        space_id: &str,
        name: &str,
    ) -> Result<Option<project::Model>, StorageError> {
        Project::find()
            .filter(project::Column::SpaceId.eq(space_id))
            .filter(project::Column::Name.eq(name))
            .filter(project::Column::ArchivedAt.is_null())
            .filter(project::Column::DeletedAt.is_null())
            .one(&self.db)
            .await
            .map_err(Into::into)
    }

    pub async fn next_position<C>(
        &self,
        connection: &C,
        space_id: &str,
    ) -> Result<i64, StorageError>
    where
        C: ConnectionTrait,
    {
        let max = Project::find()
            .select_only()
            .column_as(project::Column::Position.max(), "max_position")
            .filter(project::Column::SpaceId.eq(space_id))
            .filter(project::Column::ArchivedAt.is_null())
            .filter(project::Column::DeletedAt.is_null())
            .into_tuple::<Option<i64>>()
            .one(connection)
            .await?
            .flatten()
            .unwrap_or(0);
        Ok(max + POSITION_STEP)
    }

    pub async fn create<C>(
        &self,
        connection: &C,
        record: CreateProjectRecord,
    ) -> Result<project::Model, StorageError>
    where
        C: ConnectionTrait,
    {
        project::ActiveModel {
            id: Set(record.id),
            space_id: Set(record.space_id),
            name: Set(record.name),
            description: Set(record.description),
            status: Set(to_storage_status(record.status)),
            priority: Set(record.priority),
            planned_at: Set(record.planned_at),
            due_at: Set(record.due_at),
            remind_at: Set(record.remind_at),
            status_changed_at: Set(record.status_changed_at),
            completed_at: Set(record.completed_at),
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
        .map_err(Into::into)
    }

    pub async fn update<C>(
        &self,
        connection: &C,
        project_id: &str,
        patch: UpdateProjectPatch,
        updated_at: &str,
    ) -> Result<Option<project::Model>, StorageError>
    where
        C: ConnectionTrait,
    {
        let Some(current) = self.get_in_connection(connection, project_id).await? else {
            return Ok(None);
        };
        let mut model: project::ActiveModel = current.into();
        if let Some(value) = patch.name {
            model.name = Set(value);
        }
        if let Some(value) = patch.description {
            model.description = Set(value);
        }
        if let Some(value) = patch.status {
            model.status = Set(to_storage_status(value));
        }
        if let Some(value) = patch.priority {
            model.priority = Set(value);
        }
        if let Some(value) = patch.planned_at {
            model.planned_at = Set(value);
        }
        if let Some(value) = patch.due_at {
            model.due_at = Set(value);
        }
        if let Some(value) = patch.remind_at {
            model.remind_at = Set(value);
        }
        if let Some(value) = patch.status_changed_at {
            model.status_changed_at = Set(value);
        }
        if let Some(value) = patch.completed_at {
            model.completed_at = Set(value);
        }
        if let Some(value) = patch.position {
            model.position = Set(value);
        }
        model.updated_at = Set(updated_at.to_owned());
        model.generation = Set(next_generation(&model.generation));
        model.update(connection).await.map(Some).map_err(Into::into)
    }

    pub async fn list_visible(
        &self,
        space_id: Option<&str>,
        include_completed: bool,
    ) -> Result<Vec<project::Model>, StorageError> {
        let mut query = Project::find()
            .filter(project::Column::ArchivedAt.is_null())
            .filter(project::Column::DeletedAt.is_null());
        if let Some(space_id) = space_id {
            query = query.filter(project::Column::SpaceId.eq(space_id));
        }
        if !include_completed {
            query = query.filter(project::Column::CompletedAt.is_null());
        }
        query
            .order_by_asc(project::Column::Position)
            .order_by_asc(project::Column::CreatedAt)
            .all(&self.db)
            .await
            .map_err(Into::into)
    }

    pub async fn count_tasks_by_project_ids(
        &self,
        project_ids: &[String],
    ) -> Result<Vec<(String, u64, u64)>, StorageError> {
        let mut rows = Vec::with_capacity(project_ids.len());
        for project_id in project_ids {
            let total = Task::find()
                .filter(task::Column::ProjectId.eq(project_id))
                .filter(task::Column::ArchivedAt.is_null())
                .filter(task::Column::DeletedAt.is_null())
                .count(&self.db)
                .await?;
            let active = Task::find()
                .filter(task::Column::ProjectId.eq(project_id))
                .filter(task::Column::ArchivedAt.is_null())
                .filter(task::Column::DeletedAt.is_null())
                .filter(task::Column::CompletedAt.is_null())
                .count(&self.db)
                .await?;
            rows.push((project_id.clone(), total, active));
        }
        Ok(rows)
    }

    pub async fn archive_cascade<C>(
        &self,
        connection: &C,
        project_id: &str,
        operation_id: &str,
        archived_at: &str,
    ) -> Result<Option<ProjectCascadeResult>, StorageError>
    where
        C: ConnectionTrait,
    {
        let Some(current) = self.get_in_connection(connection, project_id).await? else {
            return Ok(None);
        };
        if current.archived_at.is_some() || current.deleted_at.is_some() {
            return Ok(None);
        }
        let tasks = Task::update_many()
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
            .filter(task::Column::ProjectId.eq(project_id))
            .filter(task::Column::ArchivedAt.is_null())
            .filter(task::Column::DeletedAt.is_null())
            .exec(connection)
            .await?;
        let mut model: project::ActiveModel = current.into();
        model.archived_at = Set(Some(archived_at.to_owned()));
        model.archived_by_operation_id = Set(Some(operation_id.to_owned()));
        model.updated_at = Set(archived_at.to_owned());
        model.generation = Set(next_generation(&model.generation));
        Ok(Some(ProjectCascadeResult {
            project: model.update(connection).await?,
            affected_task_count: tasks.rows_affected,
        }))
    }

    pub async fn soft_delete_cascade<C>(
        &self,
        connection: &C,
        project_id: &str,
        operation_id: &str,
        deleted_at: &str,
    ) -> Result<Option<ProjectCascadeResult>, StorageError>
    where
        C: ConnectionTrait,
    {
        let Some(current) = self.get_in_connection(connection, project_id).await? else {
            return Ok(None);
        };
        if current.deleted_at.is_some() {
            return Ok(None);
        }
        let tasks = Task::update_many()
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
            .filter(task::Column::ProjectId.eq(project_id))
            .filter(task::Column::DeletedAt.is_null())
            .exec(connection)
            .await?;
        let mut model: project::ActiveModel = current.into();
        model.deleted_at = Set(Some(deleted_at.to_owned()));
        model.deleted_by_operation_id = Set(Some(operation_id.to_owned()));
        model.updated_at = Set(deleted_at.to_owned());
        model.generation = Set(next_generation(&model.generation));
        Ok(Some(ProjectCascadeResult {
            project: model.update(connection).await?,
            affected_task_count: tasks.rows_affected,
        }))
    }

    pub async fn restore_archive_cascade<C>(
        &self,
        connection: &C,
        project_id: &str,
        operation_id: &str,
        updated_at: &str,
    ) -> Result<Option<ProjectCascadeResult>, StorageError>
    where
        C: ConnectionTrait,
    {
        let Some(current) = self.get_in_connection(connection, project_id).await? else {
            return Ok(None);
        };
        if current.archived_by_operation_id.as_deref() != Some(operation_id) {
            return Ok(None);
        }
        let tasks = Task::update_many()
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
            .filter(task::Column::ProjectId.eq(project_id))
            .filter(task::Column::ArchivedByOperationId.eq(operation_id))
            .exec(connection)
            .await?;
        let mut model: project::ActiveModel = current.into();
        model.archived_at = Set(None);
        model.archived_by_operation_id = Set(None);
        model.updated_at = Set(updated_at.to_owned());
        model.generation = Set(next_generation(&model.generation));
        Ok(Some(ProjectCascadeResult {
            project: model.update(connection).await?,
            affected_task_count: tasks.rows_affected,
        }))
    }

    pub async fn restore_deleted_cascade<C>(
        &self,
        connection: &C,
        project_id: &str,
        operation_id: &str,
        updated_at: &str,
    ) -> Result<Option<ProjectCascadeResult>, StorageError>
    where
        C: ConnectionTrait,
    {
        let Some(current) = self.get_in_connection(connection, project_id).await? else {
            return Ok(None);
        };
        if current.deleted_by_operation_id.as_deref() != Some(operation_id) {
            return Ok(None);
        }
        let tasks = Task::update_many()
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
            .filter(task::Column::ProjectId.eq(project_id))
            .filter(task::Column::DeletedByOperationId.eq(operation_id))
            .exec(connection)
            .await?;
        let mut model: project::ActiveModel = current.into();
        model.deleted_at = Set(None);
        model.deleted_by_operation_id = Set(None);
        model.updated_at = Set(updated_at.to_owned());
        model.generation = Set(next_generation(&model.generation));
        Ok(Some(ProjectCascadeResult {
            project: model.update(connection).await?,
            affected_task_count: tasks.rows_affected,
        }))
    }

    pub async fn permanently_delete_cascade<C>(
        &self,
        connection: &C,
        project_id: &str,
        deleted_at: &str,
    ) -> Result<Option<ProjectCascadeResult>, StorageError>
    where
        C: ConnectionTrait,
    {
        let Some(project) = self.get_in_connection(connection, project_id).await? else {
            return Ok(None);
        };
        let tasks = Task::find()
            .filter(task::Column::ProjectId.eq(project_id))
            .all(connection)
            .await?;
        let tombstones = TombstoneRepository::new(self.db.clone());
        for task in &tasks {
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
                    entity_type: SyncEntityKind::Project,
                    entity_id: project.id.clone(),
                    generation: project.generation + 1,
                    deletion_seq: 0,
                    deleted_at: deleted_at.to_owned(),
                },
            )
            .await?;
        activity_event::Entity::delete_many()
            .filter(activity_event::Column::EntityType.eq("project"))
            .filter(activity_event::Column::EntityId.eq(project_id))
            .exec(connection)
            .await?;
        Task::delete_many()
            .filter(task::Column::ProjectId.eq(project_id))
            .exec(connection)
            .await?;
        Project::delete_by_id(project_id.to_owned())
            .exec(connection)
            .await?;
        Ok(Some(ProjectCascadeResult {
            project,
            affected_task_count: tasks.len() as u64,
        }))
    }
}

fn next_generation(value: &sea_orm::ActiveValue<i64>) -> i64 {
    match value {
        sea_orm::ActiveValue::Set(value) | sea_orm::ActiveValue::Unchanged(value) => value + 1,
        sea_orm::ActiveValue::NotSet => 1,
    }
}

fn to_storage_status(status: WorkStatus) -> StorageWorkStatus {
    match status {
        WorkStatus::Todo => StorageWorkStatus::Todo,
        WorkStatus::Doing => StorageWorkStatus::Doing,
        WorkStatus::Waiting => StorageWorkStatus::Waiting,
        WorkStatus::Done => StorageWorkStatus::Done,
        WorkStatus::Canceled => StorageWorkStatus::Canceled,
    }
}

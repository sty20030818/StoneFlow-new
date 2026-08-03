//! Task 的 SQLite 持久化，不承载业务规则。

use sea_orm::{
    sea_query::Expr, ActiveModelTrait, ActiveValue::Set, ColumnTrait, Condition, ConnectionTrait,
    DatabaseConnection, EntityTrait, PaginatorTrait, QueryFilter, QueryOrder, QuerySelect,
    Select,
};
use stoneflow_application::view::{
    DateFilterMode, ProjectFilterMode, TaskScopeKind, ViewTaskQuery,
};
use stoneflow_domain::WorkStatus;
use stoneflow_domain::POSITION_STEP;

use crate::{
    entities::{
        activity_event, common::WorkStatus as StorageWorkStatus, task, task::Entity as Task,
    },
    error::StorageError,
};

#[derive(Debug, Clone)]
pub struct CreateTaskRecord {
    pub id: String,
    pub space_id: String,
    pub project_id: Option<String>,
    pub title: String,
    pub note: Option<String>,
    pub status: WorkStatus,
    pub status_changed_at: String,
    pub priority: i32,
    pub planned_at: Option<String>,
    pub due_at: Option<String>,
    pub remind_at: Option<String>,
    pub position: i64,
    pub completed_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Default)]
pub struct UpdateTaskPatch {
    pub title: Option<String>,
    pub note: Option<Option<String>>,
    pub status: Option<WorkStatus>,
    pub status_changed_at: Option<String>,
    pub priority: Option<i32>,
    pub space_id: Option<String>,
    pub project_id: Option<Option<String>>,
    pub planned_at: Option<Option<String>>,
    pub due_at: Option<Option<String>>,
    pub remind_at: Option<Option<String>>,
    pub position: Option<i64>,
    pub completed_at: Option<Option<String>>,
}

#[derive(Debug, Clone)]
pub struct TaskRepository {
    db: DatabaseConnection,
}

impl TaskRepository {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    pub fn connection(&self) -> &DatabaseConnection {
        &self.db
    }

    pub async fn get(&self, task_id: &str) -> Result<Option<task::Model>, StorageError> {
        Task::find_by_id(task_id)
            .one(&self.db)
            .await
            .map_err(Into::into)
    }

    pub async fn get_in_connection<C>(
        &self,
        connection: &C,
        task_id: &str,
    ) -> Result<Option<task::Model>, StorageError>
    where
        C: ConnectionTrait,
    {
        Task::find_by_id(task_id)
            .one(connection)
            .await
            .map_err(Into::into)
    }

    pub async fn list_visible(
        &self,
        space_id: Option<&str>,
        project_id: Option<Option<&str>>,
        include_archived: bool,
        status: Option<WorkStatus>,
    ) -> Result<Vec<task::Model>, StorageError> {
        let statuses = status.map(|value| vec![value]);
        self.list_visible_with_statuses(
            space_id,
            project_id,
            include_archived,
            statuses.as_deref(),
        )
        .await
    }

    /// 可见任务列表；`statuses` 为白名单（SQL `IN`），`None` 不限 status。
    ///
    /// 排序固定为 `(position ASC, id ASC)`，与 keyset cursor 一致。
    pub async fn list_visible_with_statuses(
        &self,
        space_id: Option<&str>,
        project_id: Option<Option<&str>>,
        include_archived: bool,
        statuses: Option<&[WorkStatus]>,
    ) -> Result<Vec<task::Model>, StorageError> {
        self.list_visible_page(
            space_id,
            project_id,
            include_archived,
            statuses,
            None,
            None,
            None,
            None,
        )
        .await
    }

    /// 分页可见任务；`limit` 存在时多取逻辑由调用方决定。
    pub async fn list_visible_page(
        &self,
        space_id: Option<&str>,
        project_id: Option<Option<&str>>,
        include_archived: bool,
        statuses: Option<&[WorkStatus]>,
        priorities: Option<&[i32]>,
        date_filter: Option<&stoneflow_application::task::TaskListDateFilter>,
        cursor: Option<(i64, &str)>,
        limit: Option<u64>,
    ) -> Result<Vec<task::Model>, StorageError> {
        let mut query = Task::find().filter(task::Column::DeletedAt.is_null());
        query = apply_visible_filters(
            query,
            space_id,
            project_id,
            include_archived,
            statuses,
            priorities,
            date_filter,
        );
        if let Some((position, id)) = cursor {
            // (position > c) OR (position = c AND id > c.id)
            query = query.filter(
                Condition::any()
                    .add(task::Column::Position.gt(position))
                    .add(
                        Condition::all()
                            .add(task::Column::Position.eq(position))
                            .add(task::Column::Id.gt(id)),
                    ),
            );
        }
        query = query
            .order_by_asc(task::Column::Position)
            .order_by_asc(task::Column::Id);
        if let Some(limit) = limit {
            query = query.limit(limit);
        }
        query.all(&self.db).await.map_err(Into::into)
    }

    /// 与 list_visible_page 相同过滤条件下的总数（无 cursor / limit），供首屏定死滚动条总高。
    pub async fn count_visible(
        &self,
        space_id: Option<&str>,
        project_id: Option<Option<&str>>,
        include_archived: bool,
        statuses: Option<&[WorkStatus]>,
        priorities: Option<&[i32]>,
        date_filter: Option<&stoneflow_application::task::TaskListDateFilter>,
    ) -> Result<u64, StorageError> {
        let mut query = Task::find().filter(task::Column::DeletedAt.is_null());
        query = apply_visible_filters(
            query,
            space_id,
            project_id,
            include_archived,
            statuses,
            priorities,
            date_filter,
        );
        query.count(&self.db).await.map_err(Into::into)
    }

    /// View 候选集的数据库过滤。排序与本地时区日期语义仍由 application 决定。
    pub async fn list_for_view(
        &self,
        definition: &ViewTaskQuery,
    ) -> Result<Vec<task::Model>, StorageError> {
        let mut query = Task::find()
            .filter(task::Column::ArchivedAt.is_null())
            .filter(task::Column::DeletedAt.is_null());
        if matches!(definition.scope.kind, TaskScopeKind::Space) {
            query = query.filter(
                task::Column::SpaceId.eq(definition.scope.space_id.as_deref().unwrap_or_default()),
            );
        }
        if !definition.statuses.is_empty() {
            query = query.filter(
                task::Column::Status
                    .is_in(definition.statuses.iter().copied().map(to_storage_status)),
            );
        }
        if let Some(project) = &definition.project {
            query = match project.mode {
                ProjectFilterMode::Any => query,
                ProjectFilterMode::None => query.filter(task::Column::ProjectId.is_null()),
                ProjectFilterMode::Specific => {
                    query.filter(task::Column::ProjectId.is_in(project.ids.iter().cloned()))
                }
            };
        }
        if let Some(due) = &definition.due {
            if matches!(due.mode, DateFilterMode::Between) {
                if let Some(from) = due.from.as_deref() {
                    query = query.filter(task::Column::DueAt.gte(from));
                }
                if let Some(to) = due.to.as_deref() {
                    query = query.filter(task::Column::DueAt.lte(to));
                }
            }
        }
        query
            .order_by_asc(task::Column::DueAt)
            .order_by_asc(task::Column::Position)
            .all(&self.db)
            .await
            .map_err(Into::into)
    }

    pub async fn next_position<C>(
        &self,
        connection: &C,
        space_id: &str,
        project_id: Option<&str>,
    ) -> Result<i64, StorageError>
    where
        C: ConnectionTrait,
    {
        let mut query = Task::find()
            .filter(task::Column::SpaceId.eq(space_id))
            .filter(task::Column::ArchivedAt.is_null())
            .filter(task::Column::DeletedAt.is_null())
            .order_by_desc(task::Column::Position);
        query = match project_id {
            Some(project_id) => query.filter(task::Column::ProjectId.eq(project_id)),
            None => query.filter(task::Column::ProjectId.is_null()),
        };
        Ok(query
            .one(connection)
            .await?
            .map_or(POSITION_STEP, |task| task.position + POSITION_STEP))
    }

    pub async fn create<C>(
        &self,
        connection: &C,
        record: CreateTaskRecord,
    ) -> Result<task::Model, StorageError>
    where
        C: ConnectionTrait,
    {
        task::ActiveModel {
            id: Set(record.id),
            space_id: Set(record.space_id),
            project_id: Set(record.project_id),
            title: Set(record.title),
            note: Set(record.note),
            status: Set(to_storage_status(record.status)),
            status_changed_at: Set(record.status_changed_at),
            priority: Set(record.priority),
            planned_at: Set(record.planned_at),
            due_at: Set(record.due_at),
            remind_at: Set(record.remind_at),
            position: Set(record.position),
            generation: Set(1),
            completed_at: Set(record.completed_at),
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
        task_id: &str,
        patch: UpdateTaskPatch,
        updated_at: &str,
    ) -> Result<Option<task::Model>, StorageError>
    where
        C: ConnectionTrait,
    {
        let Some(current) = self.get_in_connection(connection, task_id).await? else {
            return Ok(None);
        };
        let mut model: task::ActiveModel = current.into();
        if let Some(value) = patch.title {
            model.title = Set(value);
        }
        if let Some(value) = patch.note {
            model.note = Set(value);
        }
        if let Some(value) = patch.status {
            model.status = Set(to_storage_status(value));
        }
        if let Some(value) = patch.status_changed_at {
            model.status_changed_at = Set(value);
        }
        if let Some(value) = patch.priority {
            model.priority = Set(value);
        }
        if let Some(value) = patch.space_id {
            model.space_id = Set(value);
        }
        if let Some(value) = patch.project_id {
            model.project_id = Set(value);
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
        if let Some(value) = patch.position {
            model.position = Set(value);
        }
        if let Some(value) = patch.completed_at {
            model.completed_at = Set(value);
        }
        model.updated_at = Set(updated_at.to_owned());
        model.generation = Set(next_generation(&model.generation));
        model.update(connection).await.map(Some).map_err(Into::into)
    }

    pub async fn archive<C>(
        &self,
        connection: &C,
        task_id: &str,
        operation_id: &str,
        archived_at: &str,
    ) -> Result<Option<task::Model>, StorageError>
    where
        C: ConnectionTrait,
    {
        let Some(current) = self.get_in_connection(connection, task_id).await? else {
            return Ok(None);
        };
        if current.archived_at.is_some() || current.deleted_at.is_some() {
            return Ok(None);
        }
        let mut model: task::ActiveModel = current.into();
        model.archived_at = Set(Some(archived_at.to_owned()));
        model.archived_by_operation_id = Set(Some(operation_id.to_owned()));
        model.updated_at = Set(archived_at.to_owned());
        model.generation = Set(next_generation(&model.generation));
        model.update(connection).await.map(Some).map_err(Into::into)
    }

    pub async fn soft_delete<C>(
        &self,
        connection: &C,
        task_id: &str,
        operation_id: &str,
        deleted_at: &str,
    ) -> Result<Option<task::Model>, StorageError>
    where
        C: ConnectionTrait,
    {
        let Some(current) = self.get_in_connection(connection, task_id).await? else {
            return Ok(None);
        };
        if current.deleted_at.is_some() {
            return Ok(None);
        }
        let mut model: task::ActiveModel = current.into();
        model.deleted_at = Set(Some(deleted_at.to_owned()));
        model.deleted_by_operation_id = Set(Some(operation_id.to_owned()));
        model.updated_at = Set(deleted_at.to_owned());
        model.generation = Set(next_generation(&model.generation));
        model.update(connection).await.map(Some).map_err(Into::into)
    }

    pub async fn restore<C>(
        &self,
        connection: &C,
        task_id: &str,
        operation_id: &str,
        updated_at: &str,
    ) -> Result<Option<task::Model>, StorageError>
    where
        C: ConnectionTrait,
    {
        let Some(current) = self.get_in_connection(connection, task_id).await? else {
            return Ok(None);
        };
        let restore_deleted = current.deleted_by_operation_id.as_deref() == Some(operation_id);
        let restore_archived = current.archived_by_operation_id.as_deref() == Some(operation_id);
        let mut model: task::ActiveModel = current.into();
        if restore_deleted {
            model.deleted_at = Set(None);
            model.deleted_by_operation_id = Set(None);
        } else if restore_archived {
            model.archived_at = Set(None);
            model.archived_by_operation_id = Set(None);
        } else {
            return Ok(None);
        }
        model.updated_at = Set(updated_at.to_owned());
        model.generation = Set(next_generation(&model.generation));
        model.update(connection).await.map(Some).map_err(Into::into)
    }

    pub async fn permanently_delete<C>(
        &self,
        connection: &C,
        task_id: &str,
    ) -> Result<Option<task::Model>, StorageError>
    where
        C: ConnectionTrait,
    {
        let Some(task) = self.get_in_connection(connection, task_id).await? else {
            return Ok(None);
        };
        activity_event::Entity::delete_many()
            .filter(activity_event::Column::EntityType.eq("task"))
            .filter(activity_event::Column::EntityId.eq(task_id))
            .exec(connection)
            .await?;
        Task::delete_by_id(task_id.to_owned())
            .exec(connection)
            .await?;
        Ok(Some(task))
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

/// 列表可见过滤：space / placement / archive / status / priority / 有效日期。
/// 有效日期与前端 `resolveTaskDateValue` 对齐：COALESCE(due_at, planned_at, remind_at)。
fn apply_visible_filters(
    mut query: Select<Task>,
    space_id: Option<&str>,
    project_id: Option<Option<&str>>,
    include_archived: bool,
    statuses: Option<&[WorkStatus]>,
    priorities: Option<&[i32]>,
    date_filter: Option<&stoneflow_application::task::TaskListDateFilter>,
) -> Select<Task> {
    if !include_archived {
        query = query.filter(task::Column::ArchivedAt.is_null());
    }
    if let Some(space_id) = space_id {
        query = query.filter(task::Column::SpaceId.eq(space_id));
    }
    if let Some(project_id) = project_id {
        query = match project_id {
            Some(project_id) => query.filter(task::Column::ProjectId.eq(project_id)),
            None => query.filter(task::Column::ProjectId.is_null()),
        };
    }
    if let Some(statuses) = statuses.filter(|items| !items.is_empty()) {
        query = query.filter(
            task::Column::Status.is_in(statuses.iter().copied().map(to_storage_status)),
        );
    }
    if let Some(priorities) = priorities.filter(|items| !items.is_empty()) {
        query = query.filter(task::Column::Priority.is_in(priorities.iter().copied()));
    }
    if let Some(date_filter) = date_filter {
        use stoneflow_application::task::TaskListDateFilter;
        // 有效日期非空 / 全空 / 区间
        let has_any = Condition::any()
            .add(task::Column::DueAt.is_not_null())
            .add(task::Column::PlannedAt.is_not_null())
            .add(task::Column::RemindAt.is_not_null());
        let has_none = Condition::all()
            .add(task::Column::DueAt.is_null())
            .add(task::Column::PlannedAt.is_null())
            .add(task::Column::RemindAt.is_null());
        match date_filter {
            TaskListDateFilter::HasDate => {
                query = query.filter(has_any);
            }
            TaskListDateFilter::NoDate => {
                query = query.filter(has_none);
            }
            TaskListDateFilter::Range { from, to } => {
                // 必须有有效日期，再按 COALESCE 边界过滤
                query = query.filter(has_any);
                if let Some(from) = from.as_deref() {
                    query = query.filter(Expr::cust_with_values(
                        "COALESCE(due_at, planned_at, remind_at) >= ?",
                        [from],
                    ));
                }
                if let Some(to) = to.as_deref() {
                    query = query.filter(Expr::cust_with_values(
                        "COALESCE(due_at, planned_at, remind_at) <= ?",
                        [to],
                    ));
                }
            }
        }
    }
    query
}

//! TaskLink 的持久化实现。

use sea_orm::{
    ActiveModelTrait, ActiveValue::Set, ColumnTrait, ConnectionTrait, DatabaseConnection,
    EntityTrait, QueryFilter, QueryOrder,
};

use crate::{
    entities::{task_link, task_link::Entity as TaskLink},
    error::StorageError,
};

#[derive(Debug, Clone)]
pub struct CreateTaskLinkRecord {
    pub id: String,
    pub task_id: String,
    pub title: String,
    pub url: String,
    pub position: i64,
    pub created_at: String,
    pub updated_at: String,
}
#[derive(Debug, Clone, Default)]
pub struct UpdateTaskLinkPatch {
    pub title: Option<String>,
    pub url: Option<String>,
}
#[derive(Debug, Clone)]
pub struct TaskLinkRepository {
    db: DatabaseConnection,
}
impl TaskLinkRepository {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }
    pub fn connection(&self) -> &DatabaseConnection {
        &self.db
    }
    pub async fn get(&self, id: &str) -> Result<Option<task_link::Model>, StorageError> {
        TaskLink::find_by_id(id)
            .one(&self.db)
            .await
            .map_err(Into::into)
    }
    pub async fn list_by_task(&self, task_id: &str) -> Result<Vec<task_link::Model>, StorageError> {
        TaskLink::find()
            .filter(task_link::Column::TaskId.eq(task_id))
            .order_by_asc(task_link::Column::Position)
            .all(&self.db)
            .await
            .map_err(Into::into)
    }
    pub async fn next_position<C>(&self, connection: &C, task_id: &str) -> Result<i64, StorageError>
    where
        C: ConnectionTrait,
    {
        Ok(TaskLink::find()
            .filter(task_link::Column::TaskId.eq(task_id))
            .order_by_desc(task_link::Column::Position)
            .one(connection)
            .await?
            .map_or(0, |link| link.position + 1))
    }
    pub async fn create<C>(
        &self,
        connection: &C,
        record: CreateTaskLinkRecord,
    ) -> Result<task_link::Model, StorageError>
    where
        C: ConnectionTrait,
    {
        task_link::ActiveModel {
            id: Set(record.id),
            task_id: Set(record.task_id),
            title: Set(record.title),
            url: Set(record.url),
            position: Set(record.position),
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
        id: &str,
        patch: UpdateTaskLinkPatch,
        updated_at: &str,
    ) -> Result<Option<task_link::Model>, StorageError>
    where
        C: ConnectionTrait,
    {
        let Some(current) = TaskLink::find_by_id(id).one(connection).await? else {
            return Ok(None);
        };
        let mut model: task_link::ActiveModel = current.into();
        if let Some(title) = patch.title {
            model.title = Set(title)
        }
        if let Some(url) = patch.url {
            model.url = Set(url)
        }
        model.updated_at = Set(updated_at.to_owned());
        model.update(connection).await.map(Some).map_err(Into::into)
    }
    pub async fn delete<C>(&self, connection: &C, id: &str) -> Result<bool, StorageError>
    where
        C: ConnectionTrait,
    {
        Ok(TaskLink::delete_by_id(id)
            .exec(connection)
            .await?
            .rows_affected
            == 1)
    }
}

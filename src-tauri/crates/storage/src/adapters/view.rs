//! View port 实现与 application service 工厂。

use sea_orm::{DatabaseConnection, DatabaseTransaction, TransactionTrait};
use stoneflow_application::{
    operation::OutboxEnqueueRecord,
    view::{
        CreateViewPersistenceRecord, UpdateViewPatch, ViewLookupReader, ViewPersistence,
        ViewProjectLookupRecord, ViewRecord, ViewService, ViewSpaceLookupRecord, ViewTaskPage,
        ViewTaskReader, ViewTaskRecord,
    },
    ApplicationError,
};

use crate::adapters::error::from_display;
use crate::mappers::work_status_to_domain;
use crate::repositories::{
    map_view, CreateViewRecord, OutboxRepository, ProjectRepository, SpaceRepository,
    StorageUpdateViewPatch, TaskRepository, ViewRepository,
};

/// 已装配的 View application service。
pub type ViewAppService =
    ViewService<ViewPersistenceAdapter, ViewPersistenceAdapter, ViewPersistenceAdapter>;

/// 从数据库连接构造 View 用例。
pub fn build_view_service(connection: DatabaseConnection) -> ViewAppService {
    let adapter = ViewPersistenceAdapter {
        views: ViewRepository::new(connection.clone()),
        tasks: TaskRepository::new(connection.clone()),
        spaces: SpaceRepository::new(connection.clone()),
        projects: ProjectRepository::new(connection.clone()),
        outbox: OutboxRepository::new(connection),
    };
    ViewService::new(adapter.clone(), adapter.clone(), adapter)
}

#[derive(Clone)]
pub struct ViewPersistenceAdapter {
    views: ViewRepository,
    tasks: TaskRepository,
    spaces: SpaceRepository,
    projects: ProjectRepository,
    outbox: OutboxRepository,
}
impl ViewPersistence for ViewPersistenceAdapter {
    type Connection = DatabaseTransaction;
    async fn begin(&self) -> Result<Self::Connection, ApplicationError> {
        self.views.connection().begin().await.map_err(from_display)
    }
    async fn commit(&self, connection: Self::Connection) -> Result<(), ApplicationError> {
        connection.commit().await.map_err(from_display)
    }
    async fn get(&self, view_id: &str) -> Result<Option<ViewRecord>, ApplicationError> {
        self.views
            .get(view_id)
            .await
            .map(|view| view.map(map_view))
            .map_err(from_display)
    }
    async fn list(&self) -> Result<Vec<ViewRecord>, ApplicationError> {
        self.views
            .list()
            .await
            .map(|views| views.into_iter().map(map_view).collect())
            .map_err(from_display)
    }
    async fn next_position(&self, connection: &Self::Connection) -> Result<i64, ApplicationError> {
        self.views
            .next_position(connection)
            .await
            .map_err(from_display)
    }
    async fn create(
        &self,
        connection: &Self::Connection,
        record: CreateViewPersistenceRecord,
    ) -> Result<ViewRecord, ApplicationError> {
        self.views
            .create(
                connection,
                CreateViewRecord {
                    id: record.id,
                    name: record.name,
                    entity_kind: record.entity_kind,
                    scope_json: record.scope_json,
                    filters_json: record.filters_json,
                    sort_json: record.sort_json,
                    group_by_json: record.group_by_json,
                    position: record.position,
                    created_at: record.created_at,
                    updated_at: record.updated_at,
                },
            )
            .await
            .map(map_view)
            .map_err(from_display)
    }
    async fn update(
        &self,
        connection: &Self::Connection,
        view_id: &str,
        patch: UpdateViewPatch,
    ) -> Result<Option<ViewRecord>, ApplicationError> {
        self.views
            .update(
                connection,
                view_id,
                StorageUpdateViewPatch {
                    name: patch.name,
                    scope_json: patch.scope_json,
                    filters_json: patch.filters_json,
                    sort_json: patch.sort_json,
                    group_by_json: patch.group_by_json,
                    position: patch.position,
                    updated_at: patch.updated_at.unwrap_or_default(),
                },
            )
            .await
            .map(|view| view.map(map_view))
            .map_err(from_display)
    }
    async fn delete(
        &self,
        connection: &Self::Connection,
        view_id: &str,
    ) -> Result<u64, ApplicationError> {
        self.views
            .delete(connection, view_id)
            .await
            .map_err(from_display)
    }
    async fn enqueue(
        &self,
        connection: &Self::Connection,
        record: &OutboxEnqueueRecord,
    ) -> Result<(), ApplicationError> {
        self.outbox
            .enqueue_in_connection(connection, record)
            .await
            .map_err(from_display)
    }
}
impl ViewTaskReader for ViewPersistenceAdapter {
    async fn run_query(
        &self,
        query: stoneflow_application::view::ViewTaskQuery,
    ) -> Result<ViewTaskPage, ApplicationError> {
        let total_count = if query.cursor.is_none() {
            Some(
                self.tasks
                    .count_for_view(&query)
                    .await
                    .map_err(from_display)?,
            )
        } else {
            None
        };
        let items = self
            .tasks
            .list_for_view(&query)
            .await
            .map(|tasks| {
                tasks
                    .into_iter()
                    .map(|task| ViewTaskRecord {
                        id: task.id,
                        space_id: task.space_id,
                        project_id: task.project_id,
                        title: task.title,
                        status: work_status_to_domain(task.status),
                        status_changed_at: task.status_changed_at,
                        priority: task.priority,
                        planned_at: task.planned_at,
                        due_at: task.due_at,
                        remind_at: task.remind_at,
                        position: task.position,
                        completed_at: task.completed_at,
                        archived_at: task.archived_at,
                        created_at: task.created_at,
                        updated_at: task.updated_at,
                    })
                    .collect()
            })
            .map_err(from_display)?;
        Ok(ViewTaskPage { items, total_count })
    }

    async fn count_query(
        &self,
        query: stoneflow_application::view::ViewTaskQuery,
    ) -> Result<u64, ApplicationError> {
        self.tasks
            .count_for_view(&query)
            .await
            .map_err(from_display)
    }
}
impl ViewLookupReader for ViewPersistenceAdapter {
    async fn list_spaces_by_ids(
        &self,
        ids: &[String],
    ) -> Result<Vec<ViewSpaceLookupRecord>, ApplicationError> {
        self.spaces
            .list_by_ids(ids)
            .await
            .map(|rows| {
                rows.into_iter()
                    .map(|space| ViewSpaceLookupRecord {
                        id: space.id.clone(),
                        name: space.name,
                        // 与既有行为一致：slug 暂用 id（无独立 slug 列时）
                        slug: space.id,
                    })
                    .collect()
            })
            .map_err(from_display)
    }
    async fn list_projects_by_ids(
        &self,
        ids: &[String],
    ) -> Result<Vec<ViewProjectLookupRecord>, ApplicationError> {
        self.projects
            .list_by_ids(ids)
            .await
            .map(|rows| {
                rows.into_iter()
                    .map(|project| ViewProjectLookupRecord {
                        id: project.id,
                        name: project.name,
                    })
                    .collect()
            })
            .map_err(from_display)
    }
}

#[cfg(test)]
mod tests {
    use stoneflow_application::{
        task::TaskQueryCursor,
        view::{
            FilterQueryValue, TaskScopeInput, TaskScopeKind, TaskViewBaseKey, TaskViewContext,
            ViewDateBoundaries, ViewTaskQuery,
        },
    };
    use stoneflow_test_support::TestDatabase;

    use super::*;

    #[tokio::test]
    async fn task_query_counts_only_the_first_page_and_supports_count_only() {
        let database = TestDatabase::bootstrap_in_memory()
            .await
            .expect("test database should bootstrap");
        let connection = database.connection().clone();
        let adapter = ViewPersistenceAdapter {
            views: ViewRepository::new(connection.clone()),
            tasks: TaskRepository::new(connection.clone()),
            spaces: SpaceRepository::new(connection.clone()),
            projects: ProjectRepository::new(connection.clone()),
            outbox: OutboxRepository::new(connection),
        };
        let query = ViewTaskQuery {
            scope: TaskScopeInput {
                kind: TaskScopeKind::All,
                space_id: None,
            },
            context: TaskViewContext::All,
            base_view_key: TaskViewBaseKey::All,
            filters: FilterQueryValue::default(),
            dates: ViewDateBoundaries {
                today_start: "2026-08-22T00:00:00+08:00".to_owned(),
                tomorrow_start: "2026-08-23T00:00:00+08:00".to_owned(),
                day_after_tomorrow_start: "2026-08-24T00:00:00+08:00".to_owned(),
                next_week_start: "2026-08-24T00:00:00+08:00".to_owned(),
            },
            limit: 1,
            cursor: None,
        };

        assert_eq!(
            adapter.run_query(query.clone()).await.unwrap().total_count,
            Some(0)
        );
        assert_eq!(adapter.count_query(query.clone()).await.unwrap(), 0);
        assert_eq!(
            adapter
                .run_query(ViewTaskQuery {
                    cursor: Some(TaskQueryCursor {
                        position: 0,
                        id: "cursor".to_owned(),
                    }),
                    ..query
                })
                .await
                .unwrap()
                .total_count,
            None
        );
    }
}

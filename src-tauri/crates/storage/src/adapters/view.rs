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
    use sea_orm::{ActiveModelTrait, ActiveValue::Set, ColumnTrait, EntityTrait, QueryFilter};
    use serde_json::json;
    use stoneflow_application::{
        operation::OutboxPayload,
        task::TaskQueryCursor,
        view::{
            codec::{EMPTY_SORT_JSON, NO_GROUP_JSON},
            CreateViewInput, FilterQueryValue, TaskScopeInput, TaskScopeKind, TaskViewBaseKey,
            TaskViewContext, UpdateViewInput, ViewDateBoundaries, ViewTaskQuery,
        },
    };
    use stoneflow_test_support::TestDatabase;

    use super::*;
    use crate::entities::{outbox, prelude::Outbox, prelude::View};

    async fn single_view_outbox(connection: &DatabaseConnection, id: &str) -> outbox::Model {
        let entries = Outbox::find()
            .filter(outbox::Column::EntityId.eq(id))
            .all(connection)
            .await
            .unwrap();
        assert_eq!(entries.len(), 1);
        entries.into_iter().next().unwrap()
    }

    #[tokio::test]
    async fn view_edits_keep_generation_and_emit_only_changed_fields_after_legacy_repair() {
        let database = TestDatabase::bootstrap_in_memory().await.unwrap();
        let connection = database.connection();
        let service = build_view_service(connection.clone());
        let outbox = OutboxRepository::new(connection.clone());
        let created = service.create_view(CreateViewInput {
            name: "待执行".to_owned(),
            scope: TaskScopeInput { kind: TaskScopeKind::All, space_id: None },
            context: TaskViewContext::Standalone,
            base_view_key: TaskViewBaseKey::Active,
            filters: serde_json::from_value(json!({"clauses":[{"id":"status-1","field":"status","op":"is","values":["todo"]}]})).unwrap(),
        }).await.unwrap();
        let creation = single_view_outbox(connection, &created.id).await;
        assert_eq!(creation.generation, 1);
        outbox
            .acknowledge_operation(&creation.operation_id)
            .await
            .unwrap();

        let original = View::find_by_id(&created.id)
            .one(connection)
            .await
            .unwrap()
            .unwrap();
        let mut legacy: crate::entities::view::ActiveModel = original.clone().into();
        legacy.sort_json = Set("obsolete-sort".to_owned());
        legacy.group_by_json = Set(Some("none".to_owned()));
        legacy.update(connection).await.unwrap();

        let renamed = service
            .update_view(UpdateViewInput {
                view_id: created.id.clone(),
                name: Some("下一步".to_owned()),
                scope: None,
                context: None,
                base_view_key: None,
                filters: None,
            })
            .await
            .unwrap();
        assert_eq!(renamed.name, "下一步");
        assert_eq!(renamed.filters, created.filters);
        assert_eq!(renamed.context, created.context);
        assert_eq!(renamed.base_view_key, created.base_view_key);
        let rename = single_view_outbox(connection, &created.id).await;
        assert_eq!(rename.generation, 1);
        let OutboxPayload::Patch { fields } = serde_json::from_str(&rename.payload_json).unwrap()
        else {
            panic!("rename should emit a field patch");
        };
        assert_eq!(fields["name"], json!("下一步"));
        assert!(fields
            .keys()
            .all(|key| matches!(key.as_str(), "name" | "updated_at")));
        outbox
            .acknowledge_operation(&rename.operation_id)
            .await
            .unwrap();

        let updated = service
            .update_view(UpdateViewInput {
                view_id: created.id.clone(),
                name: None,
                scope: None,
                context: None,
                base_view_key: None,
                filters: Some(FilterQueryValue::default()),
            })
            .await
            .unwrap();
        assert_eq!(updated.name, renamed.name);
        assert_eq!(updated.filters, FilterQueryValue::default());
        let edit = single_view_outbox(connection, &created.id).await;
        assert_eq!(edit.generation, 1);
        let OutboxPayload::Patch { fields } = serde_json::from_str(&edit.payload_json).unwrap()
        else {
            panic!("filter edit should emit a field patch");
        };
        assert_eq!(fields["filters"]["filters"], json!({"clauses":[]}));
        assert!(fields
            .keys()
            .all(|key| matches!(key.as_str(), "filters" | "updated_at")));
        outbox
            .acknowledge_operation(&edit.operation_id)
            .await
            .unwrap();

        let stored = View::find_by_id(&created.id)
            .one(connection)
            .await
            .unwrap()
            .unwrap();
        assert_eq!(stored.sort_json, EMPTY_SORT_JSON);
        assert_eq!(stored.group_by_json.as_deref(), Some(NO_GROUP_JSON));
        assert_eq!(stored.generation, original.generation);
        assert_eq!(stored.created_at, original.created_at);
        service.delete_view(&created.id).await.unwrap();
        let deletion = single_view_outbox(connection, &created.id).await;
        assert_eq!(deletion.generation, 2);
        assert!(matches!(
            serde_json::from_str::<OutboxPayload>(&deletion.payload_json).unwrap(),
            OutboxPayload::Tombstone { .. }
        ));
        assert!(View::find_by_id(&created.id)
            .one(connection)
            .await
            .unwrap()
            .is_none());
    }

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

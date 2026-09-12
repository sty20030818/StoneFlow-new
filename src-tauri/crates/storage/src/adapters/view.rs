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
    async fn get_in_connection(
        &self,
        connection: &Self::Connection,
        view_id: &str,
    ) -> Result<Option<ViewRecord>, ApplicationError> {
        self.views
            .get_in_connection(connection, view_id)
            .await
            .map(|view| view.map(map_view))
            .map_err(from_display)
    }
    async fn get_project_in_connection(
        &self,
        connection: &Self::Connection,
        project_id: &str,
    ) -> Result<Option<ViewProjectLookupRecord>, ApplicationError> {
        self.projects
            .get_in_connection(connection, project_id)
            .await
            .map(|project| project.map(map_project_lookup))
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
            .map(|rows| rows.into_iter().map(map_project_lookup).collect())
            .map_err(from_display)
    }
}

fn map_project_lookup(project: crate::entities::project::Model) -> ViewProjectLookupRecord {
    ViewProjectLookupRecord {
        id: project.id,
        name: project.name,
        space_id: project.space_id,
        archived_at: project.archived_at,
        deleted_at: project.deleted_at,
    }
}

#[cfg(test)]
mod tests {
    use sea_orm::{
        ActiveModelTrait, ActiveValue::Set, ColumnTrait, ConnectionTrait, EntityTrait,
        PaginatorTrait, QueryFilter,
    };
    use serde_json::json;
    use stoneflow_application::{
        operation::OutboxPayload,
        task::TaskQueryCursor,
        view::{
            codec::{EMPTY_SORT_JSON, NO_GROUP_JSON},
            CreateViewInput, FilterQueryValue, ListViewsInput, RunTaskViewInput, TaskScopeInput,
            TaskScopeKind, TaskViewBaseKey, TaskViewContext, UpdateViewInput, ViewDateBoundaries,
            ViewTaskQuery,
        },
    };
    use stoneflow_test_support::TestDatabase;

    use super::*;
    use crate::entities::{outbox, prelude::Outbox, prelude::View};

    fn scope(space_id: Option<&str>) -> TaskScopeInput {
        TaskScopeInput {
            kind: if space_id.is_some() {
                TaskScopeKind::Space
            } else {
                TaskScopeKind::All
            },
            space_id: space_id.map(str::to_owned),
        }
    }

    fn create_input(scope: TaskScopeInput, project_id: Option<&str>) -> CreateViewInput {
        CreateViewInput {
            name: "保存的查询".to_owned(),
            scope,
            context: project_id.map_or(TaskViewContext::All, |id| TaskViewContext::Project {
                project_id: id.to_owned(),
            }),
            base_view_key: TaskViewBaseKey::Active,
            filters: FilterQueryValue::default(),
        }
    }

    async fn list_json(service: &ViewAppService, scope: TaskScopeInput) -> serde_json::Value {
        serde_json::to_value(service.list_views(ListViewsInput { scope }).await.unwrap()).unwrap()
    }

    async fn seed_project(connection: &DatabaseConnection) {
        connection.execute_unprepared(
            "INSERT INTO spaces (id, name, icon_key, color_key, is_default, position, generation, created_at, updated_at) VALUES
            ('view-space-a', 'A', 'home', 'blue', 0, 1024, 1, '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z'),
            ('view-space-b', 'B', 'home', 'blue', 0, 2048, 1, '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z');
            INSERT INTO projects (id, space_id, name, status, priority, status_changed_at, position, generation, created_at, updated_at)
            VALUES ('11111111-1111-4111-8111-111111111111', 'view-space-a', 'Project', 'todo', 0, '2026-09-13T00:00:00Z', 1024, 1, '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z');"
        ).await.unwrap();
    }

    #[tokio::test]
    async fn library_isolates_invalid_scopes_and_definitions_without_inventing_queries() {
        let database = TestDatabase::bootstrap_in_memory().await.unwrap();
        let connection = database.connection();
        let service = build_view_service(connection.clone());
        let all = service
            .create_view(create_input(scope(None), None))
            .await
            .unwrap();
        let space = service
            .create_view(create_input(scope(Some("view-space-a")), None))
            .await
            .unwrap();
        let unknown = service
            .create_view(create_input(scope(None), None))
            .await
            .unwrap();
        let bad_definition = service
            .create_view(create_input(scope(Some("view-space-a")), None))
            .await
            .unwrap();
        let mut damaged: crate::entities::view::ActiveModel = View::find_by_id(&unknown.id)
            .one(connection)
            .await
            .unwrap()
            .unwrap()
            .into();
        damaged.scope_json = Set(r#"{"type":"unknown"}"#.to_owned());
        damaged.update(connection).await.unwrap();
        let mut damaged: crate::entities::view::ActiveModel = View::find_by_id(&bad_definition.id)
            .one(connection)
            .await
            .unwrap()
            .unwrap()
            .into();
        damaged.filters_json =
            Set(r#"{"due":{"mode":"between","from":null,"to":null}}"#.to_owned());
        damaged.update(connection).await.unwrap();

        let all_rows = list_json(&service, scope(None)).await;
        assert_eq!(all_rows.as_array().unwrap().len(), 2);
        assert_eq!(all_rows[0]["id"], all.id);
        assert!(all_rows[0].get("definitionError").is_none());
        assert_eq!(all_rows[1]["id"], unknown.id);
        assert!(all_rows[1]["scope"].is_null());
        let space_rows = list_json(&service, scope(Some("view-space-a"))).await;
        assert_eq!(space_rows.as_array().unwrap().len(), 2);
        assert_eq!(space_rows[0]["id"], space.id);
        assert_eq!(space_rows[1]["id"], bad_definition.id);
        assert_eq!(
            space_rows[1]["scope"],
            json!({"type":"space","spaceId":"view-space-a"})
        );
        for row in [&all_rows[1], &space_rows[1]] {
            assert!(!row["definitionError"].as_str().unwrap().is_empty());
            for key in ["context", "baseViewKey", "filters"] {
                assert!(
                    row.get(key).is_none(),
                    "unavailable row must not invent {key}"
                );
            }
        }
        for (id, row_scope) in [
            (&unknown.id, scope(None)),
            (&bad_definition.id, scope(Some("view-space-a"))),
        ] {
            assert!(service
                .run_task_view(RunTaskViewInput {
                    scope: row_scope,
                    view_id: id.clone(),
                    filters: None,
                    cursor: None
                })
                .await
                .is_err());
            assert!(service
                .update_view(UpdateViewInput {
                    view_id: id.clone(),
                    name: Some("不能重命名".to_owned()),
                    scope: None,
                    context: None,
                    base_view_key: None,
                    filters: None
                })
                .await
                .is_err());
            service.delete_view(id).await.unwrap();
        }
        assert_eq!(
            list_json(&service, scope(None))
                .await
                .as_array()
                .unwrap()
                .len(),
            1
        );
        assert_eq!(
            list_json(&service, scope(Some("view-space-a")))
                .await
                .as_array()
                .unwrap()
                .len(),
            1
        );
    }

    #[tokio::test]
    async fn project_boundaries_are_checked_before_writes_and_rechecked_after_moves() {
        let database = TestDatabase::bootstrap_in_memory().await.unwrap();
        let connection = database.connection();
        seed_project(connection).await;
        let service = build_view_service(connection.clone());
        for input in [
            create_input(scope(None), Some("22222222-2222-4222-8222-222222222222")),
            create_input(
                scope(Some("view-space-b")),
                Some("11111111-1111-4111-8111-111111111111"),
            ),
        ] {
            assert!(service.create_view(input).await.is_err());
        }
        assert_eq!(View::find().count(connection).await.unwrap(), 0);
        assert_eq!(Outbox::find().count(connection).await.unwrap(), 0);
        let scoped = service
            .create_view(create_input(
                scope(Some("view-space-a")),
                Some("11111111-1111-4111-8111-111111111111"),
            ))
            .await
            .unwrap();
        let all = service
            .create_view(create_input(
                scope(None),
                Some("11111111-1111-4111-8111-111111111111"),
            ))
            .await
            .unwrap();
        let before = View::find_by_id(&scoped.id)
            .one(connection)
            .await
            .unwrap()
            .unwrap();
        let outbox_count = Outbox::find().count(connection).await.unwrap();
        assert!(service
            .update_view(UpdateViewInput {
                view_id: scoped.id.clone(),
                name: None,
                scope: Some(scope(Some("view-space-b"))),
                context: None,
                base_view_key: None,
                filters: None,
            })
            .await
            .is_err());
        assert!(service
            .update_view(UpdateViewInput {
                view_id: scoped.id.clone(),
                name: None,
                scope: None,
                context: Some(TaskViewContext::Project {
                    project_id: "22222222-2222-4222-8222-222222222222".to_owned()
                }),
                base_view_key: None,
                filters: None,
            })
            .await
            .is_err());
        connection
            .execute_unprepared(
                "UPDATE projects SET space_id = 'view-space-b' WHERE id = '11111111-1111-4111-8111-111111111111'",
            )
            .await
            .unwrap();
        let invalid = list_json(&service, scope(Some("view-space-a"))).await;
        assert!(invalid[0]["definitionError"]
            .as_str()
            .unwrap()
            .contains("项目范围已变化"));
        assert!(service
            .run_task_view(RunTaskViewInput {
                scope: scoped.scope.clone(),
                view_id: scoped.id.clone(),
                filters: None,
                cursor: None
            })
            .await
            .is_err());
        // 失效定义不能通过一次覆盖偷偷改写来源边界。
        assert!(service
            .update_view(UpdateViewInput {
                view_id: scoped.id.clone(),
                name: Some("不能重命名".to_owned()),
                scope: Some(scope(Some("view-space-b"))),
                context: None,
                base_view_key: None,
                filters: None
            })
            .await
            .is_err());
        assert_eq!(
            View::find_by_id(&scoped.id)
                .one(connection)
                .await
                .unwrap()
                .unwrap(),
            before
        );
        assert_eq!(
            Outbox::find().count(connection).await.unwrap(),
            outbox_count
        );
        assert!(list_json(&service, scope(None)).await[0]
            .get("definitionError")
            .is_none());
        assert_eq!(
            service
                .run_task_view(RunTaskViewInput {
                    scope: all.scope.clone(),
                    view_id: all.id.clone(),
                    filters: None,
                    cursor: None
                })
                .await
                .unwrap()
                .total_count,
            Some(0)
        );
        connection
            .execute_unprepared(
                "UPDATE projects SET space_id = 'view-space-a' WHERE id = '11111111-1111-4111-8111-111111111111'",
            )
            .await
            .unwrap();
        assert!(list_json(&service, scope(Some("view-space-a"))).await[0]
            .get("definitionError")
            .is_none());
        assert!(service
            .run_task_view(RunTaskViewInput {
                scope: scoped.scope,
                view_id: scoped.id,
                filters: None,
                cursor: None
            })
            .await
            .is_ok());
    }

    #[tokio::test]
    async fn project_lifecycle_recovery_revalidates_the_stored_view() {
        let database = TestDatabase::bootstrap_in_memory().await.unwrap();
        let connection = database.connection();
        seed_project(connection).await;
        let service = build_view_service(connection.clone());
        let view = service
            .create_view(create_input(
                scope(None),
                Some("11111111-1111-4111-8111-111111111111"),
            ))
            .await
            .unwrap();
        for column in ["archived_at", "deleted_at"] {
            connection.execute_unprepared(&format!("UPDATE projects SET {column} = '2026-09-13T00:00:00Z' WHERE id = '11111111-1111-4111-8111-111111111111'")).await.unwrap();
            assert!(list_json(&service, scope(None)).await[0]["definitionError"]
                .as_str()
                .unwrap()
                .contains("恢复项目"));
            assert!(service
                .create_view(create_input(
                    scope(None),
                    Some("11111111-1111-4111-8111-111111111111")
                ))
                .await
                .is_err());
            assert!(service
                .run_task_view(RunTaskViewInput {
                    scope: view.scope.clone(),
                    view_id: view.id.clone(),
                    filters: None,
                    cursor: None
                })
                .await
                .is_err());
            connection.execute_unprepared(&format!("UPDATE projects SET {column} = NULL WHERE id = '11111111-1111-4111-8111-111111111111'")).await.unwrap();
            assert!(list_json(&service, scope(None)).await[0]
                .get("definitionError")
                .is_none());
        }
        connection
            .execute_unprepared(
                "DELETE FROM projects WHERE id = '11111111-1111-4111-8111-111111111111'",
            )
            .await
            .unwrap();
        assert!(list_json(&service, scope(None)).await[0]["definitionError"]
            .as_str()
            .unwrap()
            .contains("项目不存在"));
        service.delete_view(&view.id).await.unwrap();
    }

    #[tokio::test]
    async fn unavailable_view_delete_failure_keeps_the_record_and_allows_retry() {
        let database = TestDatabase::bootstrap_in_memory().await.unwrap();
        let connection = database.connection();
        let service = build_view_service(connection.clone());
        let view = service
            .create_view(create_input(scope(None), None))
            .await
            .unwrap();
        let mut damaged: crate::entities::view::ActiveModel = View::find_by_id(&view.id)
            .one(connection)
            .await
            .unwrap()
            .unwrap()
            .into();
        damaged.scope_json = Set("invalid-json".to_owned());
        damaged.update(connection).await.unwrap();
        connection.execute_unprepared("CREATE TRIGGER reject_view_tombstone BEFORE INSERT ON outbox WHEN NEW.entity_type = 'view' AND NEW.operation_type = 'delete' BEGIN SELECT RAISE(FAIL, 'injected tombstone failure'); END;").await.unwrap();
        let before = View::find_by_id(&view.id)
            .one(connection)
            .await
            .unwrap()
            .unwrap();
        let outbox_count = Outbox::find().count(connection).await.unwrap();
        assert!(service.delete_view(&view.id).await.is_err());
        assert_eq!(
            View::find_by_id(&view.id)
                .one(connection)
                .await
                .unwrap()
                .unwrap(),
            before
        );
        assert_eq!(
            Outbox::find().count(connection).await.unwrap(),
            outbox_count
        );
        connection
            .execute_unprepared("DROP TRIGGER reject_view_tombstone")
            .await
            .unwrap();
        service.delete_view(&view.id).await.unwrap();
        assert_eq!(list_json(&service, scope(None)).await, json!([]));
        assert_eq!(
            Outbox::find().count(connection).await.unwrap(),
            outbox_count + 1
        );
    }

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

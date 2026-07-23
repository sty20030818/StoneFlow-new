//! View runtime adapter：连接 application ports 与 SQLite repositories。

use sea_orm::{DatabaseTransaction, TransactionTrait};
use stoneflow_application::{
    operation::OutboxEnqueueRecord,
    view::{
        CreateViewPersistenceRecord, UpdateViewPatch, ViewListQuery, ViewLookupReader,
        ViewPersistence, ViewProjectLookupRecord, ViewRecord, ViewService as ViewUsecase,
        ViewSpaceLookupRecord, ViewTaskReader, ViewTaskRecord,
    },
    ApplicationError,
};
use stoneflow_storage::{
    database::DatabaseRuntimeState,
    mappers::work_status_to_domain,
    repositories::{
        map_view, CreateViewRecord, OutboxRepository, ProjectRepository, SpaceRepository,
        StorageUpdateViewPatch, TaskRepository, ViewRepository,
    },
};

use crate::app::error::AppError;

pub use stoneflow_application::view::{
    CreateViewInput, ListViewsInput, RunTaskViewInput, RunTaskViewOutput, UpdateViewInput, ViewDto,
};

type InnerViewService =
    ViewUsecase<ViewPersistenceAdapter, ViewPersistenceAdapter, ViewPersistenceAdapter>;

pub struct ViewService {
    inner: InnerViewService,
}
impl ViewService {
    pub fn new(database: &DatabaseRuntimeState) -> Self {
        let connection = database.connection().clone();
        let adapter = ViewPersistenceAdapter {
            views: ViewRepository::new(connection.clone()),
            tasks: TaskRepository::new(connection.clone()),
            spaces: SpaceRepository::new(connection.clone()),
            projects: ProjectRepository::new(connection.clone()),
            outbox: OutboxRepository::new(connection),
        };
        Self {
            inner: ViewUsecase::new(adapter.clone(), adapter.clone(), adapter),
        }
    }
    pub async fn list_views(&self, input: ListViewsInput) -> Result<Vec<ViewDto>, AppError> {
        self.inner.list_views(input).await.map_err(AppError::from)
    }
    pub async fn run_task_view(
        &self,
        input: RunTaskViewInput,
    ) -> Result<RunTaskViewOutput, AppError> {
        self.inner
            .run_task_view(input)
            .await
            .map_err(AppError::from)
    }
    pub async fn create_view(&self, input: CreateViewInput) -> Result<ViewDto, AppError> {
        self.inner.create_view(input).await.map_err(AppError::from)
    }
    pub async fn update_view(&self, input: UpdateViewInput) -> Result<ViewDto, AppError> {
        self.inner.update_view(input).await.map_err(AppError::from)
    }
    pub async fn delete_view(&self, view_id: &str) -> Result<(), AppError> {
        self.inner
            .delete_view(view_id)
            .await
            .map_err(AppError::from)
    }
}

#[derive(Clone)]
struct ViewPersistenceAdapter {
    views: ViewRepository,
    tasks: TaskRepository,
    spaces: SpaceRepository,
    projects: ProjectRepository,
    outbox: OutboxRepository,
}
impl ViewPersistence for ViewPersistenceAdapter {
    type Connection = DatabaseTransaction;
    async fn begin(&self) -> Result<Self::Connection, ApplicationError> {
        self.views.connection().begin().await.map_err(storage_error)
    }
    async fn commit(&self, connection: Self::Connection) -> Result<(), ApplicationError> {
        connection.commit().await.map_err(storage_error)
    }
    async fn get(&self, view_id: &str) -> Result<Option<ViewRecord>, ApplicationError> {
        self.views
            .get(view_id)
            .await
            .map(|view| view.map(map_view))
            .map_err(storage_error)
    }
    async fn list(&self, _: ViewListQuery) -> Result<Vec<ViewRecord>, ApplicationError> {
        self.views
            .list()
            .await
            .map(|views| views.into_iter().map(map_view).collect())
            .map_err(storage_error)
    }
    async fn next_position(
        &self,
        connection: &Self::Connection,
        _: stoneflow_domain::ViewEntityKind,
    ) -> Result<i64, ApplicationError> {
        self.views
            .next_position(connection)
            .await
            .map_err(storage_error)
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
            .map_err(storage_error)
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
            .map_err(storage_error)
    }
    async fn delete(
        &self,
        connection: &Self::Connection,
        view_id: &str,
    ) -> Result<u64, ApplicationError> {
        self.views
            .delete(connection, view_id)
            .await
            .map_err(storage_error)
    }
    async fn enqueue(
        &self,
        connection: &Self::Connection,
        record: &OutboxEnqueueRecord,
    ) -> Result<(), ApplicationError> {
        self.outbox
            .enqueue_in_connection(connection, record)
            .await
            .map_err(storage_error)
    }
}
impl ViewTaskReader for ViewPersistenceAdapter {
    async fn list_candidates(
        &self,
        query: stoneflow_application::view::ViewTaskQuery,
    ) -> Result<Vec<ViewTaskRecord>, ApplicationError> {
        self.tasks
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
                        note: task.note,
                        status: work_status_to_domain(task.status),
                        status_changed_at: task.status_changed_at,
                        priority: task.priority,
                        planned_at: task.planned_at,
                        due_at: task.due_at,
                        remind_at: task.remind_at,
                        position: task.position,
                        completed_at: task.completed_at,
                        created_at: task.created_at,
                        updated_at: task.updated_at,
                    })
                    .collect()
            })
            .map_err(storage_error)
    }
}
impl ViewLookupReader for ViewPersistenceAdapter {
    async fn list_spaces_by_ids(
        &self,
        ids: &[String],
    ) -> Result<Vec<ViewSpaceLookupRecord>, ApplicationError> {
        let mut records = Vec::new();
        for id in ids {
            if let Some(space) = self.spaces.get(id).await.map_err(storage_error)? {
                records.push(ViewSpaceLookupRecord {
                    id: space.id.clone(),
                    name: space.name,
                    slug: space.id,
                });
            }
        }
        Ok(records)
    }
    async fn list_projects_by_ids(
        &self,
        ids: &[String],
    ) -> Result<Vec<ViewProjectLookupRecord>, ApplicationError> {
        let mut records = Vec::new();
        for id in ids {
            if let Some(project) = self.projects.get(id).await.map_err(storage_error)? {
                records.push(ViewProjectLookupRecord {
                    id: project.id,
                    name: project.name,
                });
            }
        }
        Ok(records)
    }
}
fn storage_error(error: impl std::fmt::Display) -> ApplicationError {
    ApplicationError::storage(error.to_string())
}

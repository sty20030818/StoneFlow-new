//! View Service 兼容壳：真源在 `stoneflow-usecase`。

use serde::Serialize;
use sea_orm::TransactionTrait;
use stoneflow_usecase::{
    activity::ActivityService as ActivityUsecase,
    view::{
        ViewLookupReader, ViewPersistence, ViewRecord, ViewService as ViewUsecase,
        ViewTaskReader,
    },
};

use crate::{
    app::error::AppError,
    services::{
        activity::ActivityPersistenceAdapter,
        sync_mutation::{build_delete_record, build_upsert_record},
    },
};
use stoneflow_storage::{
    mappers::{
        map_task_model_to_view_task_record, map_view_model_to_record, view_entity_kind_to_schema,
        view_kind_to_schema,
    },
    repositories::{
        CreateViewRecord, ProjectRepository, SpaceRepository, TaskPlacementQuery, TaskRepository,
        SyncRepository, UpdateViewPatch, ViewListQuery, ViewRepository,
    },
};

pub use stoneflow_usecase::view::{
    CreateViewInput, DeleteViewInput, ListViewsInput, ReorderViewsInput, RunProjectViewInput,
    RunTaskViewInput, RunTaskViewOutput, TaskViewGroupDto, ToggleViewVisibleInput, UpdateViewInput,
    ViewDto, ViewSortDirection, ViewSortRuleDto,
};

/// View 编排兼容壳。
#[derive(Debug, Clone)]
pub struct ViewService {
    inner: ViewUsecase<
        ViewPersistenceAdapter,
        ActivityPersistenceAdapter,
        ViewTaskReaderAdapter,
        ViewLookupReaderAdapter,
    >,
    repository: ViewRepository,
}

impl ViewService {
    pub fn new(
        repository: ViewRepository,
        sync_repository: SyncRepository,
        space_repository: SpaceRepository,
        project_repository: ProjectRepository,
        task_repository: TaskRepository,
        activity_service: crate::services::activity::ActivityService,
    ) -> Self {
        let activity_repo = activity_service.repository().clone();
        Self {
            inner: ViewUsecase::new(
                ViewPersistenceAdapter::new(repository.clone(), sync_repository),
                ActivityUsecase::new(ActivityPersistenceAdapter::new(activity_repo)),
                ViewTaskReaderAdapter::new(task_repository),
                ViewLookupReaderAdapter::new(space_repository, project_repository),
            ),
            repository,
        }
    }

    pub fn repository(&self) -> &ViewRepository {
        &self.repository
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

    pub async fn delete_view(&self, input: DeleteViewInput) -> Result<(), AppError> {
        self.inner.delete_view(input).await.map_err(AppError::from)
    }

    pub async fn toggle_view_visible(
        &self,
        input: ToggleViewVisibleInput,
    ) -> Result<ViewDto, AppError> {
        self.inner
            .toggle_view_visible(input)
            .await
            .map_err(AppError::from)
    }

    pub async fn reorder_views(&self, input: ReorderViewsInput) -> Result<Vec<ViewDto>, AppError> {
        self.inner
            .reorder_views(input)
            .await
            .map_err(AppError::from)
    }
}

#[derive(Debug, Clone)]
struct ViewPersistenceAdapter {
    repository: ViewRepository,
    sync_repository: SyncRepository,
}

impl ViewPersistenceAdapter {
    fn new(repository: ViewRepository, sync_repository: SyncRepository) -> Self {
        Self {
            repository,
            sync_repository,
        }
    }
}

impl ViewPersistence for ViewPersistenceAdapter {
    type Connection = sea_orm::DatabaseTransaction;

    async fn begin(&self) -> Result<Self::Connection, stoneflow_usecase::UsecaseError> {
        self.repository
            .connection()
            .begin()
            .await
            .map_err(map_db_error)
    }

    async fn commit(
        &self,
        connection: Self::Connection,
    ) -> Result<(), stoneflow_usecase::UsecaseError> {
        connection.commit().await.map_err(map_db_error)
    }

    async fn get(
        &self,
        view_id: &str,
    ) -> Result<Option<stoneflow_usecase::view::ViewRecord>, stoneflow_usecase::UsecaseError> {
        self.repository
            .get(view_id)
            .await
            .map(|view| view.map(map_view_model_to_record))
            .map_err(|error| map_app_error(error.into()))
    }

    async fn get_by_key(
        &self,
        entity_type: stoneflow_domain::ViewEntityKind,
        key: &str,
    ) -> Result<Option<stoneflow_usecase::view::ViewRecord>, stoneflow_usecase::UsecaseError> {
        self.repository
            .get_by_key(view_entity_kind_to_schema(entity_type), key)
            .await
            .map(|view| view.map(map_view_model_to_record))
            .map_err(|error| map_app_error(error.into()))
    }

    async fn list(
        &self,
        query: stoneflow_usecase::view::ViewListQuery,
    ) -> Result<Vec<stoneflow_usecase::view::ViewRecord>, stoneflow_usecase::UsecaseError> {
        self.repository
            .list(ViewListQuery {
                entity_type: view_entity_kind_to_schema(query.entity_type),
                visible_only: query.visible_only,
            })
            .await
            .map(|views| views.into_iter().map(map_view_model_to_record).collect())
            .map_err(|error| map_app_error(error.into()))
    }

    async fn next_sort_order(
        &self,
        connection: &Self::Connection,
        entity_type: stoneflow_domain::ViewEntityKind,
    ) -> Result<i32, stoneflow_usecase::UsecaseError> {
        self.repository
            .next_sort_order(connection, view_entity_kind_to_schema(entity_type))
            .await
            .map_err(|error| map_app_error(error.into()))
    }

    async fn create(
        &self,
        connection: &Self::Connection,
        record: stoneflow_usecase::view::CreateViewPersistenceRecord,
    ) -> Result<stoneflow_usecase::view::ViewRecord, stoneflow_usecase::UsecaseError> {
        let view = self
            .repository
            .create(
                connection,
                CreateViewRecord {
                    id: record.id,
                    name: record.name,
                    description: record.description,
                    kind: view_kind_to_schema(record.kind),
                    entity_type: view_entity_kind_to_schema(record.entity_type),
                    key: record.key,
                    filters: record.filters,
                    sort: record.sort,
                    group_by: record.group_by,
                    is_visible: record.is_visible,
                    sort_order: record.sort_order,
                    created_at: record.created_at,
                    updated_at: record.updated_at,
                },
            )
            .await
            .map(map_view_model_to_record)
            .map_err(|error| map_app_error(error.into()))?;
        let mutation_record = build_view_upsert_mutation_record(&view).map_err(map_app_error)?;
        self.sync_repository
            .insert_pending_mutation(connection, &mutation_record)
            .await
            .map_err(|error| map_app_error(error.into()))?;

        Ok(view)
    }

    async fn update(
        &self,
        connection: &Self::Connection,
        view_id: &str,
        patch: stoneflow_usecase::view::UpdateViewPatch,
    ) -> Result<Option<stoneflow_usecase::view::ViewRecord>, stoneflow_usecase::UsecaseError> {
        let view = self
            .repository
            .update(
                connection,
                view_id,
                UpdateViewPatch {
                    name: patch.name,
                    description: patch.description,
                    filters: patch.filters,
                    sort: patch.sort,
                    group_by: patch.group_by,
                    is_visible: patch.is_visible,
                    sort_order: patch.sort_order,
                    updated_at: patch.updated_at,
                },
            )
            .await
            .map(|view| view.map(map_view_model_to_record))
            .map_err(|error| map_app_error(error.into()))?;

        if let Some(view) = view.as_ref() {
            let mutation_record = build_view_upsert_mutation_record(view).map_err(map_app_error)?;
            self.sync_repository
                .insert_pending_mutation(connection, &mutation_record)
                .await
                .map_err(|error| map_app_error(error.into()))?;
        }

        Ok(view)
    }

    async fn delete(
        &self,
        connection: &Self::Connection,
        view_id: &str,
    ) -> Result<u64, stoneflow_usecase::UsecaseError> {
        let current = self.get(view_id).await?;
        let affected = self
            .repository
            .delete(connection, view_id)
            .await
            .map_err(|error| map_app_error(error.into()))?;

        if affected > 0 {
            if let Some(current) = current.as_ref() {
                let mutation_record = build_view_delete_mutation_record(current).map_err(map_app_error)?;
                self.sync_repository
                    .insert_pending_mutation(connection, &mutation_record)
                    .await
                    .map_err(|error| map_app_error(error.into()))?;
            }
        }

        Ok(affected)
    }
}

#[derive(Debug, Serialize)]
struct ViewSyncPayload<'a> {
    id: &'a str,
    name: &'a str,
    description: Option<&'a str>,
    kind: stoneflow_domain::ViewKind,
    entity_type: stoneflow_domain::ViewEntityKind,
    key: Option<&'a str>,
    filters: &'a str,
    sort: &'a str,
    group_by: Option<&'a str>,
    is_visible: bool,
    sort_order: i32,
    created_at: &'a str,
    updated_at: &'a str,
}

impl<'a> From<&'a ViewRecord> for ViewSyncPayload<'a> {
    fn from(view: &'a ViewRecord) -> Self {
        Self {
            id: &view.id,
            name: &view.name,
            description: view.description.as_deref(),
            kind: view.kind,
            entity_type: view.entity_type,
            key: view.key.as_deref(),
            filters: &view.filters,
            sort: &view.sort,
            group_by: view.group_by.as_deref(),
            is_visible: view.is_visible,
            sort_order: view.sort_order,
            created_at: &view.created_at,
            updated_at: &view.updated_at,
        }
    }
}

fn build_view_upsert_mutation_record(
    view: &ViewRecord,
) -> Result<stoneflow_storage::repositories::SyncMutationRecord, AppError> {
    build_upsert_record("view", &view.id, &ViewSyncPayload::from(view), &view.updated_at)
}

fn build_view_delete_mutation_record(
    view: &ViewRecord,
) -> Result<stoneflow_storage::repositories::SyncMutationRecord, AppError> {
    build_delete_record("view", &view.id, &ViewSyncPayload::from(view), &view.updated_at)
}

#[derive(Debug, Clone)]
struct ViewTaskReaderAdapter {
    repository: TaskRepository,
}

impl ViewTaskReaderAdapter {
    fn new(repository: TaskRepository) -> Self {
        Self { repository }
    }
}

impl ViewTaskReader for ViewTaskReaderAdapter {
    async fn list_candidates(
        &self,
        space_id: Option<String>,
        placement: stoneflow_usecase::view::ViewTaskPlacementQuery,
        include_deleted: bool,
    ) -> Result<Vec<stoneflow_usecase::view::ViewTaskRecord>, stoneflow_usecase::UsecaseError> {
        self.repository
            .list_candidates(
                space_id,
                map_view_task_placement_to_repo(placement),
                include_deleted,
            )
            .await
            .map(|tasks| {
                tasks
                    .into_iter()
                    .map(map_task_model_to_view_task_record)
                    .collect()
            })
            .map_err(|error| map_app_error(error.into()))
    }
}

#[derive(Debug, Clone)]
struct ViewLookupReaderAdapter {
    space_repository: SpaceRepository,
    project_repository: ProjectRepository,
}

impl ViewLookupReaderAdapter {
    fn new(space_repository: SpaceRepository, project_repository: ProjectRepository) -> Self {
        Self {
            space_repository,
            project_repository,
        }
    }
}

impl ViewLookupReader for ViewLookupReaderAdapter {
    async fn list_spaces_by_ids(
        &self,
        space_ids: &[String],
    ) -> Result<Vec<stoneflow_usecase::view::ViewSpaceLookupRecord>, stoneflow_usecase::UsecaseError>
    {
        self.space_repository
            .list_by_ids(space_ids)
            .await
            .map(|spaces| {
                spaces
                    .into_iter()
                    .map(|space| stoneflow_usecase::view::ViewSpaceLookupRecord {
                        id: space.id,
                        name: space.name,
                    })
                    .collect()
            })
            .map_err(|error| map_app_error(error.into()))
    }

    async fn list_projects_by_ids(
        &self,
        project_ids: &[String],
    ) -> Result<
        Vec<stoneflow_usecase::view::ViewProjectLookupRecord>,
        stoneflow_usecase::UsecaseError,
    > {
        self.project_repository
            .list_by_ids(project_ids)
            .await
            .map(|projects| {
                projects
                    .into_iter()
                    .map(|project| stoneflow_usecase::view::ViewProjectLookupRecord {
                        id: project.id,
                        name: project.name,
                    })
                    .collect()
            })
            .map_err(|error| map_app_error(error.into()))
    }
}

fn map_view_task_placement_to_repo(
    placement: stoneflow_usecase::view::ViewTaskPlacementQuery,
) -> TaskPlacementQuery {
    match placement {
        stoneflow_usecase::view::ViewTaskPlacementQuery::All => TaskPlacementQuery::All,
        stoneflow_usecase::view::ViewTaskPlacementQuery::Project(project_id) => {
            TaskPlacementQuery::Project(project_id)
        }
        stoneflow_usecase::view::ViewTaskPlacementQuery::Inbox => TaskPlacementQuery::Inbox,
        stoneflow_usecase::view::ViewTaskPlacementQuery::NoProject => TaskPlacementQuery::NoProject,
    }
}

fn map_db_error(error: sea_orm::DbErr) -> stoneflow_usecase::UsecaseError {
    map_app_error(AppError::from(error))
}

fn map_app_error(error: AppError) -> stoneflow_usecase::UsecaseError {
    match error {
        AppError::Validation(message) => stoneflow_usecase::UsecaseError::validation(message),
        AppError::NotFound(message) => stoneflow_usecase::UsecaseError::not_found(message),
        AppError::Conflict(message) => stoneflow_usecase::UsecaseError::conflict(message),
        AppError::Database(message) => stoneflow_usecase::UsecaseError::storage(message),
        AppError::Initialization(message) => {
            stoneflow_usecase::UsecaseError::initialization(message)
        }
        AppError::DefaultSpaceUnavailable(message) => {
            stoneflow_usecase::UsecaseError::default_space_unavailable(message)
        }
        AppError::Internal(message)
        | AppError::Forbidden(message)
        | AppError::CaptureSpaceUnavailable(message)
        | AppError::CapturePersistence(message) => {
            stoneflow_usecase::UsecaseError::internal(message)
        }
    }
}

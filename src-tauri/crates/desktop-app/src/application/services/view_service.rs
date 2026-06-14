//! View Service 兼容壳：真源在 `stoneflow-usecase`。

use sea_orm::TransactionTrait;
use stoneflow_usecase::{
    activity::ActivityService as ActivityUsecase,
    view::{
        ViewLookupReader, ViewPersistence, ViewService as ViewUsecase, ViewTaskReader,
    },
};

use crate::{
    app::error::AppError,
    application::activity::ActivityPersistenceAdapter,
    infrastructure::{
        mappers::{
            map_task_model_to_view_task_record, map_view_model_to_record,
            view_entity_kind_to_schema, view_kind_to_schema,
        },
        repositories::{
            CreateViewRecord, ProjectRepository, SpaceRepository, TaskPlacementQuery,
            TaskRepository, UpdateViewPatch, ViewListQuery, ViewRepository,
        },
    },
};

pub use stoneflow_usecase::view::{
    CreateViewInput, DeleteViewInput, ListViewsInput, ReorderViewsInput, RunProjectViewInput,
    RunTaskViewInput, RunTaskViewOutput, TaskViewGroupDto, ToggleViewVisibleInput,
    UpdateViewInput, ViewDto, ViewSortDirection, ViewSortRuleDto,
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
        space_repository: SpaceRepository,
        project_repository: ProjectRepository,
        task_repository: TaskRepository,
        activity_service: crate::application::activity::ActivityService,
    ) -> Self {
        let activity_repo = activity_service.repository().clone();
        Self {
            inner: ViewUsecase::new(
                ViewPersistenceAdapter::new(repository.clone()),
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
        self.inner.run_task_view(input).await.map_err(AppError::from)
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

    pub async fn reorder_views(
        &self,
        input: ReorderViewsInput,
    ) -> Result<Vec<ViewDto>, AppError> {
        self.inner
            .reorder_views(input)
            .await
            .map_err(AppError::from)
    }
}

#[derive(Debug, Clone)]
struct ViewPersistenceAdapter {
    repository: ViewRepository,
}

impl ViewPersistenceAdapter {
    fn new(repository: ViewRepository) -> Self {
        Self { repository }
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
            .map_err(map_app_error)
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
            .map_err(map_app_error)
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
            .map_err(map_app_error)
    }

    async fn next_sort_order(
        &self,
        connection: &Self::Connection,
        entity_type: stoneflow_domain::ViewEntityKind,
    ) -> Result<i32, stoneflow_usecase::UsecaseError> {
        self.repository
            .next_sort_order(connection, view_entity_kind_to_schema(entity_type))
            .await
            .map_err(map_app_error)
    }

    async fn create(
        &self,
        connection: &Self::Connection,
        record: stoneflow_usecase::view::CreateViewPersistenceRecord,
    ) -> Result<stoneflow_usecase::view::ViewRecord, stoneflow_usecase::UsecaseError> {
        self.repository
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
            .map_err(map_app_error)
    }

    async fn update(
        &self,
        connection: &Self::Connection,
        view_id: &str,
        patch: stoneflow_usecase::view::UpdateViewPatch,
    ) -> Result<Option<stoneflow_usecase::view::ViewRecord>, stoneflow_usecase::UsecaseError> {
        self.repository
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
            .map_err(map_app_error)
    }

    async fn delete(
        &self,
        connection: &Self::Connection,
        view_id: &str,
    ) -> Result<u64, stoneflow_usecase::UsecaseError> {
        self.repository
            .delete(connection, view_id)
            .await
            .map_err(map_app_error)
    }
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
            .map(|tasks| tasks.into_iter().map(map_task_model_to_view_task_record).collect())
            .map_err(map_app_error)
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
    ) -> Result<
        Vec<stoneflow_usecase::view::ViewSpaceLookupRecord>,
        stoneflow_usecase::UsecaseError,
    > {
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
            .map_err(map_app_error)
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
            .map_err(map_app_error)
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

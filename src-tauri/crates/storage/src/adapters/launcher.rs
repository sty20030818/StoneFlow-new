//! Launcher ports 的 SQLite 实现与 application service 工厂。

use std::collections::{HashMap, HashSet};

use sea_orm::{ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, QueryOrder, QuerySelect};
use stoneflow_application::launcher::{
    LauncherPorts, LauncherProjectItemDto, LauncherService, LauncherSidebarProjectDto,
    LauncherSpaceSummaryDto, LauncherTaskDetail, LauncherTaskItemDto,
};
use stoneflow_application::launcher_context::LauncherContextService;
use stoneflow_application::ApplicationError;
use stoneflow_domain::LauncherSpaceCandidate;

use crate::adapters::error::from_storage;
use crate::entities::prelude::{Project, Space, Task};
use crate::entities::{project, space, task};
use crate::mappers::work_status_to_domain;
use crate::repositories::{ProjectRepository, SpaceRepository, TaskRepository};

/// 已装配的 Launcher 业务服务。
pub type LauncherAppService = LauncherService<LauncherPortsAdapter>;

/// 已装配的 Launcher 初始态服务。
pub type LauncherContextAppService = LauncherContextService<LauncherPortsAdapter>;

/// 从数据库连接构造 Launcher 业务服务。
pub fn build_launcher_service(connection: DatabaseConnection) -> LauncherAppService {
    LauncherService::new(LauncherPortsAdapter::new(connection))
}

/// 从数据库连接构造 Launcher 初始态服务。
pub fn build_launcher_context_service(connection: DatabaseConnection) -> LauncherContextAppService {
    LauncherContextService::new(LauncherPortsAdapter::new(connection))
}

/// Launcher 跨聚合读取 adapter。
#[derive(Debug, Clone)]
pub struct LauncherPortsAdapter {
    spaces: SpaceRepository,
    projects: ProjectRepository,
    tasks: TaskRepository,
    db: DatabaseConnection,
}

impl LauncherPortsAdapter {
    pub fn new(connection: DatabaseConnection) -> Self {
        Self {
            spaces: SpaceRepository::new(connection.clone()),
            projects: ProjectRepository::new(connection.clone()),
            tasks: TaskRepository::new(connection.clone()),
            db: connection,
        }
    }
}

impl LauncherPorts for LauncherPortsAdapter {
    async fn list_visible_spaces(&self) -> Result<Vec<LauncherSpaceSummaryDto>, ApplicationError> {
        self.spaces
            .list_visible()
            .await
            .map(|rows| {
                rows.into_iter()
                    .map(|space| LauncherSpaceSummaryDto {
                        id: space.id,
                        name: space.name,
                        icon_key: space.icon_key,
                        color_key: space.color_key,
                        is_default: space.is_default,
                    })
                    .collect()
            })
            .map_err(from_storage)
    }

    async fn list_space_candidates(&self) -> Result<Vec<LauncherSpaceCandidate>, ApplicationError> {
        self.spaces
            .list_visible()
            .await
            .map(|rows| {
                rows.into_iter()
                    .map(|space| LauncherSpaceCandidate {
                        id: space.id,
                        is_default: space.is_default,
                    })
                    .collect()
            })
            .map_err(from_storage)
    }

    async fn get_space(
        &self,
        space_id: &str,
    ) -> Result<Option<LauncherSpaceCandidate>, ApplicationError> {
        self.spaces
            .get(space_id)
            .await
            .map(|row| {
                row.filter(|space| space.archived_at.is_none() && space.deleted_at.is_none())
                    .map(|space| LauncherSpaceCandidate {
                        id: space.id,
                        is_default: space.is_default,
                    })
            })
            .map_err(from_storage)
    }

    async fn list_sidebar_projects_for_space(
        &self,
        space_id: &str,
    ) -> Result<Vec<LauncherSidebarProjectDto>, ApplicationError> {
        self.projects
            .list_visible(Some(space_id), false)
            .await
            .map(|rows| {
                rows.into_iter()
                    .map(|project| LauncherSidebarProjectDto {
                        id: project.id,
                        space_id: project.space_id,
                        name: project.name,
                    })
                    .collect()
            })
            .map_err(from_storage)
    }

    async fn get_task_detail(&self, task_id: &str) -> Result<LauncherTaskDetail, ApplicationError> {
        let task = self
            .tasks
            .get(task_id)
            .await
            .map_err(from_storage)?
            .filter(|task| task.archived_at.is_none() && task.deleted_at.is_none())
            .ok_or_else(|| ApplicationError::not_found("Task 不存在"))?;

        Ok(LauncherTaskDetail {
            id: task.id,
            space_id: task.space_id,
            project_id: task.project_id,
            title: task.title,
            note: task.note,
            due_at: task.due_at,
            scheduled_at: task.planned_at,
            reminder_at: task.remind_at,
        })
    }

    async fn get_project_space_id(&self, project_id: &str) -> Result<String, ApplicationError> {
        self.projects
            .get(project_id)
            .await
            .map_err(from_storage)?
            .filter(|project| project.archived_at.is_none() && project.deleted_at.is_none())
            .map(|project| project.space_id)
            .ok_or_else(|| ApplicationError::not_found("Project 不存在"))
    }

    async fn list_recent_tasks(
        &self,
        limit: usize,
    ) -> Result<Vec<LauncherTaskItemDto>, ApplicationError> {
        let rows = Task::find()
            .filter(task::Column::ArchivedAt.is_null())
            .filter(task::Column::DeletedAt.is_null())
            .order_by_desc(task::Column::UpdatedAt)
            .order_by_desc(task::Column::CreatedAt)
            .limit(limit as u64)
            .all(&self.db)
            .await
            .map_err(|error| ApplicationError::storage(error.to_string()))?;

        let space_names =
            load_space_names(&self.db, rows.iter().map(|row| row.space_id.clone())).await?;
        let project_names = load_project_names(
            &self.db,
            rows.iter().filter_map(|row| row.project_id.clone()),
        )
        .await?;

        Ok(rows
            .into_iter()
            .map(|row| LauncherTaskItemDto {
                id: row.id,
                space_name: space_names
                    .get(&row.space_id)
                    .cloned()
                    .unwrap_or_else(|| row.space_id.clone()),
                project_name: row
                    .project_id
                    .as_ref()
                    .and_then(|project_id| project_names.get(project_id).cloned()),
                space_id: row.space_id,
                project_id: row.project_id,
                title: row.title,
                note: row.note,
                priority: row.priority,
                status: work_status_to_domain(row.status).as_str().to_owned(),
                updated_at: row.updated_at,
                completed_at: row.completed_at,
            })
            .collect())
    }

    async fn list_recent_projects(
        &self,
        limit: usize,
    ) -> Result<Vec<LauncherProjectItemDto>, ApplicationError> {
        let rows = Project::find()
            .filter(project::Column::ArchivedAt.is_null())
            .filter(project::Column::DeletedAt.is_null())
            .order_by_desc(project::Column::UpdatedAt)
            .order_by_desc(project::Column::CreatedAt)
            .limit(limit as u64)
            .all(&self.db)
            .await
            .map_err(|error| ApplicationError::storage(error.to_string()))?;

        let space_names =
            load_space_names(&self.db, rows.iter().map(|row| row.space_id.clone())).await?;

        Ok(rows
            .into_iter()
            .map(|row| LauncherProjectItemDto {
                id: row.id,
                space_name: space_names
                    .get(&row.space_id)
                    .cloned()
                    .unwrap_or_else(|| row.space_id.clone()),
                space_id: row.space_id,
                name: row.name,
                note: row.description,
                updated_at: row.updated_at,
                completed_at: row.completed_at,
            })
            .collect())
    }
}

async fn load_space_names(
    db: &DatabaseConnection,
    ids: impl IntoIterator<Item = String>,
) -> Result<HashMap<String, String>, ApplicationError> {
    let ids = ids
        .into_iter()
        .collect::<HashSet<_>>()
        .into_iter()
        .collect::<Vec<_>>();
    if ids.is_empty() {
        return Ok(HashMap::new());
    }

    Space::find()
        .filter(space::Column::Id.is_in(ids))
        .all(db)
        .await
        .map(|spaces| {
            spaces
                .into_iter()
                .map(|space| (space.id, space.name))
                .collect()
        })
        .map_err(|error| ApplicationError::storage(error.to_string()))
}

async fn load_project_names(
    db: &DatabaseConnection,
    ids: impl IntoIterator<Item = String>,
) -> Result<HashMap<String, String>, ApplicationError> {
    let ids = ids
        .into_iter()
        .collect::<HashSet<_>>()
        .into_iter()
        .collect::<Vec<_>>();
    if ids.is_empty() {
        return Ok(HashMap::new());
    }

    Project::find()
        .filter(project::Column::Id.is_in(ids))
        .all(db)
        .await
        .map(|projects| {
            projects
                .into_iter()
                .map(|project| (project.id, project.name))
                .collect()
        })
        .map_err(|error| ApplicationError::storage(error.to_string()))
}

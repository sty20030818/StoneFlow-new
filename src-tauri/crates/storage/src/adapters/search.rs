//! Search ports 实现与 application service 工厂。

use sea_orm::{ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, QueryOrder};
use stoneflow_application::search::{
    ProjectSearchLifecycle, SearchProjectReader, SearchProjectRecord, SearchService,
    SearchSpaceReader, SearchSpaceRecord, SearchTaskReader, SearchTaskRecord, TaskSearchLifecycle,
};
use stoneflow_application::ApplicationError;
use stoneflow_domain::WorkStatus;

use crate::adapters::error::from_display;
use crate::entities::prelude::{Project, Space, Task};
use crate::entities::{project, space, task};
use crate::mappers::work_status_to_domain;

/// 已装配的 Search application service。
pub type SearchAppService =
    SearchService<SearchPortsAdapter, SearchPortsAdapter, SearchPortsAdapter>;

/// 从数据库连接构造 Search 用例。
pub fn build_search_service(connection: DatabaseConnection) -> SearchAppService {
    let adapter = SearchPortsAdapter { db: connection };
    SearchService::new(adapter.clone(), adapter.clone(), adapter)
}

/// Search 跨表读取 adapter。
#[derive(Debug, Clone)]
pub struct SearchPortsAdapter {
    db: DatabaseConnection,
}

impl SearchSpaceReader for SearchPortsAdapter {
    async fn list_visible_spaces(&self) -> Result<Vec<SearchSpaceRecord>, ApplicationError> {
        Space::find()
            .filter(space::Column::ArchivedAt.is_null())
            .filter(space::Column::DeletedAt.is_null())
            .order_by_asc(space::Column::Position)
            .all(&self.db)
            .await
            .map(|rows| {
                rows.into_iter()
                    .map(|row| SearchSpaceRecord {
                        id: row.id,
                        name: row.name,
                    })
                    .collect()
            })
            .map_err(from_display)
    }
}

impl SearchProjectReader for SearchPortsAdapter {
    async fn search_projects(
        &self,
        query: &str,
        lifecycle: ProjectSearchLifecycle,
    ) -> Result<Vec<SearchProjectRecord>, ApplicationError> {
        let needle = query.to_lowercase();
        let mut rows = Project::find()
            .filter(project::Column::ArchivedAt.is_null())
            .filter(project::Column::DeletedAt.is_null())
            .order_by_desc(project::Column::UpdatedAt)
            .all(&self.db)
            .await
            .map_err(from_display)?;

        rows.retain(|row| match lifecycle {
            ProjectSearchLifecycle::Active => row.completed_at.is_none(),
            ProjectSearchLifecycle::Completed => row.completed_at.is_some(),
        });
        rows.retain(|row| {
            row.name.to_lowercase().contains(&needle)
                || row
                    .description
                    .as_ref()
                    .is_some_and(|note| note.to_lowercase().contains(&needle))
        });

        Ok(rows
            .into_iter()
            .map(|row| SearchProjectRecord {
                id: row.id,
                space_id: row.space_id,
                name: row.name,
                note: row.description,
                updated_at: row.updated_at,
                completed_at: row.completed_at,
            })
            .collect())
    }
}

impl SearchTaskReader for SearchPortsAdapter {
    async fn search_tasks(
        &self,
        query: &str,
        lifecycle: TaskSearchLifecycle,
    ) -> Result<Vec<SearchTaskRecord>, ApplicationError> {
        let needle = query.to_lowercase();
        let mut rows = Task::find()
            .filter(task::Column::ArchivedAt.is_null())
            .filter(task::Column::DeletedAt.is_null())
            .order_by_desc(task::Column::UpdatedAt)
            .all(&self.db)
            .await
            .map_err(from_display)?;

        rows.retain(|row| {
            let status = work_status_to_domain(row.status);
            match lifecycle {
                TaskSearchLifecycle::Active => {
                    !matches!(status, WorkStatus::Done | WorkStatus::Canceled)
                }
                TaskSearchLifecycle::Closed => {
                    matches!(status, WorkStatus::Done | WorkStatus::Canceled)
                }
            }
        });
        rows.retain(|row| {
            row.title.to_lowercase().contains(&needle)
                || row
                    .note
                    .as_ref()
                    .is_some_and(|note| note.to_lowercase().contains(&needle))
        });

        Ok(rows
            .into_iter()
            .map(|row| SearchTaskRecord {
                id: row.id,
                space_id: row.space_id,
                project_id: row.project_id,
                title: row.title,
                note: row.note,
                priority: row.priority,
                status: work_status_to_domain(row.status),
                updated_at: row.updated_at,
                completed_at: row.completed_at,
            })
            .collect())
    }

    async fn list_projects_by_ids(
        &self,
        project_ids: &[String],
    ) -> Result<Vec<SearchProjectRecord>, ApplicationError> {
        if project_ids.is_empty() {
            return Ok(Vec::new());
        }
        Project::find()
            .filter(project::Column::Id.is_in(project_ids.iter().cloned()))
            .all(&self.db)
            .await
            .map(|rows| {
                rows.into_iter()
                    .map(|row| SearchProjectRecord {
                        id: row.id,
                        space_id: row.space_id,
                        name: row.name,
                        note: row.description,
                        updated_at: row.updated_at,
                        completed_at: row.completed_at,
                    })
                    .collect()
            })
            .map_err(from_display)
    }
}

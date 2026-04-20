//! 全局搜索用例，负责在当前 Space 内聚合 Task / Project 结果。

use anyhow::Result;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::application::create::{normalize_required_text, resolve_active_space};
use crate::infrastructure::{
    database::DatabaseState,
    repositories::{ProjectRepository, SpaceRepository, TaskRepository},
};

/// 查询当前 Space 的全局搜索输入。
#[derive(Debug, Clone, Deserialize)]
pub(crate) struct SearchWorkspaceInput {
    pub(crate) space_slug: String,
    pub(crate) query: String,
    pub(crate) limit: u64,
}

/// Task 搜索结果的最小载荷。
#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub(crate) struct WorkspaceTaskSearchItemPayload {
    pub(crate) id: Uuid,
    pub(crate) title: String,
    pub(crate) note: Option<String>,
    pub(crate) priority: Option<String>,
    pub(crate) project_id: Option<Uuid>,
    pub(crate) project_name: Option<String>,
    pub(crate) updated_at: DateTime<Utc>,
}

/// Project 搜索结果的最小载荷。
#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub(crate) struct WorkspaceProjectSearchItemPayload {
    pub(crate) id: Uuid,
    pub(crate) name: String,
    pub(crate) note: Option<String>,
    pub(crate) status: String,
    pub(crate) sort_order: i32,
}

/// Header 全局搜索结果。
#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub(crate) struct WorkspaceSearchPayload {
    pub(crate) tasks: Vec<WorkspaceTaskSearchItemPayload>,
    pub(crate) projects: Vec<WorkspaceProjectSearchItemPayload>,
}

/// 搜索当前 Space 的 Task 与 Project。
pub(crate) async fn search_workspace(
    database: &DatabaseState,
    input: SearchWorkspaceInput,
) -> Result<WorkspaceSearchPayload> {
    let space_repository = SpaceRepository::new(&database.connection);
    let project_repository = ProjectRepository::new(&database.connection);
    let task_repository = TaskRepository::new(&database.connection);

    let space_slug = normalize_required_text(&input.space_slug, "space slug")?;
    let query = input.query.trim().to_owned();
    let limit = normalize_search_limit(input.limit);

    if query.is_empty() {
        return Ok(WorkspaceSearchPayload {
            tasks: Vec::new(),
            projects: Vec::new(),
        });
    }

    let space = resolve_active_space(&space_repository, &space_slug).await?;
    let fetch_limit = limit.saturating_mul(5);
    let all_projects = project_repository.list_active_by_space(space.id).await?;
    let projects = project_repository
        .search_active_by_space(space.id, &query, fetch_limit)
        .await?;
    let tasks = task_repository
        .search_active_by_space(space.id, &query, fetch_limit)
        .await?;

    // 这里直接持有 String，避免 IDE 对借用生命周期做出误判。
    let project_name_by_id = all_projects
        .into_iter()
        .map(|project| (project.id, project.name))
        .collect::<std::collections::HashMap<_, _>>();
    let lowercase_query = query.to_lowercase();

    let mut task_results = tasks
        .into_iter()
        .map(|task| {
            let rank = calculate_search_rank(&task.title, task.note.as_deref(), &lowercase_query);

            (rank, task)
        })
        .collect::<Vec<_>>();
    task_results.sort_by(|(left_rank, left_task), (right_rank, right_task)| {
        left_rank
            .cmp(right_rank)
            .then_with(|| right_task.updated_at.cmp(&left_task.updated_at))
    });

    let mut project_results = projects
        .into_iter()
        .map(|project| {
            let rank =
                calculate_search_rank(&project.name, project.note.as_deref(), &lowercase_query);

            (rank, project)
        })
        .collect::<Vec<_>>();
    project_results.sort_by(|(left_rank, left_project), (right_rank, right_project)| {
        left_rank
            .cmp(right_rank)
            .then_with(|| left_project.sort_order.cmp(&right_project.sort_order))
    });

    Ok(WorkspaceSearchPayload {
        tasks: task_results
            .into_iter()
            .take(limit as usize)
            .map(|(_, task)| WorkspaceTaskSearchItemPayload {
                id: task.id,
                title: task.title,
                note: task.note,
                priority: task.priority,
                project_id: task.project_id,
                project_name: task
                    .project_id
                    .and_then(|project_id| project_name_by_id.get(&project_id).cloned()),
                updated_at: task.updated_at,
            })
            .collect(),
        projects: project_results
            .into_iter()
            .take(limit as usize)
            .map(|(_, project)| WorkspaceProjectSearchItemPayload {
                id: project.id,
                name: project.name,
                note: project.note,
                status: project.status,
                sort_order: project.sort_order,
            })
            .collect(),
    })
}

fn normalize_search_limit(value: u64) -> u64 {
    value.clamp(1, 8)
}

fn calculate_search_rank(title: &str, note: Option<&str>, query: &str) -> SearchRank {
    if let Some(position) = find_match_position(title, query) {
        return SearchRank {
            field_rank: 0,
            position_rank: u8::from(position != 0),
            position,
        };
    }

    if let Some(position) = note.and_then(|value| find_match_position(value, query)) {
        return SearchRank {
            field_rank: 1,
            position_rank: u8::from(position != 0),
            position,
        };
    }

    SearchRank {
        field_rank: u8::MAX,
        position_rank: u8::MAX,
        position: usize::MAX,
    }
}

fn find_match_position(value: &str, query: &str) -> Option<usize> {
    value.to_lowercase().find(query)
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
struct SearchRank {
    field_rank: u8,
    position_rank: u8,
    position: usize,
}

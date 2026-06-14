//! Search Service：跨 Task / Project 的全局实体搜索编排。

use std::cmp::Ordering;
use std::collections::HashMap;

use serde::{Deserialize, Serialize};
use stoneflow_schema::{project, space, task};

use crate::{
    app::error::AppError,
    domain::normalize_slug,
    infrastructure::repositories::{
        ProjectRepository, ProjectSearchLifecycle, SpaceRepository, TaskRepository,
        TaskSearchLifecycle,
    },
};

const DEFAULT_LIMIT_PER_SECTION: usize = 5;

/// 全局搜索输入。
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchEntitiesInput {
    pub query: String,
    pub limit_per_section: Option<u64>,
}

/// Task 搜索结果载荷。
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchTaskItemDto {
    pub id: String,
    pub space_id: String,
    pub space_name: String,
    pub space_slug: String,
    pub project_id: Option<String>,
    pub project_name: Option<String>,
    pub inbox_at: Option<String>,
    pub title: String,
    pub note: Option<String>,
    pub priority: i32,
    pub status: stoneflow_schema::common::TaskStatus,
    pub updated_at: String,
    pub completed_at: Option<String>,
}

/// Project 搜索结果载荷。
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchProjectItemDto {
    pub id: String,
    pub space_id: String,
    pub space_name: String,
    pub space_slug: String,
    pub name: String,
    pub note: Option<String>,
    pub updated_at: String,
    pub completed_at: Option<String>,
}

/// 全局搜索结果。
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchEntitiesResultDto {
    pub tasks: Vec<SearchTaskItemDto>,
    pub projects: Vec<SearchProjectItemDto>,
    pub completed_tasks: Vec<SearchTaskItemDto>,
    pub completed_projects: Vec<SearchProjectItemDto>,
}

#[derive(Debug, Clone)]
pub struct SearchService {
    space_repository: SpaceRepository,
    project_repository: ProjectRepository,
    task_repository: TaskRepository,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
enum SearchMatchTier {
    PrimaryPrefix,
    PrimaryContains,
    SecondaryContains,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
enum TaskSearchStatusRank {
    Doing,
    Todo,
    Waiting,
    Done,
    Canceled,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
enum ProjectSearchStatusRank {
    Active,
    Completed,
}

impl SearchService {
    pub fn new(
        space_repository: SpaceRepository,
        project_repository: ProjectRepository,
        task_repository: TaskRepository,
    ) -> Self {
        Self {
            space_repository,
            project_repository,
            task_repository,
        }
    }

    pub async fn search_entities(
        &self,
        input: SearchEntitiesInput,
    ) -> Result<SearchEntitiesResultDto, AppError> {
        let query = input.query.trim().to_owned();
        if query.is_empty() {
            return Ok(SearchEntitiesResultDto {
                tasks: Vec::new(),
                projects: Vec::new(),
                completed_tasks: Vec::new(),
                completed_projects: Vec::new(),
            });
        }

        let limit_per_section = input
            .limit_per_section
            .unwrap_or(DEFAULT_LIMIT_PER_SECTION as u64)
            .max(1) as usize;
        let active_tasks = self
            .task_repository
            .search_by_query(&query, TaskSearchLifecycle::Active)
            .await?;
        let active_projects = self
            .project_repository
            .search_by_query(&query, ProjectSearchLifecycle::Active)
            .await?;
        let completed_tasks = self
            .task_repository
            .search_by_query(&query, TaskSearchLifecycle::Closed)
            .await?;
        let completed_projects = self
            .project_repository
            .search_by_query(&query, ProjectSearchLifecycle::Completed)
            .await?;
        let visible_spaces = self.space_repository.list_visible().await?;
        let space_map: HashMap<String, space::Model> = visible_spaces
            .into_iter()
            .map(|space| (space.id.clone(), space))
            .collect();

        Ok(SearchEntitiesResultDto {
            tasks: self
                .build_task_items(active_tasks, &space_map, &query, limit_per_section)
                .await?,
            projects: self.build_project_items(
                active_projects,
                &space_map,
                &query,
                limit_per_section,
            ),
            completed_tasks: self
                .build_task_items(completed_tasks, &space_map, &query, limit_per_section)
                .await?,
            completed_projects: self.build_project_items(
                completed_projects,
                &space_map,
                &query,
                limit_per_section,
            ),
        })
    }

    async fn build_task_items(
        &self,
        tasks: Vec<task::Model>,
        space_map: &HashMap<String, space::Model>,
        query: &str,
        limit_per_section: usize,
    ) -> Result<Vec<SearchTaskItemDto>, AppError> {
        let project_ids: Vec<String> = tasks
            .iter()
            .filter_map(|task| task.project_id.clone())
            .collect();
        let project_map: HashMap<String, project::Model> = self
            .project_repository
            .list_by_ids(&project_ids)
            .await?
            .into_iter()
            .map(|project| (project.id.clone(), project))
            .collect();

        let mut ranked_items: Vec<(TaskSearchStatusRank, SearchMatchTier, SearchTaskItemDto)> = tasks
            .into_iter()
            .filter_map(|item| {
                let match_tier = classify_match(&item.title, item.note.as_deref(), query)?;
                let status_rank = classify_task_status(item.status);
                let (space_name, space_slug) = space_map
                    .get(&item.space_id)
                    .map(|space| (space.name.clone(), normalize_slug(&space.name)))
                    .unwrap_or_else(|| (item.space_id.clone(), "unknown".to_owned()));
                let project_name = item
                    .project_id
                    .as_ref()
                    .and_then(|project_id| project_map.get(project_id))
                    .map(|project| project.name.clone());

                Some((
                    status_rank,
                    match_tier,
                    SearchTaskItemDto {
                        id: item.id,
                        space_id: item.space_id,
                        space_name,
                        space_slug,
                        project_id: item.project_id,
                        project_name,
                        inbox_at: item.inbox_at,
                        title: item.title,
                        note: item.note,
                        priority: item.priority,
                        status: item.status,
                        updated_at: item.updated_at,
                        completed_at: item.completed_at,
                    },
                ))
            })
            .collect();

        ranked_items.sort_by(|left, right| {
            compare_ranked_search_item(
                left.0,
                left.1,
                &left.2.updated_at,
                right.0,
                right.1,
                &right.2.updated_at,
            )
        });

        Ok(ranked_items
            .into_iter()
            .map(|(_, _, item)| item)
            .take(limit_per_section)
            .collect())
    }

    fn build_project_items(
        &self,
        projects: Vec<project::Model>,
        space_map: &HashMap<String, space::Model>,
        query: &str,
        limit_per_section: usize,
    ) -> Vec<SearchProjectItemDto> {
        let mut ranked_items: Vec<(ProjectSearchStatusRank, SearchMatchTier, SearchProjectItemDto)> =
            projects
            .into_iter()
            .filter_map(|item| {
                let match_tier = classify_match(&item.name, item.description.as_deref(), query)?;
                let status_rank = classify_project_status(item.completed_at.as_ref());
                let (space_name, space_slug) = space_map
                    .get(&item.space_id)
                    .map(|space| (space.name.clone(), normalize_slug(&space.name)))
                    .unwrap_or_else(|| (item.space_id.clone(), "unknown".to_owned()));

                Some((
                    status_rank,
                    match_tier,
                    SearchProjectItemDto {
                        id: item.id,
                        space_id: item.space_id,
                        space_name,
                        space_slug,
                        name: item.name,
                        note: item.description,
                        updated_at: item.updated_at,
                        completed_at: item.completed_at,
                    },
                ))
            })
            .collect();

        ranked_items.sort_by(|left, right| {
            compare_ranked_search_item(
                left.0,
                left.1,
                &left.2.updated_at,
                right.0,
                right.1,
                &right.2.updated_at,
            )
        });

        ranked_items
            .into_iter()
            .map(|(_, _, item)| item)
            .take(limit_per_section)
            .collect()
    }
}

fn classify_match(primary: &str, secondary: Option<&str>, query: &str) -> Option<SearchMatchTier> {
    let normalized_query = query.to_lowercase();
    let normalized_primary = primary.to_lowercase();
    if normalized_primary.starts_with(&normalized_query) {
        return Some(SearchMatchTier::PrimaryPrefix);
    }
    if normalized_primary.contains(&normalized_query) {
        return Some(SearchMatchTier::PrimaryContains);
    }

    secondary.and_then(|value| {
        if value.to_lowercase().contains(&normalized_query) {
            Some(SearchMatchTier::SecondaryContains)
        } else {
            None
        }
    })
}

fn classify_task_status(status: stoneflow_schema::common::TaskStatus) -> TaskSearchStatusRank {
    match status {
        stoneflow_schema::common::TaskStatus::Doing => TaskSearchStatusRank::Doing,
        stoneflow_schema::common::TaskStatus::Todo => TaskSearchStatusRank::Todo,
        stoneflow_schema::common::TaskStatus::Waiting => TaskSearchStatusRank::Waiting,
        stoneflow_schema::common::TaskStatus::Done => TaskSearchStatusRank::Done,
        stoneflow_schema::common::TaskStatus::Canceled => TaskSearchStatusRank::Canceled,
    }
}

fn classify_project_status(completed_at: Option<&String>) -> ProjectSearchStatusRank {
    if completed_at.is_some() {
        ProjectSearchStatusRank::Completed
    } else {
        ProjectSearchStatusRank::Active
    }
}

fn compare_ranked_search_item<StatusRank>(
    left_status_rank: StatusRank,
    left_tier: SearchMatchTier,
    left_updated_at: &str,
    right_status_rank: StatusRank,
    right_tier: SearchMatchTier,
    right_updated_at: &str,
) -> Ordering
where
    StatusRank: Ord,
{
    left_status_rank
        .cmp(&right_status_rank)
        .then_with(|| left_tier
        .cmp(&right_tier)
        .then_with(|| right_updated_at.cmp(left_updated_at)))
}

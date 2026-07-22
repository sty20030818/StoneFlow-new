//! 全局搜索用例：跨 Task / Project 的读模型编排。

#![allow(async_fn_in_trait)]

use std::cmp::Ordering;
use std::collections::HashMap;

use serde::{Deserialize, Serialize};
use stoneflow_domain::{normalize_slug, TaskStatus};

use crate::ApplicationError;

const DEFAULT_LIMIT_PER_SECTION: usize = 5;

/// Space 搜索辅助记录。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SearchSpaceRecord {
    pub id: String,
    pub name: String,
}

/// Project 搜索辅助记录。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SearchProjectRecord {
    pub id: String,
    pub space_id: String,
    pub name: String,
    pub note: Option<String>,
    pub updated_at: String,
    pub completed_at: Option<String>,
}

/// Task 搜索辅助记录。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SearchTaskRecord {
    pub id: String,
    pub space_id: String,
    pub project_id: Option<String>,
    pub inbox_at: Option<String>,
    pub title: String,
    pub note: Option<String>,
    pub priority: i32,
    pub status: TaskStatus,
    pub updated_at: String,
    pub completed_at: Option<String>,
}

/// Project 搜索生命周期过滤。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ProjectSearchLifecycle {
    Active,
    Completed,
}

/// Task 搜索生命周期过滤。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TaskSearchLifecycle {
    Active,
    Closed,
}

/// Space 搜索读取 port。
pub trait SearchSpaceReader {
    async fn list_visible_spaces(&self) -> Result<Vec<SearchSpaceRecord>, ApplicationError>;
}

/// Project 搜索读取 port。
pub trait SearchProjectReader {
    async fn search_projects(
        &self,
        query: &str,
        lifecycle: ProjectSearchLifecycle,
    ) -> Result<Vec<SearchProjectRecord>, ApplicationError>;
}

/// Task 搜索读取 port。
pub trait SearchTaskReader {
    async fn search_tasks(
        &self,
        query: &str,
        lifecycle: TaskSearchLifecycle,
    ) -> Result<Vec<SearchTaskRecord>, ApplicationError>;

    async fn list_projects_by_ids(
        &self,
        project_ids: &[String],
    ) -> Result<Vec<SearchProjectRecord>, ApplicationError>;
}

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
    pub status: TaskStatus,
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

/// 全局搜索用例。
#[derive(Debug, Clone)]
pub struct SearchService<S, P, T> {
    space_reader: S,
    project_reader: P,
    task_reader: T,
}

impl<S, P, T> SearchService<S, P, T> {
    pub fn new(space_reader: S, project_reader: P, task_reader: T) -> Self {
        Self {
            space_reader,
            project_reader,
            task_reader,
        }
    }
}

impl<S, P, T> SearchService<S, P, T>
where
    S: SearchSpaceReader,
    P: SearchProjectReader,
    T: SearchTaskReader,
{
    pub async fn search_entities(
        &self,
        input: SearchEntitiesInput,
    ) -> Result<SearchEntitiesResultDto, ApplicationError> {
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
            .task_reader
            .search_tasks(&query, TaskSearchLifecycle::Active)
            .await?;
        let active_projects = self
            .project_reader
            .search_projects(&query, ProjectSearchLifecycle::Active)
            .await?;
        let completed_tasks = self
            .task_reader
            .search_tasks(&query, TaskSearchLifecycle::Closed)
            .await?;
        let completed_projects = self
            .project_reader
            .search_projects(&query, ProjectSearchLifecycle::Completed)
            .await?;
        let visible_spaces = self.space_reader.list_visible_spaces().await?;
        let space_map: HashMap<String, SearchSpaceRecord> = visible_spaces
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
        tasks: Vec<SearchTaskRecord>,
        space_map: &HashMap<String, SearchSpaceRecord>,
        query: &str,
        limit_per_section: usize,
    ) -> Result<Vec<SearchTaskItemDto>, ApplicationError> {
        let project_ids: Vec<String> = tasks
            .iter()
            .filter_map(|task| task.project_id.clone())
            .collect();
        let project_map: HashMap<String, SearchProjectRecord> = self
            .task_reader
            .list_projects_by_ids(&project_ids)
            .await?
            .into_iter()
            .map(|project| (project.id.clone(), project))
            .collect();

        let mut ranked_items: Vec<(TaskSearchStatusRank, SearchMatchTier, SearchTaskItemDto)> =
            tasks
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
        projects: Vec<SearchProjectRecord>,
        space_map: &HashMap<String, SearchSpaceRecord>,
        query: &str,
        limit_per_section: usize,
    ) -> Vec<SearchProjectItemDto> {
        let mut ranked_items: Vec<(
            ProjectSearchStatusRank,
            SearchMatchTier,
            SearchProjectItemDto,
        )> = projects
            .into_iter()
            .filter_map(|item| {
                let match_tier = classify_match(&item.name, item.note.as_deref(), query)?;
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
                        note: item.note,
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

fn classify_task_status(status: TaskStatus) -> TaskSearchStatusRank {
    match status {
        TaskStatus::Doing => TaskSearchStatusRank::Doing,
        TaskStatus::Todo => TaskSearchStatusRank::Todo,
        TaskStatus::Waiting => TaskSearchStatusRank::Waiting,
        TaskStatus::Done => TaskSearchStatusRank::Done,
        TaskStatus::Canceled => TaskSearchStatusRank::Canceled,
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
        .then_with(|| left_tier.cmp(&right_tier))
        .then_with(|| right_updated_at.cmp(left_updated_at))
}

#[cfg(test)]
mod tests {
    use stoneflow_domain::TaskStatus;

    use super::{
        ProjectSearchLifecycle, SearchEntitiesInput, SearchProjectReader, SearchProjectRecord,
        SearchService, SearchSpaceReader, SearchSpaceRecord, SearchTaskItemDto, SearchTaskReader,
        SearchTaskRecord, TaskSearchLifecycle,
    };
    use crate::ApplicationError;

    #[derive(Debug, Clone)]
    struct FakeSpaceReader {
        spaces: Vec<SearchSpaceRecord>,
    }

    impl SearchSpaceReader for FakeSpaceReader {
        async fn list_visible_spaces(&self) -> Result<Vec<SearchSpaceRecord>, ApplicationError> {
            Ok(self.spaces.clone())
        }
    }

    #[derive(Debug, Clone)]
    struct FakeProjectReader {
        active: Vec<SearchProjectRecord>,
        completed: Vec<SearchProjectRecord>,
    }

    impl SearchProjectReader for FakeProjectReader {
        async fn search_projects(
            &self,
            _query: &str,
            lifecycle: ProjectSearchLifecycle,
        ) -> Result<Vec<SearchProjectRecord>, ApplicationError> {
            Ok(match lifecycle {
                ProjectSearchLifecycle::Active => self.active.clone(),
                ProjectSearchLifecycle::Completed => self.completed.clone(),
            })
        }
    }

    #[derive(Debug, Clone)]
    struct FakeTaskReader {
        active: Vec<SearchTaskRecord>,
        closed: Vec<SearchTaskRecord>,
        projects: Vec<SearchProjectRecord>,
    }

    impl SearchTaskReader for FakeTaskReader {
        async fn search_tasks(
            &self,
            _query: &str,
            lifecycle: TaskSearchLifecycle,
        ) -> Result<Vec<SearchTaskRecord>, ApplicationError> {
            Ok(match lifecycle {
                TaskSearchLifecycle::Active => self.active.clone(),
                TaskSearchLifecycle::Closed => self.closed.clone(),
            })
        }

        async fn list_projects_by_ids(
            &self,
            project_ids: &[String],
        ) -> Result<Vec<SearchProjectRecord>, ApplicationError> {
            Ok(self
                .projects
                .iter()
                .filter(|project| project_ids.iter().any(|id| id == &project.id))
                .cloned()
                .collect())
        }
    }

    fn build_service(
        active_tasks: Vec<SearchTaskRecord>,
        active_projects: Vec<SearchProjectRecord>,
    ) -> SearchService<FakeSpaceReader, FakeProjectReader, FakeTaskReader> {
        SearchService::new(
            FakeSpaceReader {
                spaces: vec![SearchSpaceRecord {
                    id: "space-1".to_owned(),
                    name: "Alpha Space".to_owned(),
                }],
            },
            FakeProjectReader {
                active: active_projects.clone(),
                completed: Vec::new(),
            },
            FakeTaskReader {
                active: active_tasks,
                closed: Vec::new(),
                projects: active_projects,
            },
        )
    }

    fn task(id: &str, title: &str, note: Option<&str>, updated_at: &str) -> SearchTaskRecord {
        SearchTaskRecord {
            id: id.to_owned(),
            space_id: "space-1".to_owned(),
            project_id: None,
            inbox_at: None,
            title: title.to_owned(),
            note: note.map(str::to_owned),
            priority: 0,
            status: TaskStatus::Todo,
            updated_at: updated_at.to_owned(),
            completed_at: None,
        }
    }

    #[tokio::test]
    async fn search_entities_should_return_empty_sections_for_blank_query() {
        let service = build_service(Vec::new(), Vec::new());

        let result = service
            .search_entities(SearchEntitiesInput {
                query: "   ".to_owned(),
                limit_per_section: None,
            })
            .await
            .expect("blank query should succeed");

        assert!(result.tasks.is_empty());
        assert!(result.projects.is_empty());
        assert!(result.completed_tasks.is_empty());
        assert!(result.completed_projects.is_empty());
    }

    #[tokio::test]
    async fn search_entities_should_rank_prefix_before_note_match() {
        let service = build_service(
            vec![
                task("task-1", "Alpha task", None, "2026-06-14T10:00:00Z"),
                task(
                    "task-2",
                    "Other title",
                    Some("contains alpha in note"),
                    "2026-06-14T11:00:00Z",
                ),
            ],
            Vec::new(),
        );

        let result = service
            .search_entities(SearchEntitiesInput {
                query: "alpha".to_owned(),
                limit_per_section: Some(5),
            })
            .await
            .expect("search should succeed");

        let task_ids = result
            .tasks
            .into_iter()
            .map(|item: SearchTaskItemDto| item.id)
            .collect::<Vec<_>>();

        assert_eq!(task_ids, vec!["task-1".to_owned(), "task-2".to_owned()]);
    }
}

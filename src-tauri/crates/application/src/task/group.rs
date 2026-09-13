//! 查询分组身份：窗口前缀与返回行使用同一业务分类。

use std::{cmp::Ordering, collections::HashMap};

use serde::{Deserialize, Serialize};
use stoneflow_domain::WorkStatus;

use crate::{
    view::{TaskViewContext, ViewDateBoundaries, ViewTaskRecord},
    ApplicationError,
};

use super::TaskQueryOrder;

pub const TASK_GROUP_STATUS_ORDER: [WorkStatus; 5] = [
    WorkStatus::Doing,
    WorkStatus::Todo,
    WorkStatus::Waiting,
    WorkStatus::Done,
    WorkStatus::Canceled,
];

pub fn task_status_rank(status: WorkStatus) -> i64 {
    TASK_GROUP_STATUS_ORDER
        .iter()
        .position(|candidate| *candidate == status)
        .expect("任务状态必须包含在固定业务顺序中") as i64
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TaskGroupBy {
    None,
    Status,
    Priority,
    Project,
    Due,
    Scheduled,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum TaskDateBucket {
    Overdue,
    Today,
    Tomorrow,
    ThisWeek,
    Later,
    None,
}

impl TaskDateBucket {
    pub const ALL: [Self; 6] = [
        Self::Overdue,
        Self::Today,
        Self::Tomorrow,
        Self::ThisWeek,
        Self::Later,
        Self::None,
    ];

    pub fn rank(self) -> i64 {
        match self {
            Self::Overdue => 0,
            Self::Today => 1,
            Self::Tomorrow => 2,
            Self::ThisWeek => 3,
            Self::Later => 4,
            Self::None => 5,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "lowercase", deny_unknown_fields)]
pub enum TaskQueryGroup {
    None,
    Status {
        status: WorkStatus,
    },
    Priority {
        priority: i32,
    },
    Project {
        #[serde(rename = "projectId")]
        project_id: Option<String>,
        #[serde(rename = "projectName")]
        project_name: Option<String>,
    },
    Due {
        bucket: TaskDateBucket,
    },
    Scheduled {
        bucket: TaskDateBucket,
    },
}

/// 仓储仅聚合非空叶路径；空候选由本模块补齐。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TaskGroupCount {
    pub group: TaskQueryGroup,
    pub sub_group: TaskQueryGroup,
    pub total_count: u64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskSubGroupSummary {
    pub group: TaskQueryGroup,
    pub total_count: u64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskGroupSummary {
    pub group: TaskQueryGroup,
    pub total_count: u64,
    pub sub_groups: Vec<TaskSubGroupSummary>,
}

pub fn build_task_group_summary(
    order: TaskQueryOrder,
    counts: Vec<TaskGroupCount>,
    projects: Vec<(String, String)>,
    context: &TaskViewContext,
) -> Vec<TaskGroupSummary> {
    let order = order.normalized();
    let mut grouped: HashMap<TaskQueryGroup, (u64, HashMap<TaskQueryGroup, u64>)> = HashMap::new();
    for count in counts {
        let (total, children) = grouped.entry(count.group).or_default();
        *total += count.total_count;
        if order.sub_group_by != TaskGroupBy::None {
            *children.entry(count.sub_group).or_default() += count.total_count;
        }
    }
    let candidates = if order.group_by == TaskGroupBy::Project {
        let mut candidates = projects
            .into_iter()
            .map(|(id, name)| TaskQueryGroup::Project {
                project_id: Some(id),
                project_name: Some(name),
            })
            .collect::<Vec<_>>();
        if !matches!(context, TaskViewContext::Project { .. }) {
            candidates.push(TaskQueryGroup::Project {
                project_id: None,
                project_name: None,
            });
        }
        candidates
    } else {
        order.group_by.finite_candidates()
    };
    for group in candidates {
        grouped.entry(group).or_default();
    }
    let mut summary = grouped
        .into_iter()
        .map(|(group, (total_count, mut children))| {
            if order.sub_group_by != TaskGroupBy::None {
                for child in order.sub_group_by.finite_candidates() {
                    children.entry(child).or_default();
                }
            }
            let mut sub_groups = children
                .into_iter()
                .map(|(group, total_count)| TaskSubGroupSummary { group, total_count })
                .collect::<Vec<_>>();
            sub_groups.sort_by(|left, right| compare_groups(&left.group, &right.group));
            TaskGroupSummary {
                group,
                total_count,
                sub_groups,
            }
        })
        .collect::<Vec<_>>();
    summary.sort_by(|left, right| compare_groups(&left.group, &right.group));
    summary
}

fn compare_groups(left: &TaskQueryGroup, right: &TaskQueryGroup) -> Ordering {
    match (left, right) {
        (TaskQueryGroup::Status { status: left }, TaskQueryGroup::Status { status: right }) => {
            task_status_rank(*left).cmp(&task_status_rank(*right))
        }
        (
            TaskQueryGroup::Priority { priority: left },
            TaskQueryGroup::Priority { priority: right },
        ) => right.cmp(left),
        (
            TaskQueryGroup::Project {
                project_id: left_id,
                project_name: left_name,
            },
            TaskQueryGroup::Project {
                project_id: right_id,
                project_name: right_name,
            },
        ) => left_id
            .is_none()
            .cmp(&right_id.is_none())
            .then_with(|| {
                left_name
                    .as_deref()
                    .unwrap_or_default()
                    .cmp(right_name.as_deref().unwrap_or_default())
            })
            .then_with(|| left_id.cmp(right_id)),
        (TaskQueryGroup::Due { bucket: left }, TaskQueryGroup::Due { bucket: right })
        | (
            TaskQueryGroup::Scheduled { bucket: left },
            TaskQueryGroup::Scheduled { bucket: right },
        ) => left.rank().cmp(&right.rank()),
        (TaskQueryGroup::None, TaskQueryGroup::None) => Ordering::Equal,
        _ => unreachable!("同一层只能使用同一分组维度"),
    }
}

impl TaskGroupBy {
    fn finite_candidates(self) -> Vec<TaskQueryGroup> {
        match self {
            Self::None => vec![TaskQueryGroup::None],
            Self::Status => TASK_GROUP_STATUS_ORDER
                .into_iter()
                .map(|status| TaskQueryGroup::Status { status })
                .collect(),
            Self::Priority => (0..=4)
                .rev()
                .map(|priority| TaskQueryGroup::Priority { priority })
                .collect(),
            Self::Due => TaskDateBucket::ALL
                .into_iter()
                .map(|bucket| TaskQueryGroup::Due { bucket })
                .collect(),
            Self::Scheduled => TaskDateBucket::ALL
                .into_iter()
                .map(|bucket| TaskQueryGroup::Scheduled { bucket })
                .collect(),
            Self::Project => vec![],
        }
    }

    pub fn resolve(
        self,
        task: &ViewTaskRecord,
        dates: &ViewDateBoundaries,
        project_name: Option<&str>,
    ) -> Result<TaskQueryGroup, ApplicationError> {
        Ok(match self {
            Self::None => TaskQueryGroup::None,
            Self::Status => TaskQueryGroup::Status {
                status: task.status,
            },
            Self::Priority => TaskQueryGroup::Priority {
                priority: task.priority,
            },
            Self::Project => TaskQueryGroup::Project {
                project_id: task.project_id.clone(),
                project_name: project_name.map(str::to_owned),
            },
            Self::Due => TaskQueryGroup::Due {
                bucket: resolve_date_bucket(task.due_at.as_deref(), dates)?,
            },
            Self::Scheduled => TaskQueryGroup::Scheduled {
                bucket: resolve_date_bucket(task.planned_at.as_deref(), dates)?,
            },
        })
    }
}

fn resolve_date_bucket(
    value: Option<&str>,
    dates: &ViewDateBoundaries,
) -> Result<TaskDateBucket, ApplicationError> {
    let Some(value) = value else {
        return Ok(TaskDateBucket::None);
    };
    let parse = |value: &str| {
        chrono::DateTime::parse_from_rfc3339(value)
            .map_err(|_| ApplicationError::validation("任务分组日期无效"))
    };
    let value = parse(value)?;
    for (boundary, bucket) in [
        (&dates.today_start, TaskDateBucket::Overdue),
        (&dates.tomorrow_start, TaskDateBucket::Today),
        (&dates.day_after_tomorrow_start, TaskDateBucket::Tomorrow),
        (&dates.next_week_start, TaskDateBucket::ThisWeek),
    ] {
        if value < parse(boundary)? {
            return Ok(bucket);
        }
    }
    Ok(TaskDateBucket::Later)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn date_groups_are_disjoint_at_frozen_midnight_and_week_edges() {
        let sunday = ViewDateBoundaries {
            today_start: "2026-09-12T16:00:00Z".to_owned(),
            tomorrow_start: "2026-09-13T16:00:00Z".to_owned(),
            day_after_tomorrow_start: "2026-09-14T16:00:00Z".to_owned(),
            next_week_start: "2026-09-13T16:00:00Z".to_owned(),
        };
        for (date, expected) in [
            (None, TaskDateBucket::None),
            (
                Some("2026-09-12T23:59:59.999999999+08:00"),
                TaskDateBucket::Overdue,
            ),
            (Some("2026-09-13T00:00:00+08:00"), TaskDateBucket::Today),
            (
                Some("2026-09-13T23:59:59.999999999+08:00"),
                TaskDateBucket::Today,
            ),
            (Some("2026-09-14T00:00:00+08:00"), TaskDateBucket::Tomorrow),
            (Some("2026-09-15T00:00:00+08:00"), TaskDateBucket::Later),
        ] {
            assert_eq!(resolve_date_bucket(date, &sunday).unwrap(), expected);
        }
        let monday = ViewDateBoundaries {
            today_start: "2026-09-13T16:00:00Z".to_owned(),
            tomorrow_start: "2026-09-14T16:00:00Z".to_owned(),
            day_after_tomorrow_start: "2026-09-15T16:00:00Z".to_owned(),
            next_week_start: "2026-09-20T16:00:00Z".to_owned(),
        };
        assert_eq!(
            resolve_date_bucket(Some("2026-09-19T08:00:00+08:00"), &monday).unwrap(),
            TaskDateBucket::ThisWeek
        );
        assert!(resolve_date_bucket(Some("bad-date"), &monday).is_err());
    }
}

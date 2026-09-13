//! 查询分组身份：窗口前缀与返回行使用同一业务分类。

use serde::{Deserialize, Serialize};
use stoneflow_domain::WorkStatus;

use crate::{
    view::{ViewDateBoundaries, ViewTaskRecord},
    ApplicationError,
};

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

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
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

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
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

impl TaskGroupBy {
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

//! View 的纯过滤、日期和稳定排序规则。

use crate::view::{
    DateFilter, DateFilterMode, ProjectFilterMode, SortDirection, TaskSortField,
    TaskViewFiltersValue, ViewSortRule, ViewTaskRecord,
};
use chrono::{DateTime, Local, NaiveDate, Utc};
use std::cmp::Ordering;
use stoneflow_domain::WorkStatus;

pub(crate) fn is_active(status: WorkStatus) -> bool {
    !matches!(status, WorkStatus::Done | WorkStatus::Canceled)
}

pub(crate) fn matches(
    task: &ViewTaskRecord,
    filters: &TaskViewFiltersValue,
    today: NaiveDate,
) -> bool {
    if !filters.status.is_empty() && !filters.status.contains(&task.status) {
        return false;
    }
    if let Some(priority) = &filters.priority {
        if priority.eq.is_some_and(|value| task.priority != value)
            || priority.gte.is_some_and(|value| task.priority < value)
            || priority.lte.is_some_and(|value| task.priority > value)
        {
            return false;
        }
    }
    if let Some(project) = &filters.project {
        match project.mode {
            ProjectFilterMode::Any => {}
            ProjectFilterMode::None if task.project_id.is_some() => return false,
            ProjectFilterMode::Specific
                if !task
                    .project_id
                    .as_ref()
                    .is_some_and(|id| project.ids.contains(id)) =>
            {
                return false
            }
            _ => {}
        }
    }
    date_matches(task.due_at.as_deref(), filters.due.as_ref(), today)
        && date_matches(task.planned_at.as_deref(), filters.planned.as_ref(), today)
        && date_matches(Some(&task.created_at), filters.created.as_ref(), today)
        && date_matches(Some(&task.updated_at), filters.updated.as_ref(), today)
        && date_matches(
            task.completed_at.as_deref(),
            filters.completed.as_ref(),
            today,
        )
}

pub(crate) fn local_date(raw: &str) -> Option<NaiveDate> {
    DateTime::parse_from_rfc3339(raw)
        .ok()
        .map(|value| value.with_timezone(&Utc).with_timezone(&Local).date_naive())
}

fn date_matches(raw: Option<&str>, filter: Option<&DateFilter>, today: NaiveDate) -> bool {
    let Some(filter) = filter else {
        return true;
    };
    match filter.mode {
        DateFilterMode::None => raw.is_none(),
        DateFilterMode::NotNone => raw.is_some(),
        _ => raw
            .and_then(local_date)
            .is_some_and(|date| match filter.mode {
                DateFilterMode::Today => date == today,
                DateFilterMode::Overdue | DateFilterMode::Past => date < today,
                DateFilterMode::Future => date > today,
                DateFilterMode::Between => {
                    filter
                        .from
                        .as_deref()
                        .and_then(local_date)
                        .is_none_or(|from| date >= from)
                        && filter
                            .to
                            .as_deref()
                            .and_then(local_date)
                            .is_none_or(|to| date <= to)
                }
                DateFilterMode::None | DateFilterMode::NotNone => unreachable!(),
            }),
    }
}

pub(crate) fn sort(tasks: &mut [ViewTaskRecord], rules: &[ViewSortRule]) {
    tasks.sort_by(|left, right| {
        for rule in rules {
            let order = match rule.field {
                TaskSortField::Position => left.position.cmp(&right.position),
                TaskSortField::Priority => left.priority.cmp(&right.priority),
                TaskSortField::DueAt => left.due_at.cmp(&right.due_at),
                TaskSortField::PlannedAt => left.planned_at.cmp(&right.planned_at),
                TaskSortField::CreatedAt => left.created_at.cmp(&right.created_at),
                TaskSortField::UpdatedAt => left.updated_at.cmp(&right.updated_at),
                TaskSortField::CompletedAt => left.completed_at.cmp(&right.completed_at),
            };
            let order = if matches!(rule.direction, SortDirection::Desc) {
                order.reverse()
            } else {
                order
            };
            if order != Ordering::Equal {
                return order;
            }
        }
        left.id.cmp(&right.id)
    });
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::view::{SortDirection, TaskSortField, ViewSortRule};

    fn task(id: &str, status: WorkStatus, due_at: Option<&str>) -> ViewTaskRecord {
        ViewTaskRecord {
            id: id.to_owned(),
            space_id: "space".to_owned(),
            project_id: None,
            title: id.to_owned(),
            note: None,
            status,
            status_changed_at: "2026-07-23T00:00:00Z".to_owned(),
            priority: 0,
            planned_at: None,
            due_at: due_at.map(str::to_owned),
            remind_at: None,
            position: 1,
            completed_at: None,
            created_at: "2026-07-23T00:00:00Z".to_owned(),
            updated_at: "2026-07-23T00:00:00Z".to_owned(),
        }
    }

    #[test]
    fn overdue_filter_should_exclude_completed_tasks() {
        let filters = TaskViewFiltersValue {
            status: vec![WorkStatus::Todo, WorkStatus::Doing, WorkStatus::Waiting],
            due: Some(DateFilter {
                mode: DateFilterMode::Overdue,
                from: None,
                to: None,
            }),
            ..Default::default()
        };
        let today = NaiveDate::from_ymd_opt(2026, 7, 23).expect("valid date");

        assert!(matches(
            &task("active", WorkStatus::Todo, Some("2026-07-22T00:00:00Z")),
            &filters,
            today
        ));
        assert!(!matches(
            &task("done", WorkStatus::Done, Some("2026-07-22T00:00:00Z")),
            &filters,
            today
        ));
    }

    #[test]
    fn sort_should_use_id_as_stable_final_tiebreaker() {
        let mut tasks = vec![
            task("b", WorkStatus::Todo, None),
            task("a", WorkStatus::Todo, None),
        ];

        sort(
            &mut tasks,
            &[ViewSortRule {
                field: TaskSortField::Position,
                direction: SortDirection::Asc,
            }],
        );

        assert_eq!(tasks[0].id, "a");
    }

    #[test]
    fn project_any_filter_should_not_require_project_id() {
        let filters = TaskViewFiltersValue {
            project: Some(crate::view::ProjectFilter {
                mode: ProjectFilterMode::Any,
                ids: Vec::new(),
            }),
            ..Default::default()
        };
        let today = NaiveDate::from_ymd_opt(2026, 7, 23).expect("valid date");

        assert!(matches(
            &task("task", WorkStatus::Todo, None),
            &filters,
            today
        ));
    }
}

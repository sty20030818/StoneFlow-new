//! Task View 过滤 / 排序辅助（R2：去掉 inbox/soft-delete/scheduled 旧语义）。

#![allow(dead_code)]

use std::cmp::Ordering;

use chrono::NaiveDate;
use stoneflow_domain::{parse_calendar_date, today_local_date, WorkStatus};

use crate::view::types::{
    DateFilter, DateFilterMode, TaskGroupBy, TaskSortField, TaskViewFiltersValue, ViewTaskRecord,
};

pub(crate) fn matches_filters(task: &ViewTaskRecord, filters: &TaskViewFiltersValue) -> bool {
    if !filters.status.is_empty() && !filters.status.contains(&task.status) {
        return false;
    }

    if let Some(priority) = &filters.priority {
        if let Some(eq) = priority.eq {
            if task.priority != eq {
                return false;
            }
        }
        if let Some(gte) = priority.gte {
            if task.priority < gte {
                return false;
            }
        }
        if let Some(lte) = priority.lte {
            if task.priority > lte {
                return false;
            }
        }
    }

    if let Some(project) = &filters.project {
        match project.mode.as_str() {
            "none" if task.project_id.is_some() => return false,
            "any" if task.project_id.is_none() => return false,
            "ids" => {
                let Some(project_id) = task.project_id.as_ref() else {
                    return false;
                };
                if !project.ids.iter().any(|id| id == project_id) {
                    return false;
                }
            }
            _ => {}
        }
    }

    let today = today_local_date();
    if let Some(filter) = &filters.due {
        if !matches_date_filter(task.due_at.as_deref(), filter, today, false) {
            return false;
        }
    }
    if let Some(filter) = &filters.planned {
        if !matches_date_filter(task.planned_at.as_deref(), filter, today, false) {
            return false;
        }
    }
    if let Some(filter) = &filters.created {
        if !matches_date_filter(Some(task.created_at.as_str()), filter, today, true) {
            return false;
        }
    }
    if let Some(filter) = &filters.updated {
        if !matches_date_filter(Some(task.updated_at.as_str()), filter, today, true) {
            return false;
        }
    }
    if let Some(filter) = &filters.completed {
        if !matches_date_filter(task.completed_at.as_deref(), filter, today, false) {
            return false;
        }
    }

    true
}

pub(crate) fn compare_tasks(
    left: &ViewTaskRecord,
    right: &ViewTaskRecord,
    field: TaskSortField,
    ascending: bool,
) -> Ordering {
    let ordering = match field {
        TaskSortField::Position => left.position.cmp(&right.position),
        TaskSortField::Priority => left.priority.cmp(&right.priority),
        TaskSortField::DueAt => {
            compare_optional_str(left.due_at.as_deref(), right.due_at.as_deref())
        }
        TaskSortField::PlannedAt => {
            compare_optional_str(left.planned_at.as_deref(), right.planned_at.as_deref())
        }
        TaskSortField::CreatedAt => left.created_at.cmp(&right.created_at),
        TaskSortField::UpdatedAt => left.updated_at.cmp(&right.updated_at),
        TaskSortField::CompletedAt => {
            compare_optional_str(left.completed_at.as_deref(), right.completed_at.as_deref())
        }
    };
    if ascending {
        ordering
    } else {
        ordering.reverse()
    }
}

pub(crate) fn group_key(task: &ViewTaskRecord, group_by: TaskGroupBy) -> String {
    match group_by {
        TaskGroupBy::None => "all".to_owned(),
        TaskGroupBy::Status => task.status.as_str().to_owned(),
        TaskGroupBy::Priority => task.priority.to_string(),
        TaskGroupBy::Project => task
            .project_id
            .clone()
            .unwrap_or_else(|| "no-project".to_owned()),
        TaskGroupBy::Due => task
            .due_at
            .as_deref()
            .and_then(parse_calendar_date)
            .map(|date| date.to_string())
            .unwrap_or_else(|| "none".to_owned()),
        TaskGroupBy::Planned => task
            .planned_at
            .as_deref()
            .and_then(parse_calendar_date)
            .map(|date| date.to_string())
            .unwrap_or_else(|| "none".to_owned()),
    }
}

fn matches_date_filter(
    raw: Option<&str>,
    filter: &DateFilter,
    today: NaiveDate,
    require_value: bool,
) -> bool {
    match filter.mode {
        DateFilterMode::None => raw.is_none(),
        DateFilterMode::NotNone => raw.is_some(),
        _ => {
            let Some(raw) = raw else {
                return !require_value && matches!(filter.mode, DateFilterMode::None);
            };
            let Some(date) = parse_calendar_date(raw) else {
                return false;
            };
            match filter.mode {
                DateFilterMode::Today => date == today,
                DateFilterMode::Tomorrow => date == today.succ_opt().unwrap_or(today),
                DateFilterMode::Overdue => date < today,
                DateFilterMode::Future => date > today,
                DateFilterMode::Past => date < today,
                DateFilterMode::Between => {
                    let from_ok = filter
                        .from
                        .as_deref()
                        .and_then(parse_calendar_date)
                        .map(|from| date >= from)
                        .unwrap_or(true);
                    let to_ok = filter
                        .to
                        .as_deref()
                        .and_then(parse_calendar_date)
                        .map(|to| date <= to)
                        .unwrap_or(true);
                    from_ok && to_ok
                }
                DateFilterMode::ThisWeek | DateFilterMode::NextWeek => true,
                DateFilterMode::None | DateFilterMode::NotNone => unreachable!(),
            }
        }
    }
}

fn compare_optional_str(left: Option<&str>, right: Option<&str>) -> Ordering {
    match (left, right) {
        (Some(left), Some(right)) => left.cmp(right),
        (Some(_), None) => Ordering::Less,
        (None, Some(_)) => Ordering::Greater,
        (None, None) => Ordering::Equal,
    }
}

#[allow(dead_code)]
pub(crate) fn is_active_status(status: WorkStatus) -> bool {
    !matches!(status, WorkStatus::Done | WorkStatus::Canceled)
}

//! Task View 纯执行逻辑：过滤、排序与分组。

use std::cmp::Ordering;
use std::collections::BTreeMap;

use chrono::{DateTime, Datelike, Duration, FixedOffset, NaiveDate};
use serde_json::Value;
use stoneflow_domain::parse_calendar_date;

use crate::{view::types::*, UsecaseError};

use super::service::{TaskViewGroupDto, ViewSortDirection, ViewSortRuleDto};

pub(crate) fn parse_task_view_filters(value: &str) -> Result<TaskViewFiltersValue, UsecaseError> {
    let json = parse_json_value(value)?;
    parse_task_view_filters_value(&json)
}

pub(crate) fn parse_task_view_filters_value(
    value: &Value,
) -> Result<TaskViewFiltersValue, UsecaseError> {
    serde_json::from_value(value.clone())
        .map_err(|error| UsecaseError::validation(format!("Task View filters 非法: {error}")))
}

pub(crate) fn parse_sort_rules(value: &str) -> Result<Vec<ViewSortRuleDto>, UsecaseError> {
    let rules = serde_json::from_str::<Vec<ViewSortRuleDto>>(value)
        .map_err(|error| UsecaseError::validation(format!("Task View sort 非法: {error}")))?;
    normalize_sort_rules(rules)
}

pub(crate) fn parse_group_by(value: Option<&str>) -> Result<TaskGroupBy, UsecaseError> {
    match value {
        None => Ok(TaskGroupBy::None),
        Some("none") => Ok(TaskGroupBy::None),
        Some("status") => Ok(TaskGroupBy::Status),
        Some("priority") => Ok(TaskGroupBy::Priority),
        Some("project") => Ok(TaskGroupBy::Project),
        Some("due") => Ok(TaskGroupBy::Due),
        Some("scheduled") => Ok(TaskGroupBy::Scheduled),
        Some(_) => Err(UsecaseError::validation("Task View groupBy 非法")),
    }
}

pub(crate) fn normalize_filters(value: Value) -> Result<Value, UsecaseError> {
    let filters = parse_task_view_filters_value(&value)?;
    serde_json::to_value(filters).map_err(|error| UsecaseError::validation(error.to_string()))
}

pub(crate) fn normalize_sort_rules(
    value: Vec<ViewSortRuleDto>,
) -> Result<Vec<ViewSortRuleDto>, UsecaseError> {
    if value.is_empty() {
        return Err(UsecaseError::validation("View sort 至少需要一条规则"));
    }

    for rule in &value {
        let _ = parse_sort_field(&rule.field)?;
    }

    Ok(value)
}

pub(crate) fn normalize_group_by(value: Option<String>) -> Result<Option<String>, UsecaseError> {
    let normalized = normalize_optional_text(value);
    parse_group_by(normalized.as_deref())?;
    Ok(normalized)
}

pub(crate) fn normalize_group_by_option(
    value: Option<String>,
) -> Result<Option<String>, UsecaseError> {
    normalize_group_by(value)
}

pub(crate) fn matches_task_view(
    task: &ViewTaskRecord,
    filters: &TaskViewFiltersValue,
    special_key: Option<&str>,
    today: NaiveDate,
) -> bool {
    if let Some(deleted) = filters.deleted {
        if deleted != task.deleted_at.is_some() {
            return false;
        }
    } else if task.deleted_at.is_some() {
        return false;
    }

    if let Some(archived) = filters.archived {
        if archived != task.archived_at.is_some() {
            return false;
        }
    }

    if !filters.status.is_empty() && !filters.status.contains(&task.status) {
        return false;
    }

    if let Some(priority) = &filters.priority {
        if !matches_priority_filter(task.priority, priority) {
            return false;
        }
    }

    if let Some(inbox) = filters.inbox {
        if inbox != task.inbox_at.is_some() {
            return false;
        }
    }

    if let Some(project) = &filters.project {
        if !matches_project_filter(task, project) {
            return false;
        }
    }

    if !matches_special_temporal_filter(task, special_key, today) {
        return false;
    }

    if !is_special_key(special_key) {
        if let Some(filter) = &filters.due {
            if !matches_date_filter(task.due_at.as_deref(), filter, today, false) {
                return false;
            }
        }
        if let Some(filter) = &filters.scheduled {
            if !matches_date_filter(task.scheduled_at.as_deref(), filter, today, false) {
                return false;
            }
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
        if !matches_date_filter(task.completed_at.as_deref(), filter, today, true) {
            return false;
        }
    }

    true
}

pub(crate) fn sort_tasks(
    tasks: &mut [ViewTaskRecord],
    sort_rules: &[ViewSortRuleDto],
    special_key: Option<&str>,
    today: NaiveDate,
) {
    tasks.sort_by(|left, right| {
        if special_key == Some("today") {
            let special = compare_today_bucket(left, right, today);
            if special != Ordering::Equal {
                return special;
            }
        }
        if special_key == Some("upcoming") {
            let special = compare_upcoming_bucket(left, right, today);
            if special != Ordering::Equal {
                return special;
            }
        }

        for rule in sort_rules {
            let ordering = compare_by_rule(left, right, rule);
            if ordering != Ordering::Equal {
                return ordering;
            }
        }

        compare_string_desc(&left.updated_at, &right.updated_at)
    });
}

pub(crate) fn build_task_groups(
    tasks: &[ViewTaskRecord],
    group_by: TaskGroupBy,
    today: NaiveDate,
) -> Vec<TaskViewGroupDto> {
    if matches!(group_by, TaskGroupBy::None | TaskGroupBy::Status) {
        return Vec::new();
    }

    let mut groups = BTreeMap::<String, TaskViewGroupDto>::new();
    for task in tasks {
        let (key, label) = group_key_label(task, group_by, today);
        groups
            .entry(key.clone())
            .and_modify(|group| group.task_ids.push(task.id.clone()))
            .or_insert(TaskViewGroupDto {
                key,
                label,
                task_ids: vec![task.id.clone()],
            });
    }

    groups.into_values().collect()
}

fn parse_json_value(value: &str) -> Result<Value, UsecaseError> {
    serde_json::from_str(value)
        .map_err(|error| UsecaseError::validation(format!("View JSON 非法: {error}")))
}

fn parse_sort_field(value: &str) -> Result<TaskSortField, UsecaseError> {
    match value {
        "sortOrder" => Ok(TaskSortField::SortOrder),
        "priority" => Ok(TaskSortField::Priority),
        "dueAt" => Ok(TaskSortField::DueAt),
        "scheduledAt" => Ok(TaskSortField::ScheduledAt),
        "createdAt" => Ok(TaskSortField::CreatedAt),
        "updatedAt" => Ok(TaskSortField::UpdatedAt),
        "completedAt" => Ok(TaskSortField::CompletedAt),
        _ => Err(UsecaseError::validation("Task View sort 字段非法")),
    }
}

fn normalize_optional_text(value: Option<String>) -> Option<String> {
    value.and_then(|value| {
        let trimmed = value.trim();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed.to_owned())
        }
    })
}

fn matches_priority_filter(value: i32, filter: &PriorityFilter) -> bool {
    if let Some(eq) = filter.eq {
        return value == eq;
    }
    if let Some(gte) = filter.gte {
        if value < gte {
            return false;
        }
    }
    if let Some(lte) = filter.lte {
        if value > lte {
            return false;
        }
    }
    true
}

fn matches_project_filter(task: &ViewTaskRecord, filter: &ProjectFilter) -> bool {
    match filter.mode.as_str() {
        "any" => task.project_id.is_some(),
        "none" => task.project_id.is_none(),
        "specific" => task
            .project_id
            .as_ref()
            .is_some_and(|project_id| filter.ids.iter().any(|id| id == project_id)),
        _ => false,
    }
}

fn is_special_key(special_key: Option<&str>) -> bool {
    matches!(special_key, Some("today" | "upcoming"))
}

fn matches_special_temporal_filter(
    task: &ViewTaskRecord,
    special_key: Option<&str>,
    today: NaiveDate,
) -> bool {
    match special_key {
        Some("today") => {
            let due = due_date(task);
            let scheduled = scheduled_date(task);
            scheduled == Some(today) || due == Some(today) || due.is_some_and(|value| value < today)
        }
        Some("upcoming") => {
            due_date(task).is_some_and(|value| value > today)
                || scheduled_date(task).is_some_and(|value| value > today)
        }
        _ => true,
    }
}

fn compare_by_rule(
    left: &ViewTaskRecord,
    right: &ViewTaskRecord,
    rule: &ViewSortRuleDto,
) -> Ordering {
    let field = match parse_sort_field(&rule.field) {
        Ok(field) => field,
        Err(_) => return Ordering::Equal,
    };

    let ordering = match field {
        TaskSortField::SortOrder => left.sort_order.cmp(&right.sort_order),
        TaskSortField::Priority => left.priority.cmp(&right.priority),
        TaskSortField::DueAt => compare_option_date(due_date(left), due_date(right)),
        TaskSortField::ScheduledAt => {
            compare_option_date(scheduled_date(left), scheduled_date(right))
        }
        TaskSortField::CreatedAt => compare_option_date(
            timestamp_date(left.created_at.as_str()),
            timestamp_date(right.created_at.as_str()),
        ),
        TaskSortField::UpdatedAt => compare_option_date(
            timestamp_date(left.updated_at.as_str()),
            timestamp_date(right.updated_at.as_str()),
        ),
        TaskSortField::CompletedAt => compare_option_date(
            timestamp_date_option(&left.completed_at),
            timestamp_date_option(&right.completed_at),
        ),
    };

    match rule.direction {
        ViewSortDirection::Asc => ordering,
        ViewSortDirection::Desc => ordering.reverse(),
    }
}

fn compare_today_bucket(
    left: &ViewTaskRecord,
    right: &ViewTaskRecord,
    today: NaiveDate,
) -> Ordering {
    let left_bucket = today_bucket(left, today);
    let right_bucket = today_bucket(right, today);
    left_bucket.cmp(&right_bucket)
}

fn compare_upcoming_bucket(
    left: &ViewTaskRecord,
    right: &ViewTaskRecord,
    today: NaiveDate,
) -> Ordering {
    compare_option_date(
        next_upcoming_date(left, today),
        next_upcoming_date(right, today),
    )
}

fn compare_option_date(left: Option<NaiveDate>, right: Option<NaiveDate>) -> Ordering {
    match (left, right) {
        (Some(left), Some(right)) => left.cmp(&right),
        (Some(_), None) => Ordering::Less,
        (None, Some(_)) => Ordering::Greater,
        (None, None) => Ordering::Equal,
    }
}

fn compare_string_desc(left: &str, right: &str) -> Ordering {
    right.cmp(left)
}

fn group_key_label(
    task: &ViewTaskRecord,
    group_by: TaskGroupBy,
    today: NaiveDate,
) -> (String, String) {
    match group_by {
        TaskGroupBy::Priority => {
            let label = match task.priority {
                4 => "P4",
                3 => "P3",
                2 => "P2",
                1 => "P1",
                _ => "P0",
            };
            (format!("priority:{}", task.priority), label.to_owned())
        }
        TaskGroupBy::Project => match &task.project_id {
            Some(project_id) => (
                format!("project:{project_id}"),
                task.project_id
                    .clone()
                    .unwrap_or_else(|| "独立事项".to_owned()),
            ),
            None => ("project:none".to_owned(), "独立事项".to_owned()),
        },
        TaskGroupBy::Due => date_bucket_key_label(due_date(task), today, "截止"),
        TaskGroupBy::Scheduled => date_bucket_key_label(scheduled_date(task), today, "计划"),
        TaskGroupBy::None | TaskGroupBy::Status => ("all".to_owned(), "全部".to_owned()),
    }
}

fn date_bucket_key_label(
    date: Option<NaiveDate>,
    today: NaiveDate,
    none_label: &str,
) -> (String, String) {
    match date {
        None => ("none".to_owned(), format!("无{none_label}时间")),
        Some(value) if value < today => ("past".to_owned(), "已过期".to_owned()),
        Some(value) if value == today => ("today".to_owned(), "今天".to_owned()),
        Some(value) => (
            format!("date:{value}"),
            value.format("%Y-%m-%d").to_string(),
        ),
    }
}

fn matches_date_filter(
    raw_value: Option<&str>,
    filter: &DateFilter,
    today: NaiveDate,
    allow_timestamp: bool,
) -> bool {
    let parsed = if allow_timestamp {
        raw_value.and_then(parse_timestamp_date)
    } else {
        raw_value.and_then(parse_calendar_date)
    };

    match filter.mode {
        DateFilterMode::None => parsed.is_none(),
        DateFilterMode::NotNone => parsed.is_some(),
        DateFilterMode::Today => parsed == Some(today),
        DateFilterMode::Tomorrow => parsed == Some(today + Duration::days(1)),
        DateFilterMode::ThisWeek => parsed.is_some_and(|value| same_week(value, today)),
        DateFilterMode::NextWeek => {
            parsed.is_some_and(|value| same_week(value, today + Duration::days(7)))
        }
        DateFilterMode::Overdue => parsed.is_some_and(|value| value < today),
        DateFilterMode::Future => parsed.is_some_and(|value| value > today),
        DateFilterMode::Past => parsed.is_some_and(|value| value < today),
        DateFilterMode::Between => {
            let Some(value) = parsed else {
                return false;
            };
            let from = filter.from.as_deref().and_then(parse_calendar_date);
            let to = filter.to.as_deref().and_then(parse_calendar_date);
            match (from, to) {
                (Some(from), Some(to)) => value >= from && value <= to,
                (Some(from), None) => value >= from,
                (None, Some(to)) => value <= to,
                (None, None) => true,
            }
        }
    }
}

fn parse_timestamp_date(value: &str) -> Option<NaiveDate> {
    DateTime::<FixedOffset>::parse_from_rfc3339(value)
        .ok()
        .map(|date| date.date_naive())
}

fn timestamp_date(value: &str) -> Option<NaiveDate> {
    parse_timestamp_date(value)
}

fn timestamp_date_option(value: &Option<String>) -> Option<NaiveDate> {
    value.as_deref().and_then(parse_timestamp_date)
}

fn same_week(value: NaiveDate, anchor: NaiveDate) -> bool {
    let start = anchor - Duration::days(anchor.weekday().num_days_from_monday() as i64);
    let end = start + Duration::days(6);
    value >= start && value <= end
}

fn due_date(task: &ViewTaskRecord) -> Option<NaiveDate> {
    task.due_at.as_deref().and_then(parse_calendar_date)
}

fn scheduled_date(task: &ViewTaskRecord) -> Option<NaiveDate> {
    task.scheduled_at.as_deref().and_then(parse_calendar_date)
}

fn today_bucket(task: &ViewTaskRecord, today: NaiveDate) -> u8 {
    if due_date(task).is_some_and(|value| value < today) {
        return 0;
    }
    if due_date(task) == Some(today) {
        return 1;
    }
    if scheduled_date(task) == Some(today) {
        return 2;
    }
    3
}

fn next_upcoming_date(task: &ViewTaskRecord, today: NaiveDate) -> Option<NaiveDate> {
    [scheduled_date(task), due_date(task)]
        .into_iter()
        .flatten()
        .filter(|date| *date > today)
        .min()
}

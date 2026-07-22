//! Task 内置 viewKey 预设：过滤、排序与 Activity 动作推断。

use std::cmp::Ordering;

use chrono::NaiveDate;
use stoneflow_domain::{parse_calendar_date, today_local_date, WorkStatus};

use crate::{
    activity::{ActivityAction, ActivityChangeInput},
    task::types::{TaskLifecycleView, TaskRecord, TaskViewPreset},
    ApplicationError,
};

pub(crate) fn parse_view_key(view_key: &str) -> Result<TaskViewPreset, ApplicationError> {
    match view_key.trim().to_ascii_lowercase().as_str() {
        "active" => Ok(TaskViewPreset::Lifecycle(TaskLifecycleView::Active)),
        "completed" => Ok(TaskViewPreset::Lifecycle(TaskLifecycleView::Completed)),
        "canceled" => Ok(TaskViewPreset::Lifecycle(TaskLifecycleView::Canceled)),
        "archived" => Ok(TaskViewPreset::Lifecycle(TaskLifecycleView::Archived)),
        "all" => Ok(TaskViewPreset::Lifecycle(TaskLifecycleView::All)),
        "today" => Ok(TaskViewPreset::Today),
        "focus" => Ok(TaskViewPreset::Focus),
        "upcoming" => Ok(TaskViewPreset::Upcoming),
        "overdue" => Ok(TaskViewPreset::Overdue),
        _ => Err(ApplicationError::validation("未知 Task viewKey")),
    }
}

pub(crate) fn repository_lifecycle_for_preset(view_preset: TaskViewPreset) -> TaskLifecycleView {
    match view_preset {
        TaskViewPreset::Lifecycle(lifecycle) => lifecycle,
        TaskViewPreset::Today
        | TaskViewPreset::Focus
        | TaskViewPreset::Upcoming
        | TaskViewPreset::Overdue => TaskLifecycleView::Active,
    }
}

pub(crate) fn apply_view_preset(
    mut tasks: Vec<TaskRecord>,
    view_preset: TaskViewPreset,
) -> Vec<TaskRecord> {
    match view_preset {
        TaskViewPreset::Lifecycle(_) => tasks,
        TaskViewPreset::Today => {
            let today = today_local_date();
            tasks.retain(|task| matches_today(task, today));
            tasks.sort_by(|left, right| compare_today_tasks(left, right, today));
            tasks
        }
        TaskViewPreset::Focus => {
            tasks.retain(matches_focus);
            tasks.sort_by(compare_focus_tasks);
            tasks
        }
        TaskViewPreset::Upcoming => {
            let today = today_local_date();
            tasks.retain(|task| matches_upcoming(task, today));
            tasks.sort_by(|left, right| compare_upcoming_tasks(left, right, today));
            tasks
        }
        TaskViewPreset::Overdue => {
            let today = today_local_date();
            tasks.retain(|task| matches_overdue(task, today));
            tasks.sort_by(compare_overdue_tasks);
            tasks
        }
    }
}

pub(crate) fn status_key(status: WorkStatus) -> &'static str {
    status.as_str()
}

/// 依据目标状态推导 completed_at（R2：WorkState 只用单一 completed_at 表达“完成”）。
pub(crate) fn completed_at_for_status(status: WorkStatus, now: &str) -> Option<String> {
    if status.is_done() {
        Some(now.to_owned())
    } else {
        None
    }
}

pub(crate) fn select_update_action(
    current: &TaskRecord,
    next_status: Option<WorkStatus>,
    changes: &[ActivityChangeInput],
) -> ActivityAction {
    if let Some(status) = next_status {
        return match status {
            WorkStatus::Done => ActivityAction::TaskCompleted,
            WorkStatus::Canceled => ActivityAction::TaskCanceled,
            WorkStatus::Todo | WorkStatus::Doing | WorkStatus::Waiting
                if matches!(current.status, WorkStatus::Done | WorkStatus::Canceled) =>
            {
                ActivityAction::TaskReopened
            }
            WorkStatus::Todo | WorkStatus::Doing | WorkStatus::Waiting => {
                ActivityAction::TaskStatusChanged
            }
        };
    }

    let changed_fields = changes
        .iter()
        .map(|change| change.field.as_str())
        .collect::<Vec<_>>();
    if changed_fields.contains(&"project_id") {
        return ActivityAction::TaskMovedProject;
    }
    if changed_fields.contains(&"space_id") {
        return ActivityAction::TaskMovedSpace;
    }
    if changed_fields.contains(&"priority") {
        return ActivityAction::TaskPriorityChanged;
    }
    if changed_fields.contains(&"due_at") {
        return ActivityAction::TaskDueUpdated;
    }
    if changed_fields.contains(&"planned_at") {
        return ActivityAction::TaskScheduledUpdated;
    }
    if changed_fields.contains(&"remind_at") {
        return ActivityAction::TaskReminderUpdated;
    }
    if changed_fields.contains(&"note") {
        return ActivityAction::TaskNoteUpdated;
    }

    ActivityAction::TaskTitleUpdated
}

pub(crate) fn build_update_summary(action: ActivityAction, title: &str) -> String {
    match action {
        ActivityAction::TaskCompleted => format!("完成任务「{title}」"),
        ActivityAction::TaskCanceled => format!("取消任务「{title}」"),
        ActivityAction::TaskReopened => format!("重新打开任务「{title}」"),
        ActivityAction::TaskStatusChanged => format!("更新任务状态「{title}」"),
        ActivityAction::TaskMovedProject => format!("调整任务所属项目「{title}」"),
        ActivityAction::TaskMovedSpace => format!("调整任务所属 Space「{title}」"),
        ActivityAction::TaskPriorityChanged => format!("更新任务优先级「{title}」"),
        ActivityAction::TaskDueUpdated => format!("更新任务截止时间「{title}」"),
        ActivityAction::TaskScheduledUpdated => format!("更新任务计划时间「{title}」"),
        ActivityAction::TaskReminderUpdated => format!("更新任务提醒时间「{title}」"),
        ActivityAction::TaskNoteUpdated => format!("更新任务备注「{title}」"),
        _ => format!("更新任务「{title}」"),
    }
}

fn matches_focus(task: &TaskRecord) -> bool {
    matches!(task.status, WorkStatus::Todo | WorkStatus::Doing) && task.priority >= 3
}

fn matches_today(task: &TaskRecord, today: NaiveDate) -> bool {
    let due_date = due_date(task);
    let planned_date = planned_date(task);
    planned_date == Some(today)
        || due_date == Some(today)
        || due_date.is_some_and(|value| value < today)
}

fn matches_upcoming(task: &TaskRecord, today: NaiveDate) -> bool {
    due_date(task).is_some_and(|value| value > today)
        || planned_date(task).is_some_and(|value| value > today)
}

fn matches_overdue(task: &TaskRecord, today: NaiveDate) -> bool {
    due_date(task).is_some_and(|value| value < today)
}

fn compare_today_tasks(left: &TaskRecord, right: &TaskRecord, today: NaiveDate) -> Ordering {
    compare_ordering_chain([
        today_bucket(left, today).cmp(&today_bucket(right, today)),
        right.priority.cmp(&left.priority),
        left.position.cmp(&right.position),
        right.updated_at.cmp(&left.updated_at),
    ])
}

fn compare_focus_tasks(left: &TaskRecord, right: &TaskRecord) -> Ordering {
    compare_ordering_chain([
        right.priority.cmp(&left.priority),
        compare_option_date_asc(due_date(left), due_date(right)),
        compare_option_date_asc(planned_date(left), planned_date(right)),
        left.position.cmp(&right.position),
        right.updated_at.cmp(&left.updated_at),
    ])
}

fn compare_upcoming_tasks(left: &TaskRecord, right: &TaskRecord, today: NaiveDate) -> Ordering {
    compare_ordering_chain([
        compare_option_date_asc(
            next_upcoming_date(left, today),
            next_upcoming_date(right, today),
        ),
        right.priority.cmp(&left.priority),
        left.position.cmp(&right.position),
        right.updated_at.cmp(&left.updated_at),
    ])
}

fn compare_overdue_tasks(left: &TaskRecord, right: &TaskRecord) -> Ordering {
    compare_ordering_chain([
        compare_option_date_asc(due_date(left), due_date(right)),
        right.priority.cmp(&left.priority),
        left.position.cmp(&right.position),
        right.updated_at.cmp(&left.updated_at),
    ])
}

fn today_bucket(task: &TaskRecord, today: NaiveDate) -> u8 {
    if due_date(task).is_some_and(|value| value < today) {
        return 0;
    }
    if due_date(task) == Some(today) {
        return 1;
    }
    if planned_date(task) == Some(today) {
        return 2;
    }
    3
}

fn next_upcoming_date(task: &TaskRecord, today: NaiveDate) -> Option<NaiveDate> {
    [planned_date(task), due_date(task)]
        .into_iter()
        .flatten()
        .filter(|date| *date > today)
        .min()
}

fn due_date(task: &TaskRecord) -> Option<NaiveDate> {
    task.due_at.as_deref().and_then(parse_calendar_date)
}

fn planned_date(task: &TaskRecord) -> Option<NaiveDate> {
    task.planned_at.as_deref().and_then(parse_calendar_date)
}

fn compare_option_date_asc(left: Option<NaiveDate>, right: Option<NaiveDate>) -> Ordering {
    match (left, right) {
        (Some(left), Some(right)) => left.cmp(&right),
        (Some(_), None) => Ordering::Less,
        (None, Some(_)) => Ordering::Greater,
        (None, None) => Ordering::Equal,
    }
}

fn compare_ordering_chain<const N: usize>(orderings: [Ordering; N]) -> Ordering {
    orderings
        .into_iter()
        .find(|ordering| *ordering != Ordering::Equal)
        .unwrap_or(Ordering::Equal)
}

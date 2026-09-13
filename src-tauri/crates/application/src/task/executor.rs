//! Task 查询 cursor 与 Activity 动作推断。

use serde::{Deserialize, Serialize};
use stoneflow_domain::WorkStatus;

use crate::{
    activity::{ActivityAction, ActivityChangeInput},
    task::{order::invalid_cursor, TaskOrderTuple, TaskQueryCursor, TaskQueryOrder, TaskRecord},
    view::{
        FilterQueryValue, TaskScopeInput, TaskViewBaseKey, TaskViewContext, ViewDateBoundaries,
        ViewTaskRecord,
    },
    ApplicationError,
};

/// cursor 只绑定影响成员与顺序的值，筛选条款 ID 不参与身份。
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct TaskQueryIdentity {
    scope: TaskScopeInput,
    context: TaskViewContext,
    base_view_key: TaskViewBaseKey,
    filters: FilterQueryValue,
    order: TaskQueryOrder,
    date_basis: String,
}

impl TaskQueryIdentity {
    pub(crate) fn new(
        scope: &TaskScopeInput,
        context: &TaskViewContext,
        base_view_key: TaskViewBaseKey,
        filters: &FilterQueryValue,
        order: TaskQueryOrder,
        date_basis: &str,
    ) -> Self {
        let mut filters = filters.clone();
        for clause in &mut filters.clauses {
            clause.id.clear();
            clause.values.sort();
            clause.values.dedup();
        }
        filters.clauses.sort_by(|left, right| {
            (&left.field, &left.op, &left.values).cmp(&(&right.field, &right.op, &right.values))
        });
        filters.clauses.dedup();
        Self {
            scope: scope.clone(),
            context: context.clone(),
            base_view_key,
            filters,
            order: order.normalized(),
            date_basis: date_basis.to_owned(),
        }
    }
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct TaskCursorPayload {
    version: u8,
    query: TaskQueryIdentity,
    dates: ViewDateBoundaries,
    values: TaskOrderTuple,
}

pub(crate) fn encode_task_query_cursor(
    query: &TaskQueryIdentity,
    dates: &ViewDateBoundaries,
    task: &ViewTaskRecord,
) -> Result<String, ApplicationError> {
    let values = query.order.tuple(task);
    query.order.validate_tuple(&values)?;
    serde_json::to_string(&TaskCursorPayload {
        version: 1,
        query: query.clone(),
        dates: dates.clone(),
        values,
    })
    .map_err(|_| ApplicationError::internal("无法生成列表 cursor"))
}

pub(crate) fn decode_task_query_cursor(
    raw: &str,
    query: &TaskQueryIdentity,
) -> Result<(TaskQueryCursor, ViewDateBoundaries), ApplicationError> {
    let payload: TaskCursorPayload = serde_json::from_str(raw).map_err(|_| invalid_cursor())?;
    if payload.version != 1 || &payload.query != query {
        return Err(invalid_cursor());
    }
    query.order.validate_tuple(&payload.values)?;
    let dates = [
        &payload.dates.today_start,
        &payload.dates.tomorrow_start,
        &payload.dates.day_after_tomorrow_start,
        &payload.dates.next_week_start,
    ]
    .map(|date| chrono::DateTime::parse_from_rfc3339(date).map_err(|_| invalid_cursor()));
    let [today, tomorrow, day_after, next_week] = dates;
    let (today, tomorrow, day_after, next_week) = (today?, tomorrow?, day_after?, next_week?);
    if !(today < tomorrow && tomorrow < day_after && today < next_week)
        || next_week.signed_duration_since(today) > chrono::Duration::days(8)
    {
        return Err(invalid_cursor());
    }
    Ok((
        TaskQueryCursor {
            values: payload.values,
        },
        payload.dates,
    ))
}

pub(crate) fn status_key(status: WorkStatus) -> &'static str {
    status.as_str()
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
        return ActivityAction::TaskPlannedUpdated;
    }
    if changed_fields.contains(&"remind_at") {
        return ActivityAction::TaskRemindUpdated;
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
        ActivityAction::TaskPlannedUpdated => format!("更新任务计划时间「{title}」"),
        ActivityAction::TaskRemindUpdated => format!("更新任务提醒时间「{title}」"),
        ActivityAction::TaskNoteUpdated => format!("更新任务备注「{title}」"),
        _ => format!("更新任务「{title}」"),
    }
}

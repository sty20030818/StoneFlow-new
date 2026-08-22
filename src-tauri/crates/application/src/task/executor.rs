//! Task 查询 cursor 与 Activity 动作推断。

use stoneflow_domain::WorkStatus;

use crate::{
    activity::{ActivityAction, ActivityChangeInput},
    task::types::{TaskQueryCursor, TaskRecord},
    ApplicationError,
};

pub(crate) fn encode_task_query_cursor(position: i64, id: &str) -> String {
    format!("{position}\u{1f}{id}")
}

pub(crate) fn decode_task_query_cursor(raw: &str) -> Result<TaskQueryCursor, ApplicationError> {
    let (position_raw, id) = raw
        .split_once('\u{1f}')
        .ok_or_else(|| ApplicationError::validation("列表 cursor 无效"))?;
    let position = position_raw
        .parse::<i64>()
        .map_err(|_| ApplicationError::validation("列表 cursor 无效"))?;
    if id.is_empty() {
        return Err(ApplicationError::validation("列表 cursor 无效"));
    }
    Ok(TaskQueryCursor {
        position,
        id: id.to_owned(),
    })
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

#[cfg(test)]
mod tests {
    use super::{decode_task_query_cursor, encode_task_query_cursor};

    #[test]
    fn task_query_cursor_codec_rejects_invalid_input_and_round_trips() {
        assert!(decode_task_query_cursor("invalid").is_err());
        assert!(decode_task_query_cursor("100\u{1f}").is_err());

        let encoded = encode_task_query_cursor(100, "task-1");
        let decoded = decode_task_query_cursor(&encoded).expect("valid cursor");
        assert_eq!(decoded.position, 100);
        assert_eq!(decoded.id, "task-1");
    }
}

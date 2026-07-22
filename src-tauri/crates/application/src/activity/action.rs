//! Activity action 枚举：统一收口业务代码中可写入的操作名。

use std::fmt;

use serde::Serialize;

/// Activity 操作枚举。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ActivityAction {
    TaskCreated,
    TaskTitleUpdated,
    TaskNoteUpdated,
    TaskStatusChanged,
    TaskPriorityChanged,
    TaskInboxEntered,
    TaskInboxLeft,
    TaskMovedSpace,
    TaskMovedProject,
    TaskDueUpdated,
    TaskScheduledUpdated,
    TaskReminderUpdated,
    TaskCompleted,
    TaskReopened,
    TaskCanceled,
    TaskArchived,
    TaskRestored,
    TaskDeleted,
    TaskPermanentlyDeleted,
    TaskSortChanged,
    TaskLinkAdded,
    TaskLinkUpdated,
    TaskLinkRemoved,
    ProjectCreated,
    ProjectNameUpdated,
    ProjectDescriptionUpdated,
    ProjectStatusChanged,
    ProjectPriorityChanged,
    ProjectPlannedUpdated,
    ProjectDueUpdated,
    ProjectRemindUpdated,
    ProjectCompleted,
    ProjectReopened,
    ProjectArchived,
    ProjectRestored,
    ProjectDeleted,
    ProjectPermanentlyDeleted,
    ProjectSortChanged,
    ViewCreated,
    ViewUpdated,
    ViewDeleted,
    ViewVisibilityChanged,
    SettingsUpdated,
}

impl ActivityAction {
    /// 返回写入数据库的稳定字符串值。
    pub fn as_str(self) -> &'static str {
        match self {
            Self::TaskCreated => "task.created",
            Self::TaskTitleUpdated => "task.title.updated",
            Self::TaskNoteUpdated => "task.note.updated",
            Self::TaskStatusChanged => "task.status.changed",
            Self::TaskPriorityChanged => "task.priority.changed",
            Self::TaskInboxEntered => "task.inbox.entered",
            Self::TaskInboxLeft => "task.inbox.left",
            Self::TaskMovedSpace => "task.moved.space",
            Self::TaskMovedProject => "task.moved.project",
            Self::TaskDueUpdated => "task.due.updated",
            Self::TaskScheduledUpdated => "task.scheduled.updated",
            Self::TaskReminderUpdated => "task.reminder.updated",
            Self::TaskCompleted => "task.completed",
            Self::TaskReopened => "task.reopened",
            Self::TaskCanceled => "task.canceled",
            Self::TaskArchived => "task.archived",
            Self::TaskRestored => "task.restored",
            Self::TaskDeleted => "task.deleted",
            Self::TaskPermanentlyDeleted => "task.permanently_deleted",
            Self::TaskSortChanged => "task.sort.changed",
            Self::TaskLinkAdded => "task.link.added",
            Self::TaskLinkUpdated => "task.link.updated",
            Self::TaskLinkRemoved => "task.link.removed",
            Self::ProjectCreated => "project.created",
            Self::ProjectNameUpdated => "project.name.updated",
            Self::ProjectDescriptionUpdated => "project.description.updated",
            Self::ProjectStatusChanged => "project.status.changed",
            Self::ProjectPriorityChanged => "project.priority.changed",
            Self::ProjectPlannedUpdated => "project.planned.updated",
            Self::ProjectDueUpdated => "project.due.updated",
            Self::ProjectRemindUpdated => "project.remind.updated",
            Self::ProjectCompleted => "project.completed",
            Self::ProjectReopened => "project.reopened",
            Self::ProjectArchived => "project.archived",
            Self::ProjectRestored => "project.restored",
            Self::ProjectDeleted => "project.deleted",
            Self::ProjectPermanentlyDeleted => "project.permanently_deleted",
            Self::ProjectSortChanged => "project.sort.changed",
            Self::ViewCreated => "view.created",
            Self::ViewUpdated => "view.updated",
            Self::ViewDeleted => "view.deleted",
            Self::ViewVisibilityChanged => "view.visibility.changed",
            Self::SettingsUpdated => "settings.updated",
        }
    }
}

impl fmt::Display for ActivityAction {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.as_str())
    }
}

impl Serialize for ActivityAction {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(self.as_str())
    }
}

#[cfg(test)]
mod tests {
    use super::ActivityAction;

    #[test]
    fn activity_action_should_serialize_to_stable_string() {
        let serialized = serde_json::to_string(&ActivityAction::TaskStatusChanged)
            .expect("activity action should serialize");

        assert_eq!(serialized, "\"task.status.changed\"");
    }
}

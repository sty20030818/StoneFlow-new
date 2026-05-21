import type { ProjectOption } from '@/features/project/model/types'
import type { TaskPriorityValue } from '@/features/task/model/taskPriority'
import type { TaskDetail, TaskStatus, UpdateTaskInput } from '@/shared/types'

export type TaskDetailDraft = {
	id: string
	title: string
	note: string
	status: TaskStatus
	priority: TaskPriorityValue
	spaceId: string
	projectId: string
	dueAt: string
	scheduledAt: string
	reminderAt: string
}

export type TaskDetailPatch = UpdateTaskInput

export function createTaskDetailDraft(task: TaskDetail): TaskDetailDraft {
	return {
		id: task.id,
		title: task.title,
		note: task.note ?? '',
		status: task.status,
		priority: task.priority,
		spaceId: task.spaceId,
		projectId: task.projectId ?? '',
		dueAt: task.dueAt ?? '',
		scheduledAt: task.scheduledAt ?? '',
		reminderAt: task.reminderAt ?? '',
	}
}

export function normalizeTaskDetailDraft(draft: TaskDetailDraft): TaskDetailDraft {
	return {
		...draft,
		title: draft.title.trim(),
		dueAt: draft.dueAt.trim(),
		scheduledAt: draft.scheduledAt.trim(),
		reminderAt: draft.reminderAt.trim(),
	}
}

export function getTaskDetailPatch(
	base: TaskDetailDraft,
	draft: TaskDetailDraft,
): TaskDetailPatch | null {
	const patch: TaskDetailPatch = {
		taskId: base.id,
	}

	if (draft.title && draft.title !== base.title) {
		patch.title = draft.title
	}

	const nextNote = draft.note.trim() ? draft.note : null
	const baseNote = base.note || null
	if (nextNote !== baseNote) {
		patch.note = nextNote
	}

	if (draft.status !== base.status) {
		patch.status = draft.status
	}

	if (draft.priority !== base.priority) {
		patch.priority = draft.priority
	}

	if (draft.spaceId !== base.spaceId) {
		patch.spaceId = draft.spaceId
	}

	const nextProjectId = draft.projectId || null
	const baseProjectId = base.projectId || null
	if (nextProjectId !== baseProjectId) {
		patch.projectId = nextProjectId
	}

	const nextDueAt = draft.dueAt || null
	const baseDueAt = base.dueAt || null
	if (nextDueAt !== baseDueAt) {
		patch.dueAt = nextDueAt
	}

	const nextScheduledAt = draft.scheduledAt || null
	const baseScheduledAt = base.scheduledAt || null
	if (nextScheduledAt !== baseScheduledAt) {
		patch.scheduledAt = nextScheduledAt
	}

	const nextReminderAt = draft.reminderAt || null
	const baseReminderAt = base.reminderAt || null
	if (nextReminderAt !== baseReminderAt) {
		patch.reminderAt = nextReminderAt
	}

	return Object.keys(patch).length > 1 ? patch : null
}

export function applyTaskProjectDraftChange(
	draft: TaskDetailDraft,
	projectId: string,
	projects: ProjectOption[],
): TaskDetailDraft {
	if (!projectId) {
		return {
			...draft,
			projectId: '',
		}
	}

	const nextProject = projects.find((project) => project.id === projectId)
	return {
		...draft,
		projectId,
		spaceId: nextProject?.spaceId ?? draft.spaceId,
	}
}

export function applyTaskSpaceDraftChange(
	draft: TaskDetailDraft,
	spaceId: string,
	projects: ProjectOption[],
): TaskDetailDraft {
	const shouldClearProject =
		draft.projectId &&
		!projects.some((project) => project.id === draft.projectId && project.spaceId === spaceId)

	return {
		...draft,
		spaceId,
		projectId: shouldClearProject ? '' : draft.projectId,
	}
}

import type { ProjectOption } from '@/features/project'
import type { TaskPlacementTarget } from '@/features/metadata-fields'
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
	inboxAt: string
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
		inboxAt: task.inboxAt ?? '',
		dueAt: task.dueAt ?? '',
		scheduledAt: task.scheduledAt ?? '',
		reminderAt: task.reminderAt ?? '',
	}
}

export function normalizeTaskDetailDraft(draft: TaskDetailDraft): TaskDetailDraft {
	return {
		...draft,
		title: draft.title.trim(),
		inboxAt: draft.inboxAt.trim(),
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

	const nextPlacement = toTaskPlacementPatch(draft)
	const basePlacement = toTaskPlacementPatch(base)
	if (
		nextPlacement.kind !== basePlacement.kind ||
		nextPlacement.spaceId !== basePlacement.spaceId ||
		(nextPlacement.kind === 'project' &&
			basePlacement.kind === 'project' &&
			nextPlacement.projectId !== basePlacement.projectId)
	) {
		patch.placement = nextPlacement
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

export function applyTaskPlacementDraftChange(
	draft: TaskDetailDraft,
	target: TaskPlacementTarget,
): TaskDetailDraft {
	if (target.kind === 'project') {
		return {
			...draft,
			spaceId: target.spaceId,
			projectId: target.projectId,
			inboxAt: '',
		}
	}

	if (target.kind === 'inbox') {
		return {
			...draft,
			spaceId: target.spaceId,
			projectId: '',
			inboxAt: new Date().toISOString(),
		}
	}

	return {
		...draft,
		spaceId: target.spaceId,
		projectId: '',
		inboxAt: '',
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

function toTaskPlacementPatch(draft: TaskDetailDraft): NonNullable<UpdateTaskInput['placement']> {
	if (draft.projectId) {
		return {
			kind: 'project',
			spaceId: draft.spaceId,
			projectId: draft.projectId,
		}
	}

	if (draft.inboxAt) {
		return {
			kind: 'inbox',
			spaceId: draft.spaceId,
		}
	}

	return {
		kind: 'noProject',
		spaceId: draft.spaceId,
	}
}

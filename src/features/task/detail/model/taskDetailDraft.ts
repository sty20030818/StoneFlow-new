import type { TaskPlacementTarget } from '@/features/metadata-fields'
import type { TaskPriorityValue } from '@/features/task/model/taskPriority'
import { resolveTaskPlacementTarget } from '@/features/task/model/taskPlacementTarget'
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
	plannedAt: string
	remindAt: string
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
		plannedAt: task.plannedAt ?? '',
		remindAt: task.remindAt ?? '',
	}
}

export function normalizeTaskDetailDraft(draft: TaskDetailDraft): TaskDetailDraft {
	return {
		...draft,
		title: draft.title.trim(),
		dueAt: draft.dueAt.trim(),
		plannedAt: draft.plannedAt.trim(),
		remindAt: draft.remindAt.trim(),
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

	const nextScheduledAt = draft.plannedAt || null
	const baseScheduledAt = base.plannedAt || null
	if (nextScheduledAt !== baseScheduledAt) {
		patch.plannedAt = nextScheduledAt
	}

	const nextReminderAt = draft.remindAt || null
	const baseReminderAt = base.remindAt || null
	if (nextReminderAt !== baseReminderAt) {
		patch.remindAt = nextReminderAt
	}

	return Object.keys(patch).length > 1 ? patch : null
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
		}
	}

	return {
		...draft,
		spaceId: target.spaceId,
		projectId: '',
	}
}

function toTaskPlacementPatch(draft: TaskDetailDraft): NonNullable<UpdateTaskInput['placement']> {
	return resolveTaskPlacementTarget({
		spaceId: draft.spaceId,
		projectId: draft.projectId || null,
	})
}

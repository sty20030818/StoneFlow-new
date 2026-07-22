import type { Scope } from './space'
import type { TaskPriority } from './taskPriority'

export type TaskStatus = 'todo' | 'doing' | 'waiting' | 'done' | 'canceled'

export type TaskListViewKey =
	| 'active'
	| 'completed'
	| 'canceled'
	| 'archived'
	| 'all'
	| 'today'
	| 'focus'
	| 'upcoming'
	| 'overdue'

export type TaskPlacement = 'project' | 'inbox' | 'noProject'

export type TaskListPlacementInput =
	| {
			kind: 'all'
	  }
	| {
			kind: 'project'
			projectId: string
	  }
	| { kind: 'inbox' }
	| {
			kind: 'noProject'
	  }

export type TaskCreatePlacementInput =
	| {
			kind: 'project'
			projectId: string
	  }
	| { kind: 'inbox' }
	| {
			kind: 'noProject'
	  }

export type TaskUpdatePlacementInput =
	| {
			kind: 'project'
			spaceId: string
			projectId: string
	  }
	| { kind: 'inbox'; spaceId: string }
	| {
			kind: 'noProject'
			spaceId: string
	  }

export type Task = {
	id: string
	title: string
	note: string | null
	priority: TaskPriority
	status: TaskStatus
	projectId: string | null
	projectName: string | null
	inboxAt: string | null
	pinned: boolean
}

export type TaskView = Task & {
	dueLabel: string | null
	completedLabel: string | null
	createdLabel: string
	updatedLabel: string
	viewKeys: string[]
}

export type TaskListItem = {
	id: string
	spaceId: string
	spaceName: string
	spaceSlug: string
	projectId: string | null
	projectName: string | null
	inboxAt: string | null
	title: string
	note: string | null
	status: TaskStatus
	statusChangedAt: string
	priority: TaskPriority
	dueAt: string | null
	plannedAt: string | null
	remindAt: string | null
	completedAt: string | null
	canceledAt: string | null
	archivedAt: string | null
	createdAt: string
	updatedAt: string
}

export type TaskDetail = TaskListItem & {
	position: number
	deletedAt: string | null
}

export type TaskLink = {
	id: string
	taskId: string
	title: string
	url: string
	position: number
	createdAt: string
	updatedAt: string
}

export type ListTasksInput = {
	scope: Scope
	viewKey: TaskListViewKey
	placement: TaskListPlacementInput
}

export type CreateTaskInput = {
	spaceId?: string | null
	placement: TaskCreatePlacementInput
	title: string
	note?: string | null
	status?: TaskStatus | null
	priority?: TaskPriority | null
	dueAt?: string | null
	plannedAt?: string | null
	remindAt?: string | null
}

export type UpdateTaskInput = {
	taskId: string
	title?: string
	note?: string | null
	status?: TaskStatus
	priority?: TaskPriority
	placement?: TaskUpdatePlacementInput
	dueAt?: string | null
	plannedAt?: string | null
	remindAt?: string | null
	position?: number
}

export type ListTaskLinksInput = {
	taskId: string
}

export type CreateTaskLinkInput = {
	taskId: string
	title: string
	url: string
}

export type UpdateTaskLinkInput = {
	linkId: string
	title?: string
	url?: string
}

export type DeleteTaskLinkInput = {
	linkId: string
}

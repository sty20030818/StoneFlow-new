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

export type TaskPlacement = 'project' | 'standalone'

export type TaskListPlacementInput =
	| {
			kind: 'all'
	  }
	| {
			kind: 'project'
			projectId: string
	  }
	| {
			kind: 'standalone'
	  }

export type TaskCreatePlacementInput =
	| {
			kind: 'project'
			projectId: string
	  }
	| {
			kind: 'standalone'
	  }

export type TaskUpdatePlacementInput =
	| {
			kind: 'project'
			spaceId: string
			projectId: string
	  }
	| {
			kind: 'standalone'
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
	pinned: boolean
}

export type TaskView = Task & {
	dueLabel: string | null
	completedLabel: string | null
	createdLabel: string
	updatedLabel: string
	viewKeys: string[]
}

/** 列表投影：不含 note，详情/预览走 TaskDetail */
export type TaskListItem = {
	id: string
	spaceId: string
	spaceName: string
	spaceSlug: string
	projectId: string | null
	projectName: string | null
	title: string
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
	note: string | null
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
	/** 可选 status 下推；省略表示不限 status（仍受 lifecycle 约束） */
	statuses?: TaskStatus[]
	/** 页大小；省略用后端默认 */
	limit?: number
	/** keyset 游标；省略为第一页 */
	cursor?: string | null
}

export type ListTasksPage = {
	items: TaskListItem[]
	nextCursor: string | null
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

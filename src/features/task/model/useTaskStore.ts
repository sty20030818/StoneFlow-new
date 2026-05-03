import { create } from 'zustand'

import {
	archiveTask,
	createTask,
	deleteTask,
	getDefaultTaskViewKey,
	getTaskDetail,
	leaveInboxAsNoProject,
	leaveInboxToProject,
	listTasks,
	moveTaskToInbox,
	restoreTask,
	updateTask,
} from '@/features/task/api/tasks'
import { emitEvent } from '@/shared/events'
import type {
	CreateTaskInput,
	LeaveInboxAsNoProjectInput,
	LeaveInboxToProjectInput,
	ListTasksInput,
	MoveTaskToInboxInput,
	TaskDetail,
	TaskListItem,
	TaskListViewKey,
	UpdateTaskInput,
} from '@/shared/types'

type LoadStatus = 'idle' | 'loading' | 'ready' | 'error'

type TaskListSlice = {
	items: TaskListItem[]
	status: LoadStatus
	error: string | null
	input: ListTasksInput | null
}

type TaskDetailSlice = {
	item: TaskDetail | null
	status: LoadStatus
	error: string | null
	taskId: string | null
}

type TaskStoreState = {
	list: TaskListSlice
	detail: TaskDetailSlice
	loadList: (input: ListTasksInput) => Promise<void>
	loadDetail: (taskId: string) => Promise<void>
	clearDetail: () => void
	refreshLoadedSlices: () => Promise<void>
	createTask: (input: CreateTaskInput) => Promise<TaskDetail>
	updateTask: (input: UpdateTaskInput) => Promise<TaskDetail>
	archiveTask: (taskId: string) => Promise<TaskDetail>
	restoreTask: (taskId: string) => Promise<TaskDetail>
	deleteTask: (taskId: string) => Promise<TaskDetail>
	moveTaskToInbox: (input: MoveTaskToInboxInput) => Promise<TaskDetail>
	leaveInboxToProject: (input: LeaveInboxToProjectInput) => Promise<TaskDetail>
	leaveInboxAsNoProject: (input: LeaveInboxAsNoProjectInput) => Promise<TaskDetail>
}

async function fetchList(input: ListTasksInput) {
	return listTasks({
		...input,
		viewKey: input.viewKey ?? getDefaultTaskViewKey(),
	})
}

export const useTaskStore = create<TaskStoreState>((set, get) => {
	async function refreshLoadedSlices() {
		const { list, detail } = get()

		if (list.input) {
			try {
				const items = await fetchList(list.input)
				set((state) => ({
					list: {
						...state.list,
						items,
						status: 'ready',
						error: null,
					},
				}))
			} catch (error) {
				set((state) => ({
					list: {
						...state.list,
						status: state.list.items.length > 0 ? 'ready' : 'error',
						error: error instanceof Error ? error.message : 'Task 列表刷新失败',
					},
				}))
			}
		}

		if (detail.taskId) {
			try {
				const item = await getTaskDetail(detail.taskId)
				set((state) => ({
					detail: {
						...state.detail,
						item,
						status: 'ready',
						error: null,
					},
				}))
			} catch (error) {
				set((state) => ({
					detail: {
						...state.detail,
						status: 'error',
						error: error instanceof Error ? error.message : 'Task 详情刷新失败',
					},
				}))
			}
		}
	}

	async function runMutation(
		runner: () => Promise<TaskDetail>,
		eventType: 'task:created' | 'task:updated' | 'task:deleted',
		lifecycleChanged = false,
	) {
		const detail = await runner()
		emitEvent({
			type: eventType,
			payload: { taskId: detail.id },
		})
		if (lifecycleChanged) {
			emitEvent({
				type: 'lifecycle:changed',
				payload: { entityType: 'task', entityId: detail.id },
			})
		}
		await refreshLoadedSlices()
		return detail
	}

	return {
		list: {
			items: [],
			status: 'idle',
			error: null,
			input: null,
		},
		detail: {
			item: null,
			status: 'idle',
			error: null,
			taskId: null,
		},

		loadList: async (input) => {
			set((state) => ({
				list: {
					...state.list,
					status: 'loading',
					error: null,
					input,
				},
			}))

			try {
				const items = await fetchList(input)
				set((state) => ({
					list: {
						...state.list,
						items,
						status: 'ready',
						error: null,
					},
				}))
			} catch (error) {
				set((state) => ({
					list: {
						...state.list,
						items: [],
						status: 'error',
						error: error instanceof Error ? error.message : 'Task 列表加载失败',
					},
				}))
			}
		},

		loadDetail: async (taskId) => {
			set((state) => ({
				detail: {
					...state.detail,
					status: 'loading',
					error: null,
					taskId,
				},
			}))

			try {
				const item = await getTaskDetail(taskId)
				set((state) => ({
					detail: {
						...state.detail,
						item,
						status: 'ready',
						error: null,
					},
				}))
			} catch (error) {
				set((state) => ({
					detail: {
						...state.detail,
						item: null,
						status: 'error',
						error: error instanceof Error ? error.message : 'Task 详情加载失败',
					},
				}))
			}
		},

		clearDetail: () =>
			set({
				detail: {
					item: null,
					status: 'idle',
					error: null,
					taskId: null,
				},
			}),

		refreshLoadedSlices,

		createTask: async (input) => runMutation(() => createTask(input), 'task:created'),
		updateTask: async (input) => runMutation(() => updateTask(input), 'task:updated'),
		archiveTask: async (taskId) => runMutation(() => archiveTask(taskId), 'task:updated', true),
		restoreTask: async (taskId) => runMutation(() => restoreTask(taskId), 'task:updated', true),
		deleteTask: async (taskId) => runMutation(() => deleteTask(taskId), 'task:deleted', true),
		moveTaskToInbox: async (input) => runMutation(() => moveTaskToInbox(input), 'task:updated'),
		leaveInboxToProject: async (input) =>
			runMutation(() => leaveInboxToProject(input), 'task:updated'),
		leaveInboxAsNoProject: async (input) =>
			runMutation(() => leaveInboxAsNoProject(input), 'task:updated'),
	}
})

export const selectTaskList = (state: TaskStoreState) => state.list
export const selectTaskDetail = (state: TaskStoreState) => state.detail
export const selectTaskListItems = (state: TaskStoreState) => state.list.items
export const selectTaskDetailItem = (state: TaskStoreState) => state.detail.item
export const selectTaskListViewKey = (state: TaskStoreState): TaskListViewKey =>
	state.list.input?.viewKey ?? getDefaultTaskViewKey()

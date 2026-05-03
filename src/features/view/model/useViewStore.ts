import { create } from 'zustand'

import {
	createView,
	deleteView,
	listViews,
	reorderViews,
	runTaskView,
	toggleViewVisible,
	updateView,
} from '@/features/view/api/views'
import type {
	CreateViewInput,
	ReorderViewsInput,
	RunTaskViewInput,
	RunTaskViewResult,
	UpdateViewInput,
	View,
	ViewEntityType,
} from '@/shared/types'

type LoadStatus = 'idle' | 'loading' | 'ready' | 'error'

type ViewListSlice = {
	items: View[]
	status: LoadStatus
	error: string | null
	entityType: ViewEntityType
}

type TaskViewRunSlice = {
	item: RunTaskViewResult | null
	status: LoadStatus
	error: string | null
	input: RunTaskViewInput | null
}

type ViewStoreState = {
	taskViews: ViewListSlice
	projectViews: ViewListSlice
	taskRun: TaskViewRunSlice

	loadTaskViews: (visibleOnly?: boolean) => Promise<void>
	loadProjectViews: (visibleOnly?: boolean) => Promise<void>
	runTaskView: (input: RunTaskViewInput) => Promise<void>
	refreshTaskRun: () => Promise<void>

	createTaskView: (input: CreateViewInput) => Promise<View>
	updateTaskView: (input: UpdateViewInput) => Promise<View>
	deleteTaskView: (viewId: string) => Promise<void>
	toggleTaskViewVisible: (viewId: string, visible: boolean) => Promise<View>
	reorderTaskViews: (input: ReorderViewsInput) => Promise<View[]>
}

async function refreshViewList(entityType: ViewEntityType) {
	return listViews(entityType, false)
}

export const useViewStore = create<ViewStoreState>((set, get) => {
	async function refreshTaskViews() {
		const items = await refreshViewList('task')
		set((state) => ({
			taskViews: {
				...state.taskViews,
				items,
				status: 'ready',
				error: null,
			},
		}))
	}

	async function refreshProjectViews() {
		const items = await refreshViewList('project')
		set((state) => ({
			projectViews: {
				...state.projectViews,
				items,
				status: 'ready',
				error: null,
			},
		}))
	}

	async function refreshTaskRun() {
		const { taskRun } = get()
		if (!taskRun.input) {
			return
		}

		try {
			const item = await runTaskView(taskRun.input)
			set((state) => ({
				taskRun: {
					...state.taskRun,
					item,
					status: 'ready',
					error: null,
				},
			}))
		} catch (error) {
			set((state) => ({
				taskRun: {
					...state.taskRun,
					status: state.taskRun.item ? 'ready' : 'error',
					error: error instanceof Error ? error.message : 'View 结果刷新失败',
				},
			}))
		}
	}

	async function runTaskViewMutation(runner: () => Promise<unknown>) {
		await runner()
		await Promise.all([refreshTaskViews(), refreshTaskRun()])
	}

	return {
		taskViews: {
			items: [],
			status: 'idle',
			error: null,
			entityType: 'task',
		},
		projectViews: {
			items: [],
			status: 'idle',
			error: null,
			entityType: 'project',
		},
		taskRun: {
			item: null,
			status: 'idle',
			error: null,
			input: null,
		},

		loadTaskViews: async () => {
			set((state) => ({
				taskViews: {
					...state.taskViews,
					status: 'loading',
					error: null,
				},
			}))

			try {
				await refreshTaskViews()
			} catch (error) {
				set((state) => ({
					taskViews: {
						...state.taskViews,
						items: [],
						status: 'error',
						error: error instanceof Error ? error.message : 'Task Views 加载失败',
					},
				}))
			}
		},

		loadProjectViews: async () => {
			set((state) => ({
				projectViews: {
					...state.projectViews,
					status: 'loading',
					error: null,
				},
			}))

			try {
				await refreshProjectViews()
			} catch (error) {
				set((state) => ({
					projectViews: {
						...state.projectViews,
						items: [],
						status: 'error',
						error: error instanceof Error ? error.message : 'Project Views 加载失败',
					},
				}))
			}
		},

		runTaskView: async (input) => {
			set((state) => ({
				taskRun: {
					...state.taskRun,
					status: 'loading',
					error: null,
					input,
				},
			}))

			try {
				const item = await runTaskView(input)
				set((state) => ({
					taskRun: {
						...state.taskRun,
						item,
						status: 'ready',
						error: null,
					},
				}))
			} catch (error) {
				set((state) => ({
					taskRun: {
						...state.taskRun,
						item: null,
						status: 'error',
						error: error instanceof Error ? error.message : 'Task View 运行失败',
					},
				}))
			}
		},

		refreshTaskRun,

		createTaskView: async (input) => {
			let created: View | null = null
			await runTaskViewMutation(async () => {
				created = await createView(input)
			})

			if (!created) {
				throw new Error('创建视图失败')
			}

			return created
		},

		updateTaskView: async (input) => {
			let updated: View | null = null
			await runTaskViewMutation(async () => {
				updated = await updateView(input)
			})

			if (!updated) {
				throw new Error('更新视图失败')
			}

			return updated
		},

		deleteTaskView: async (viewId) => {
			await runTaskViewMutation(() => deleteView(viewId))
		},

		toggleTaskViewVisible: async (viewId, visible) => {
			let updated: View | null = null
			await runTaskViewMutation(async () => {
				updated = await toggleViewVisible(viewId, visible)
			})

			if (!updated) {
				throw new Error('切换视图可见性失败')
			}

			return updated
		},

		reorderTaskViews: async (input) => {
			let result: View[] = []
			await runTaskViewMutation(async () => {
				result = await reorderViews(input)
			})

			return result
		},
	}
})

export const selectTaskViews = (state: ViewStoreState) => state.taskViews
export const selectProjectViews = (state: ViewStoreState) => state.projectViews
export const selectTaskViewRun = (state: ViewStoreState) => state.taskRun

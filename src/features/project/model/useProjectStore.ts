import { create } from 'zustand'

import {
	archiveProject,
	completeProject,
	createProject,
	deleteProject,
	getProjectDetail,
	listProjectOverview,
	listSidebarProjects,
	reopenProject,
	restoreProject,
	updateProject,
} from '@/features/project/api/projects'
import type {
	ProjectDetail,
	ProjectFormInput,
	ProjectOption,
	ProjectOverviewItem,
	ProjectOverviewViewKey,
	ProjectSidebarItem,
	ProjectUpdateInput,
} from '@/features/project/model/types'
import { MOCK_PROJECT, TASK_RECORDS } from '@/features/workspace-shell/model/shellData'
import type { Scope } from '@/shared/types'

type LoadStatus = 'idle' | 'loading' | 'ready' | 'error'

type ProjectOverviewSlice = {
	items: ProjectOverviewItem[]
	status: LoadStatus
	error: string | null
	scope: Scope | null
	viewKey: ProjectOverviewViewKey
}

type ProjectSidebarSlice = {
	items: ProjectSidebarItem[]
	options: ProjectOption[]
	status: LoadStatus
	error: string | null
	scope: Scope | null
}

type ProjectDetailSlice = {
	item: ProjectDetail | null
	status: LoadStatus
	error: string | null
	projectId: string | null
}

type ProjectStoreState = {
	overview: ProjectOverviewSlice
	sidebar: ProjectSidebarSlice
	detail: ProjectDetailSlice

	loadOverview: (scope: Scope, viewKey: ProjectOverviewViewKey) => Promise<void>
	loadSidebar: (scope: Scope) => Promise<void>
	loadDetail: (projectId: string) => Promise<void>
	clearDetail: () => void

	createProject: (input: ProjectFormInput) => Promise<ProjectDetail>
	updateProject: (input: ProjectUpdateInput) => Promise<ProjectDetail>
	completeProject: (projectId: string) => Promise<ProjectDetail>
	reopenProject: (projectId: string) => Promise<ProjectDetail>
	archiveProject: (projectId: string) => Promise<ProjectDetail>
	restoreProject: (projectId: string) => Promise<ProjectDetail>
	deleteProject: (projectId: string) => Promise<ProjectDetail>
}

const DEFAULT_OVERVIEW_VIEW: ProjectOverviewViewKey = 'active'

export const useProjectStore = create<ProjectStoreState>((set, get) => {
	async function refreshLoadedSlices(updatedProject?: ProjectDetail) {
		const { overview, sidebar, detail } = get()

		if (overview.scope) {
			try {
				const items = await listProjectOverview(overview.scope, overview.viewKey)
				set((state) => ({
					overview: {
						...state.overview,
						items,
						status: 'ready',
						error: null,
					},
				}))
			} catch (error) {
				set((state) => ({
					overview: {
						...state.overview,
						status: state.overview.items.length > 0 ? 'ready' : 'error',
						error: error instanceof Error ? error.message : 'Project Overview 刷新失败',
					},
				}))
			}
		}

		if (sidebar.scope) {
			try {
				const items = await listSidebarProjects(sidebar.scope)
				set((state) => ({
					sidebar: {
						...state.sidebar,
						items,
						status: 'ready',
						error: null,
					},
				}))
			} catch (error) {
				set((state) => ({
					sidebar: {
						...state.sidebar,
						status: state.sidebar.items.length > 0 ? 'ready' : 'error',
						error: error instanceof Error ? error.message : 'Projects 快捷区刷新失败',
					},
				}))
			}
		}

		if (detail.projectId && updatedProject && detail.projectId === updatedProject.id) {
			set((state) => ({
				detail: {
					...state.detail,
					item: updatedProject,
					status: 'ready',
					error: null,
				},
			}))
		}
	}

	async function runMutation(runner: () => Promise<ProjectDetail>): Promise<ProjectDetail> {
		const project = await runner()
		await refreshLoadedSlices(project)
		return project
	}

	return {
		overview: {
			items: [],
			status: 'idle',
			error: null,
			scope: null,
			viewKey: DEFAULT_OVERVIEW_VIEW,
		},
		sidebar: {
			items: [],
			options: [],
			status: 'idle',
			error: null,
			scope: null,
		},
		detail: {
			item: null,
			status: 'idle',
			error: null,
			projectId: null,
		},

		loadOverview: async (scope, viewKey) => {
			set((state) => ({
				overview: {
					...state.overview,
					status: 'loading',
					error: null,
					scope,
					viewKey,
				},
			}))

			try {
				const items = await listProjectOverview(scope, viewKey)
				// mock project 始终追加（active/all 视图下）
				const showMock = viewKey === 'active' || viewKey === 'all'
				const hasMock = items.some((p) => p.id === MOCK_PROJECT.id)
				set((state) => ({
					overview: {
						...state.overview,
						items: showMock && !hasMock ? [...items, MOCK_PROJECT] : items,
						status: 'ready',
						error: null,
					},
				}))
			} catch {
				const mockItems = viewKey === 'active' || viewKey === 'all' ? [MOCK_PROJECT] : []
				set((state) => ({
					overview: {
						...state.overview,
						items: mockItems,
						status: 'ready',
						error: null,
					},
				}))
			}
		},

		loadSidebar: async (scope) => {
			set((state) => ({
				sidebar: {
					...state.sidebar,
					status: 'loading',
					error: null,
					scope,
				},
			}))

			try {
				const items = await listSidebarProjects(scope)
				// mock project 追加到 sidebar
				const hasMock = items.some((p) => p.id === MOCK_PROJECT.id)
				const mockSidebarItem: ProjectSidebarItem = {
					id: MOCK_PROJECT.id,
					spaceId: MOCK_PROJECT.spaceId,
					name: MOCK_PROJECT.name,
					sortOrder: MOCK_PROJECT.sortOrder,
					taskCount: MOCK_PROJECT.taskCount,
					activeTaskCount: MOCK_PROJECT.activeTaskCount,
					completedAt: MOCK_PROJECT.completedAt,
					updatedAt: MOCK_PROJECT.updatedAt,
				}
				const allItems = hasMock ? items : [...items, mockSidebarItem]
				const options: ProjectOption[] = allItems.map((project) => ({
					id: project.id,
					name: project.name,
				}))
				set((state) => ({
					sidebar: {
						...state.sidebar,
						items: allItems,
						options,
						status: 'ready',
						error: null,
					},
				}))
			} catch {
				const mockSidebarItem: ProjectSidebarItem = {
					id: MOCK_PROJECT.id,
					spaceId: MOCK_PROJECT.spaceId,
					name: MOCK_PROJECT.name,
					sortOrder: MOCK_PROJECT.sortOrder,
					taskCount: MOCK_PROJECT.taskCount,
					activeTaskCount: MOCK_PROJECT.activeTaskCount,
					completedAt: MOCK_PROJECT.completedAt,
					updatedAt: MOCK_PROJECT.updatedAt,
				}
				set((state) => ({
					sidebar: {
						...state.sidebar,
						items: [mockSidebarItem],
						options: [{ id: MOCK_PROJECT.id, name: MOCK_PROJECT.name }],
						status: 'ready',
						error: null,
					},
				}))
			}
		},

		loadDetail: async (projectId) => {
			set((state) => ({
				detail: {
					...state.detail,
					status: 'loading',
					error: null,
					projectId,
				},
			}))

			try {
				const item = await getProjectDetail(projectId)
				set((state) => ({
					detail: {
						...state.detail,
						item,
						status: 'ready',
						error: null,
					},
				}))
			} catch {
				// Tauri IPC 失败时 fallback 到 mock 数据
				const activeTasks = TASK_RECORDS.filter(
					(t) => t.projectId === projectId && t.status === 'todo',
				)
				const allTasks = TASK_RECORDS.filter((t) => t.projectId === projectId)
				const mockDetail: ProjectDetail = {
					id: MOCK_PROJECT.id,
					spaceId: MOCK_PROJECT.spaceId,
					name: MOCK_PROJECT.name,
					description: MOCK_PROJECT.description,
					dueAt: MOCK_PROJECT.dueAt,
					sortOrder: MOCK_PROJECT.sortOrder,
					completedAt: MOCK_PROJECT.completedAt,
					archivedAt: MOCK_PROJECT.archivedAt,
					deletedAt: MOCK_PROJECT.deletedAt,
					createdAt: MOCK_PROJECT.createdAt,
					updatedAt: MOCK_PROJECT.updatedAt,
					spaceName: MOCK_PROJECT.spaceName,
					taskCount: allTasks.length,
					activeTaskCount: activeTasks.length,
				}
				set((state) => ({
					detail: {
						...state.detail,
						item: mockDetail,
						status: 'ready',
						error: null,
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
					projectId: null,
				},
			}),

		createProject: async (input) => runMutation(() => createProject(input)),
		updateProject: async (input) => runMutation(() => updateProject(input)),
		completeProject: async (projectId) => runMutation(() => completeProject(projectId)),
		reopenProject: async (projectId) => runMutation(() => reopenProject(projectId)),
		archiveProject: async (projectId) => runMutation(() => archiveProject(projectId)),
		restoreProject: async (projectId) => runMutation(() => restoreProject(projectId)),
		deleteProject: async (projectId) => runMutation(() => deleteProject(projectId)),
	}
})

export const selectProjectOverview = (state: ProjectStoreState) => state.overview
export const selectProjectSidebar = (state: ProjectStoreState) => state.sidebar
export const selectProjectDetail = (state: ProjectStoreState) => state.detail

export const selectProjectOptions = (state: ProjectStoreState): ProjectOption[] =>
	state.sidebar.options

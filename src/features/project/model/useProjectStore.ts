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
						items: [],
						status: 'error',
						error: error instanceof Error ? error.message : 'Project Overview 加载失败',
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
				const options: ProjectOption[] = items.map((project) => ({
					id: project.id,
					name: project.name,
				}))
				set((state) => ({
					sidebar: {
						...state.sidebar,
						items,
						options,
						status: 'ready',
						error: null,
					},
				}))
			} catch (error) {
				set((state) => ({
					sidebar: {
						...state.sidebar,
						items: [],
						options: [],
						status: 'error',
						error: error instanceof Error ? error.message : 'Projects 快捷区加载失败',
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
			} catch (error) {
				set((state) => ({
					detail: {
						...state.detail,
						item: null,
						status: 'error',
						error: error instanceof Error ? error.message : 'Project Detail 加载失败',
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

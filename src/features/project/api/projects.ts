import { invoke } from '@tauri-apps/api/core'

import type { Scope } from '@/shared/types'
import type {
	ProjectDetail,
	ProjectFormInput,
	ProjectOverviewItem,
	ProjectOverviewViewKey,
	ProjectSidebarItem,
	ProjectUpdateInput,
} from '../model/types'

type ProjectScopePayload =
	| {
			type: 'all'
	  }
	| {
			type: 'space'
			spaceId: string
	  }

function toScopePayload(scope: Scope): ProjectScopePayload {
	return scope.type === 'all' ? { type: 'all' } : { type: 'space', spaceId: scope.spaceId }
}

export async function listProjectOverview(scope: Scope, viewKey: ProjectOverviewViewKey) {
	return invoke<ProjectOverviewItem[]>('list_project_overview', {
		input: {
			scope: toScopePayload(scope),
			viewKey,
		},
	})
}

/**
 * 读取所有可见项目，供跨 Space 的轻量选择器使用。
 */
export async function listAllVisibleProjects() {
	return listProjectOverview({ type: 'all' }, 'all')
}

export async function listSidebarProjects(scope: Scope) {
	return invoke<ProjectSidebarItem[]>('list_sidebar_projects', {
		input: {
			scope: toScopePayload(scope),
			showCompleted: true,
			maxVisible: null,
		},
	})
}

export async function getProjectDetail(projectId: string) {
	return invoke<ProjectDetail>('get_project_detail', {
		input: { projectId },
	})
}

export async function createProject(input: ProjectFormInput) {
	return invoke<ProjectDetail>('create_project', {
		input: {
			spaceId: input.spaceId,
			name: input.name,
			description: input.description ?? null,
			dueAt: input.dueAt ?? null,
			...(input.status === undefined ? {} : { status: input.status }),
			...(input.priority === undefined ? {} : { priority: input.priority }),
			...(input.plannedAt === undefined ? {} : { plannedAt: input.plannedAt }),
			...(input.remindAt === undefined ? {} : { remindAt: input.remindAt }),
		},
	})
}

export async function updateProject(input: ProjectUpdateInput) {
	return invoke<ProjectDetail>('update_project', {
		input: {
			projectId: input.projectId,
			name: input.name,
			description: input.description,
			dueAt: input.dueAt,
			...(input.status === undefined ? {} : { status: input.status }),
			...(input.priority === undefined ? {} : { priority: input.priority }),
			...(input.plannedAt === undefined ? {} : { plannedAt: input.plannedAt }),
			...(input.remindAt === undefined ? {} : { remindAt: input.remindAt }),
			...(input.position === undefined ? {} : { position: input.position }),
		},
	})
}

export async function completeProject(projectId: string) {
	return updateProject({ projectId, status: 'done' })
}

export async function reopenProject(projectId: string) {
	return updateProject({ projectId, status: 'todo' })
}

export async function archiveProject(projectId: string) {
	return invoke<ProjectDetail>('archive_project', {
		input: { projectId },
	})
}

export async function restoreProject(projectId: string) {
	return invoke<ProjectDetail>('restore_project', {
		input: { projectId },
	})
}

export async function deleteProject(projectId: string) {
	return invoke<ProjectDetail>('delete_project', {
		input: { projectId },
	})
}

import { invoke } from '@tauri-apps/api/core'

import type { ProjectExecutionView } from '@/features/project/model/types'

type GetProjectExecutionViewCommandInput = {
	spaceSlug: string
	projectId: string
}

type ProjectExecutionProjectResponse = {
	id: string
	name: string
	status: string
	sort_order: number
}

type ProjectExecutionTaskResponse = {
	id: string
	title: string
	note: string | null
	priority: string
	status: 'todo' | 'done'
	due_at: string | null
	completed_at: string | null
	created_at: string
	updated_at: string
}

type ProjectExecutionViewResponse = {
	project: ProjectExecutionProjectResponse
	child_projects: ProjectExecutionProjectResponse[]
	tasks: ProjectExecutionTaskResponse[]
}

/**
 * 查询单个 Project 的执行视图。
 */
export async function getProjectExecutionView(input: GetProjectExecutionViewCommandInput) {
	const payload = await invoke<ProjectExecutionViewResponse>('get_project_execution_view', {
		input: {
			space_slug: input.spaceSlug,
			project_id: input.projectId,
		},
	})

	return {
		project: {
			id: payload.project.id,
			parentProjectId: null,
			name: payload.project.name,
			status: payload.project.status,
			sortOrder: payload.project.sort_order,
			children: [],
		},
		childProjects: payload.child_projects.map((project) => ({
			id: project.id,
			parentProjectId: payload.project.id,
			name: project.name,
			status: project.status,
			sortOrder: project.sort_order,
			children: [],
		})),
		tasks: payload.tasks.map((task) => ({
			id: task.id,
			title: task.title,
			note: task.note,
			priority: task.priority,
			status: task.status,
			tags: [],
			dueAt: task.due_at,
			completedAt: task.completed_at,
			createdAt: task.created_at,
			updatedAt: task.updated_at,
		})),
	} satisfies ProjectExecutionView
}

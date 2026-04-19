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
	completed_at: string | null
	updated_at: string
}

type ProjectExecutionViewResponse = {
	project: ProjectExecutionProjectResponse
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
			name: payload.project.name,
			status: payload.project.status,
			sortOrder: payload.project.sort_order,
		},
		tasks: payload.tasks.map((task) => ({
			id: task.id,
			title: task.title,
			note: task.note,
			priority: task.priority,
			status: task.status,
			completedAt: task.completed_at,
			updatedAt: task.updated_at,
		})),
	} satisfies ProjectExecutionView
}

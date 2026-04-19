import { invoke } from '@tauri-apps/api/core'

import type { ProjectRecord } from '@/features/project/model/types'

type ListProjectsCommandInput = {
	spaceSlug: string
}

type ProjectListItemResponse = {
	id: string
	name: string
	status: string
	sort_order: number
}

type ProjectListResponse = {
	projects: ProjectListItemResponse[]
}

/**
 * 查询当前 Space 下的真实项目列表。
 */
export async function listProjects(input: ListProjectsCommandInput) {
	const payload = await invoke<ProjectListResponse>('list_projects', {
		input: {
			space_slug: input.spaceSlug,
		},
	})

	return payload.projects.map((project) => ({
		id: project.id,
		name: project.name,
		status: project.status,
		sortOrder: project.sort_order,
	})) satisfies ProjectRecord[]
}

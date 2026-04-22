import { invoke } from '@tauri-apps/api/core'
import { getCurrentWindow } from '@tauri-apps/api/window'

export type WorkspaceTaskSearchItem = {
	id: string
	title: string
	note: string | null
	priority: string | null
	projectId: string | null
	projectName: string | null
	updatedAt: string
}

export type WorkspaceProjectSearchItem = {
	id: string
	name: string
	note: string | null
	status: string
	sortOrder: number
}

export type WorkspaceSearchResult = {
	spaceSlug?: string | null
	tasks: WorkspaceTaskSearchItem[]
	projects: WorkspaceProjectSearchItem[]
}

type SearchWorkspaceCommandInput = {
	spaceSlug: string
	query: string
	limit?: number
}

type SearchWorkspaceTaskResponse = {
	id: string
	title: string
	note: string | null
	priority: string | null
	project_id: string | null
	project_name: string | null
	updated_at: string
}

type SearchWorkspaceProjectResponse = {
	id: string
	name: string
	note: string | null
	status: string
	sort_order: number
}

type SearchWorkspaceResponse = {
	space_slug?: string
	tasks: SearchWorkspaceTaskResponse[]
	projects: SearchWorkspaceProjectResponse[]
}

const DEFAULT_LIMIT = 5
const HELPER_WINDOW_LABEL = 'quick-capture'

function isRunningInHelperWindow(): boolean {
	try {
		return getCurrentWindow().label === HELPER_WINDOW_LABEL
	} catch {
		return false
	}
}

/**
 * 查询当前 Space 的 Task / Project 轻量实时搜索结果。
 */
export async function searchWorkspace(
	input: SearchWorkspaceCommandInput,
): Promise<WorkspaceSearchResult> {
	const commandName = isRunningInHelperWindow() ? 'helper_search_workspace' : 'search_workspace'
	const commandInput = isRunningInHelperWindow()
		? {
				query: input.query,
				limit: input.limit ?? DEFAULT_LIMIT,
			}
		: {
				space_slug: input.spaceSlug,
				query: input.query,
				limit: input.limit ?? DEFAULT_LIMIT,
			}

	const payload = await invoke<SearchWorkspaceResponse>(commandName, {
		input: commandInput,
	})

	return {
		spaceSlug: payload.space_slug ?? null,
		tasks: payload.tasks.map((task) => ({
			id: task.id,
			title: task.title,
			note: task.note,
			priority: task.priority,
			projectId: task.project_id,
			projectName: task.project_name,
			updatedAt: task.updated_at,
		})),
		projects: payload.projects.map((project) => ({
			id: project.id,
			name: project.name,
			note: project.note,
			status: project.status,
			sortOrder: project.sort_order,
		})),
	} satisfies WorkspaceSearchResult
}

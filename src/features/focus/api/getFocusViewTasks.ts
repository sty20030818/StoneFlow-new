import { invoke } from '@tauri-apps/api/core'

import type { FocusViewKey, FocusViewSnapshot } from '@/features/focus/model/types'

type GetFocusViewTasksCommandInput = {
	spaceSlug: string
	viewKey: FocusViewKey
}

type FocusViewResponse = {
	id: string
	key: FocusViewKey
	name: string
	sort_order: number
	is_enabled: boolean
}

type FocusTaskResponse = {
	id: string
	project_id: string
	title: string
	note: string | null
	priority: string
	status: 'todo' | 'done'
	pinned: boolean
	due_at: string | null
	created_at: string
	updated_at: string
}

type FocusViewTasksResponse = {
	view: FocusViewResponse
	tasks: FocusTaskResponse[]
}

/**
 * 查询单个系统 Focus 视图的真实任务集合。
 */
export async function getFocusViewTasks(input: GetFocusViewTasksCommandInput) {
	const payload = await invoke<FocusViewTasksResponse>('get_focus_view_tasks', {
		input: {
			space_slug: input.spaceSlug,
			view_key: input.viewKey,
		},
	})

	return {
		view: {
			id: payload.view.id,
			key: payload.view.key,
			name: payload.view.name,
			sortOrder: payload.view.sort_order,
			isEnabled: payload.view.is_enabled,
		},
		tasks: payload.tasks.map((task) => ({
			id: task.id,
			projectId: task.project_id,
			title: task.title,
			note: task.note,
			priority: task.priority,
			status: task.status,
			pinned: task.pinned,
			dueAt: task.due_at,
			createdAt: task.created_at,
			updatedAt: task.updated_at,
		})),
	} satisfies FocusViewSnapshot
}

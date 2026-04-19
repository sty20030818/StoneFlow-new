import { invoke } from '@tauri-apps/api/core'

type ListInboxTasksCommandInput = {
	spaceSlug: string
}

type InboxTaskResponse = {
	id: string
	project_id: string | null
	title: string
	note: string | null
	status: string
	priority: string | null
	created_at: string
	updated_at: string
}

type InboxProjectOptionResponse = {
	id: string
	name: string
	sort_order: number
}

type InboxSnapshotResponse = {
	tasks: InboxTaskResponse[]
	projects: InboxProjectOptionResponse[]
}

export type InboxTaskRecord = {
	id: string
	projectId: string | null
	title: string
	note: string | null
	status: string
	priority: string | null
	createdAt: string
	updatedAt: string
}

export type InboxProjectOption = {
	id: string
	name: string
	sortOrder: number
}

export type InboxSnapshot = {
	tasks: InboxTaskRecord[]
	projects: InboxProjectOption[]
}

/**
 * 查询当前 Space 下的 Inbox 任务和可选项目列表。
 */
export async function listInboxTasks(input: ListInboxTasksCommandInput) {
	const payload = await invoke<InboxSnapshotResponse>('list_inbox_tasks', {
		input: {
			space_slug: input.spaceSlug,
		},
	})

	return {
		tasks: payload.tasks.map((task) => ({
			id: task.id,
			projectId: task.project_id,
			title: task.title,
			note: task.note,
			status: task.status,
			priority: task.priority,
			createdAt: task.created_at,
			updatedAt: task.updated_at,
		})),
		projects: payload.projects.map((project) => ({
			id: project.id,
			name: project.name,
			sortOrder: project.sort_order,
		})),
	} satisfies InboxSnapshot
}

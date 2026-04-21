import { invoke } from '@tauri-apps/api/core'

import type { TrashEntry, TrashList } from '@/features/trash/model/types'

type ListTrashEntriesCommandInput = {
	spaceSlug: string
}

type TrashEntryResponse = {
	id: string
	entity_type: 'task' | 'project'
	entity_id: string
	title: string
	deleted_at: string
	deleted_from: string | null
	restore_hint: string
	original_project_id: string | null
	original_parent_project_id: string | null
}

type TrashListResponse = {
	entries: TrashEntryResponse[]
}

/**
 * 查询当前 Space 的真实回收站列表。
 */
export async function listTrashEntries(input: ListTrashEntriesCommandInput) {
	const payload = await invoke<TrashListResponse>('list_trash_entries', {
		input: {
			space_slug: input.spaceSlug,
		},
	})

	return {
		entries: payload.entries.map(mapTrashEntry),
	} satisfies TrashList
}

function mapTrashEntry(entry: TrashEntryResponse): TrashEntry {
	return {
		id: entry.id,
		entityType: entry.entity_type,
		entityId: entry.entity_id,
		title: entry.title,
		deletedAt: entry.deleted_at,
		deletedFrom: entry.deleted_from,
		restoreHint: entry.restore_hint,
		originalProjectId: entry.original_project_id,
		originalParentProjectId: entry.original_parent_project_id,
	}
}

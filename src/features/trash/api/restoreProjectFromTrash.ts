import { invoke } from '@tauri-apps/api/core'

import type { RestoredTrashEntry } from '@/features/trash/model/types'

type RestoreProjectFromTrashCommandInput = {
	spaceSlug: string
	trashEntryId: string
}

type RestoredTrashEntryResponse = {
	trash_entry_id: string
	entity_type: 'project'
	entity_id: string
}

/**
 * 将 Project 从 Trash 严格恢复到原父 Project / 顶层。
 */
export async function restoreProjectFromTrash(input: RestoreProjectFromTrashCommandInput) {
	const payload = await invoke<RestoredTrashEntryResponse>('restore_project_from_trash', {
		input: {
			space_slug: input.spaceSlug,
			trash_entry_id: input.trashEntryId,
		},
	})

	return {
		trashEntryId: payload.trash_entry_id,
		entityType: payload.entity_type,
		entityId: payload.entity_id,
	} satisfies RestoredTrashEntry
}

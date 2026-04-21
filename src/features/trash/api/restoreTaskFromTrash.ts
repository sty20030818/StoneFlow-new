import { invoke } from '@tauri-apps/api/core'

import type { RestoredTrashEntry } from '@/features/trash/model/types'

type RestoreTaskFromTrashCommandInput = {
	spaceSlug: string
	trashEntryId: string
}

type RestoredTrashEntryResponse = {
	trash_entry_id: string
	entity_type: 'task'
	entity_id: string
}

/**
 * 将 Task 从 Trash 严格恢复到原 Project / Inbox。
 */
export async function restoreTaskFromTrash(input: RestoreTaskFromTrashCommandInput) {
	const payload = await invoke<RestoredTrashEntryResponse>('restore_task_from_trash', {
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

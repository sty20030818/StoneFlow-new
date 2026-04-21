import { invoke } from '@tauri-apps/api/core'

import type { DeletedProjectToTrash } from '@/features/trash/model/types'

type DeleteProjectToTrashCommandInput = {
	spaceSlug: string
	projectId: string
}

type DeletedProjectToTrashResponse = {
	project_id: string
	deleted_at: string
}

/**
 * 将 Project 软删除到 Trash。任务不会随 Project 级联删除。
 */
export async function deleteProjectToTrash(input: DeleteProjectToTrashCommandInput) {
	const payload = await invoke<DeletedProjectToTrashResponse>('delete_project_to_trash', {
		input: {
			space_slug: input.spaceSlug,
			project_id: input.projectId,
		},
	})

	return {
		projectId: payload.project_id,
		deletedAt: payload.deleted_at,
	} satisfies DeletedProjectToTrash
}

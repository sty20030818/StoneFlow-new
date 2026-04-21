import { invoke } from '@tauri-apps/api/core'
import type * as TauriCore from '@tauri-apps/api/core'

import { deleteProjectToTrash } from '@/features/trash/api/deleteProjectToTrash'
import { listTrashEntries } from '@/features/trash/api/listTrashEntries'
import { restoreProjectFromTrash } from '@/features/trash/api/restoreProjectFromTrash'
import { restoreTaskFromTrash } from '@/features/trash/api/restoreTaskFromTrash'

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn<typeof TauriCore.invoke>(),
}))

const mockedInvoke = vi.mocked(invoke)

describe('trash api', () => {
	afterEach(() => {
		vi.clearAllMocks()
	})

	it('映射 Trash 列表', async () => {
		mockedInvoke.mockResolvedValue({
			entries: [
				{
					id: 'trash-1',
					entity_type: 'task',
					entity_id: 'task-1',
					title: '恢复任务',
					deleted_at: '2026-04-21T08:00:00Z',
					deleted_from: 'task_drawer',
					restore_hint: '恢复到 Inbox',
					original_project_id: null,
					original_parent_project_id: null,
				},
			],
		})

		await expect(listTrashEntries({ spaceSlug: 'default' })).resolves.toEqual({
			entries: [
				{
					id: 'trash-1',
					entityType: 'task',
					entityId: 'task-1',
					title: '恢复任务',
					deletedAt: '2026-04-21T08:00:00Z',
					deletedFrom: 'task_drawer',
					restoreHint: '恢复到 Inbox',
					originalProjectId: null,
					originalParentProjectId: null,
				},
			],
		})

		expect(mockedInvoke).toHaveBeenCalledWith('list_trash_entries', {
			input: {
				space_slug: 'default',
			},
		})
	})

	it('映射 Task 与 Project 恢复命令', async () => {
		mockedInvoke
			.mockResolvedValueOnce({
				trash_entry_id: 'trash-task',
				entity_type: 'task',
				entity_id: 'task-1',
			})
			.mockResolvedValueOnce({
				trash_entry_id: 'trash-project',
				entity_type: 'project',
				entity_id: 'project-1',
			})

		await expect(
			restoreTaskFromTrash({
				spaceSlug: 'default',
				trashEntryId: 'trash-task',
			}),
		).resolves.toEqual({
			trashEntryId: 'trash-task',
			entityType: 'task',
			entityId: 'task-1',
		})
		await expect(
			restoreProjectFromTrash({
				spaceSlug: 'default',
				trashEntryId: 'trash-project',
			}),
		).resolves.toEqual({
			trashEntryId: 'trash-project',
			entityType: 'project',
			entityId: 'project-1',
		})

		expect(mockedInvoke).toHaveBeenNthCalledWith(1, 'restore_task_from_trash', {
			input: {
				space_slug: 'default',
				trash_entry_id: 'trash-task',
			},
		})
		expect(mockedInvoke).toHaveBeenNthCalledWith(2, 'restore_project_from_trash', {
			input: {
				space_slug: 'default',
				trash_entry_id: 'trash-project',
			},
		})
	})

	it('映射 Project 删除到 Trash 命令', async () => {
		mockedInvoke.mockResolvedValue({
			project_id: 'project-1',
			deleted_at: '2026-04-21T09:00:00Z',
		})

		await expect(
			deleteProjectToTrash({
				spaceSlug: 'default',
				projectId: 'project-1',
			}),
		).resolves.toEqual({
			projectId: 'project-1',
			deletedAt: '2026-04-21T09:00:00Z',
		})

		expect(mockedInvoke).toHaveBeenCalledWith('delete_project_to_trash', {
			input: {
				space_slug: 'default',
				project_id: 'project-1',
			},
		})
	})
})

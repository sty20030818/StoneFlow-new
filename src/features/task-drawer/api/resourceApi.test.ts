import { invoke } from '@tauri-apps/api/core'
import type * as TauriCore from '@tauri-apps/api/core'

import { createTaskResource } from '@/features/task-drawer/api/createTaskResource'
import { deleteTaskResource } from '@/features/task-drawer/api/deleteTaskResource'
import { listTaskResources } from '@/features/task-drawer/api/listTaskResources'
import { openTaskResource } from '@/features/task-drawer/api/openTaskResource'

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn<typeof TauriCore.invoke>(),
}))

const mockedInvoke = vi.mocked(invoke)

describe('task resource api', () => {
	afterEach(() => {
		vi.clearAllMocks()
	})

	it('映射 Resource 列表', async () => {
		mockedInvoke.mockResolvedValue({
			resources: [
				{
					id: 'resource-1',
					task_id: 'task-1',
					type: 'doc_link',
					title: '需求文档',
					target: 'https://stoneflow.local/spec',
					sort_order: 0,
					created_at: '2026-04-20T08:00:00Z',
					updated_at: '2026-04-20T08:00:00Z',
				},
			],
		})

		await expect(
			listTaskResources({
				spaceSlug: 'default',
				taskId: 'task-1',
			}),
		).resolves.toEqual([
			{
				id: 'resource-1',
				taskId: 'task-1',
				type: 'doc_link',
				title: '需求文档',
				target: 'https://stoneflow.local/spec',
				sortOrder: 0,
				createdAt: '2026-04-20T08:00:00Z',
				updatedAt: '2026-04-20T08:00:00Z',
			},
		])

		expect(mockedInvoke).toHaveBeenCalledWith('list_task_resources', {
			input: {
				space_slug: 'default',
				task_id: 'task-1',
			},
		})
	})

	it('创建 Resource 时映射命令参数和返回结构', async () => {
		mockedInvoke.mockResolvedValue({
			resource: {
				id: 'resource-1',
				task_id: 'task-1',
				type: 'local_file',
				title: 'M3-C.md',
				target: '/Users/sty/Docs/M3-C.md',
				sort_order: 1,
				created_at: '2026-04-20T08:00:00Z',
				updated_at: '2026-04-20T08:00:00Z',
			},
		})

		await expect(
			createTaskResource({
				spaceSlug: 'default',
				taskId: 'task-1',
				type: 'local_file',
				title: 'M3-C.md',
				target: '/Users/sty/Docs/M3-C.md',
			}),
		).resolves.toEqual({
			resource: {
				id: 'resource-1',
				taskId: 'task-1',
				type: 'local_file',
				title: 'M3-C.md',
				target: '/Users/sty/Docs/M3-C.md',
				sortOrder: 1,
				createdAt: '2026-04-20T08:00:00Z',
				updatedAt: '2026-04-20T08:00:00Z',
			},
		})

		expect(mockedInvoke).toHaveBeenCalledWith('create_task_resource', {
			input: {
				space_slug: 'default',
				task_id: 'task-1',
				type: 'local_file',
				title: 'M3-C.md',
				target: '/Users/sty/Docs/M3-C.md',
			},
		})
	})

	it('映射打开和删除 Resource 命令', async () => {
		mockedInvoke
			.mockResolvedValueOnce({ resource_id: 'resource-1' })
			.mockResolvedValueOnce({ resource_id: 'resource-1' })

		await expect(
			openTaskResource({
				spaceSlug: 'default',
				resourceId: 'resource-1',
			}),
		).resolves.toEqual({ resourceId: 'resource-1' })
		await expect(
			deleteTaskResource({
				spaceSlug: 'default',
				resourceId: 'resource-1',
			}),
		).resolves.toEqual({ resourceId: 'resource-1' })

		expect(mockedInvoke).toHaveBeenNthCalledWith(1, 'open_task_resource', {
			input: {
				space_slug: 'default',
				resource_id: 'resource-1',
			},
		})
		expect(mockedInvoke).toHaveBeenNthCalledWith(2, 'delete_task_resource', {
			input: {
				space_slug: 'default',
				resource_id: 'resource-1',
			},
		})
	})
})

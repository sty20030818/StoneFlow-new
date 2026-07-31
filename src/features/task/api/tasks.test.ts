import { invoke } from '@tauri-apps/api/core'

import {
	archiveTask,
	createTask,
	deleteTask,
	getTaskDetail,
	listTasks,
	restoreTask,
	updateTask,
} from '@/features/task/api/tasks'

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn<(cmd: string, args?: Record<string, unknown>) => Promise<unknown>>(),
}))

const mockedInvoke = vi.mocked(invoke)

describe('tasks api', () => {
	afterEach(() => {
		mockedInvoke.mockReset()
	})

	it('读取列表时发送 scope、viewKey 和 placement，并解析分页', async () => {
		mockedInvoke.mockResolvedValue({ items: [], nextCursor: null })

		const page = await listTasks({
			scope: { type: 'space', spaceId: 'space-1' },
			viewKey: 'completed',
			placement: {
				kind: 'project',
				projectId: 'project-1',
			},
		})

		expect(page).toEqual({ items: [], nextCursor: null })
		expect(mockedInvoke).toHaveBeenCalledWith('list_tasks', {
			input: {
				scope: {
					type: 'space',
					spaceId: 'space-1',
				},
				viewKey: 'completed',
				placement: {
					kind: 'project',
					projectId: 'project-1',
				},
				statuses: null,
				limit: null,
				cursor: null,
			},
		})
	})

	it('所有空间列表发送 scope=all 且与单 Space 共用 viewKey 语义', async () => {
		mockedInvoke.mockResolvedValue({ items: [], nextCursor: 'c1' })

		const page = await listTasks({
			scope: { type: 'all' },
			viewKey: 'all',
			placement: { kind: 'all' },
		})

		expect(page.nextCursor).toBe('c1')
		expect(mockedInvoke).toHaveBeenCalledWith('list_tasks', {
			input: {
				scope: { type: 'all' },
				viewKey: 'all',
				placement: { kind: 'all', projectId: null },
				statuses: null,
				limit: null,
				cursor: null,
			},
		})
	})

	it('列表可下推 statuses 与 cursor', async () => {
		mockedInvoke.mockResolvedValue({ items: [], nextCursor: null })

		await listTasks({
			scope: { type: 'all' },
			viewKey: 'all',
			placement: { kind: 'all' },
			statuses: ['todo', 'doing', 'waiting'],
			cursor: '0\u001ftask-1',
			limit: 100,
		})

		expect(mockedInvoke).toHaveBeenCalledWith('list_tasks', {
			input: {
				scope: { type: 'all' },
				viewKey: 'all',
				placement: { kind: 'all', projectId: null },
				statuses: ['todo', 'doing', 'waiting'],
				limit: 100,
				cursor: '0\u001ftask-1',
			},
		})
	})

	it('创建、更新和详情读取保持 camelCase 输入', async () => {
		mockedInvoke.mockResolvedValue({})

		await getTaskDetail('task-1')
		await createTask({
			spaceId: 'space-1',
			placement: {
				kind: 'project',
				projectId: 'project-1',
			},
			title: '阶段 6',
			note: '接入 task drawer',
			status: 'doing',
			priority: 3,
			dueAt: '2026-05-01T10:00:00Z',
			plannedAt: null,
			remindAt: null,
		})
		await updateTask({
			taskId: 'task-1',
			status: 'done',
			priority: 4,
			placement: {
				kind: 'standalone',
				spaceId: 'space-1',
			},
		})

		expect(mockedInvoke).toHaveBeenNthCalledWith(1, 'get_task_detail', {
			input: { taskId: 'task-1' },
		})
		expect(mockedInvoke).toHaveBeenNthCalledWith(2, 'create_task', {
			input: {
				spaceId: 'space-1',
				placement: {
					kind: 'project',
					projectId: 'project-1',
				},
				title: '阶段 6',
				note: '接入 task drawer',
				status: 'doing',
				priority: 3,
				dueAt: '2026-05-01T10:00:00Z',
				plannedAt: null,
				remindAt: null,
			},
		})
		expect(mockedInvoke).toHaveBeenNthCalledWith(3, 'update_task', {
			input: {
				taskId: 'task-1',
				title: undefined,
				note: undefined,
				status: 'done',
				priority: 4,
				placement: {
					kind: 'standalone',
					spaceId: 'space-1',
					projectId: null,
				},
				dueAt: undefined,
				plannedAt: undefined,
				remindAt: undefined,
			},
		})
	})

	it('清空备注时保留 note null 语义', async () => {
		mockedInvoke.mockResolvedValue({})

		await updateTask({
			taskId: 'task-1',
			note: null,
		})

		expect(mockedInvoke).toHaveBeenCalledWith('update_task', {
			input: expect.objectContaining({
				taskId: 'task-1',
				note: null,
			}),
		})
	})

	it('归档、恢复、删除和 placement 更新都发送正确载荷', async () => {
		mockedInvoke.mockResolvedValue({})

		await archiveTask('task-1')
		await restoreTask('task-1')
		await deleteTask('task-1')
		await updateTask({
			taskId: 'task-1',
			placement: {
				kind: 'standalone',
				spaceId: 'space-1',
			},
		})
		await updateTask({
			taskId: 'task-1',
			placement: {
				kind: 'project',
				spaceId: 'space-1',
				projectId: 'project-1',
			},
		})
		await updateTask({
			taskId: 'task-1',
			placement: {
				kind: 'standalone',
				spaceId: 'space-1',
			},
		})

		expect(mockedInvoke).toHaveBeenNthCalledWith(1, 'archive_task', {
			input: { taskId: 'task-1' },
		})
		expect(mockedInvoke).toHaveBeenNthCalledWith(2, 'restore_task', {
			input: { taskId: 'task-1' },
		})
		expect(mockedInvoke).toHaveBeenNthCalledWith(3, 'delete_task', {
			input: { taskId: 'task-1' },
		})
		expect(mockedInvoke).toHaveBeenNthCalledWith(4, 'update_task', {
			input: {
				taskId: 'task-1',
				title: undefined,
				note: undefined,
				status: undefined,
				priority: undefined,
				placement: {
					kind: 'standalone',
					spaceId: 'space-1',
					projectId: null,
				},
				dueAt: undefined,
				plannedAt: undefined,
				remindAt: undefined,
			},
		})
		expect(mockedInvoke).toHaveBeenNthCalledWith(5, 'update_task', {
			input: {
				taskId: 'task-1',
				title: undefined,
				note: undefined,
				status: undefined,
				priority: undefined,
				placement: {
					kind: 'project',
					spaceId: 'space-1',
					projectId: 'project-1',
				},
				dueAt: undefined,
				plannedAt: undefined,
				remindAt: undefined,
			},
		})
		expect(mockedInvoke).toHaveBeenNthCalledWith(6, 'update_task', {
			input: {
				taskId: 'task-1',
				title: undefined,
				note: undefined,
				status: undefined,
				priority: undefined,
				placement: {
					kind: 'standalone',
					spaceId: 'space-1',
					projectId: null,
				},
				dueAt: undefined,
				plannedAt: undefined,
				remindAt: undefined,
			},
		})
	})
})

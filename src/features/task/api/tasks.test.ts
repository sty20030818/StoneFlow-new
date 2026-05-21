import { invoke } from '@tauri-apps/api/core'

import {
	archiveTask,
	createTask,
	deleteTask,
	getTaskDetail,
	leaveInboxAsNoProject,
	leaveInboxToProject,
	listTasks,
	moveTaskToInbox,
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

	it('读取列表时发送 scope、viewKey 和 placement', async () => {
		mockedInvoke.mockResolvedValue([])

		await listTasks({
			scope: { type: 'space', spaceId: 'space-1' },
			viewKey: 'completed',
			placement: {
				kind: 'project',
				projectId: 'project-1',
			},
		})

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
			scheduledAt: null,
			reminderAt: null,
		})
		await updateTask({
			taskId: 'task-1',
			status: 'done',
			priority: 4,
			projectId: null,
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
				scheduledAt: null,
				reminderAt: null,
			},
		})
		expect(mockedInvoke).toHaveBeenNthCalledWith(3, 'update_task', {
			input: {
				taskId: 'task-1',
				title: undefined,
				note: undefined,
				status: 'done',
				priority: 4,
				spaceId: undefined,
				projectId: null,
				dueAt: undefined,
				scheduledAt: undefined,
				reminderAt: undefined,
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

	it('归档、恢复、删除和 Inbox 命令都发送正确载荷', async () => {
		mockedInvoke.mockResolvedValue({})

		await archiveTask('task-1')
		await restoreTask('task-1')
		await deleteTask('task-1')
		await moveTaskToInbox({ taskId: 'task-1' })
		await leaveInboxToProject({ taskId: 'task-1', projectId: 'project-1' })
		await leaveInboxAsNoProject({ taskId: 'task-1' })

		expect(mockedInvoke).toHaveBeenNthCalledWith(1, 'archive_task', {
			input: { taskId: 'task-1' },
		})
		expect(mockedInvoke).toHaveBeenNthCalledWith(2, 'restore_task', {
			input: { taskId: 'task-1' },
		})
		expect(mockedInvoke).toHaveBeenNthCalledWith(3, 'delete_task', {
			input: { taskId: 'task-1' },
		})
		expect(mockedInvoke).toHaveBeenNthCalledWith(4, 'move_task_to_inbox', {
			input: { taskId: 'task-1' },
		})
		expect(mockedInvoke).toHaveBeenNthCalledWith(5, 'leave_inbox_to_project', {
			input: {
				taskId: 'task-1',
				projectId: 'project-1',
			},
		})
		expect(mockedInvoke).toHaveBeenNthCalledWith(6, 'leave_inbox_as_no_project', {
			input: { taskId: 'task-1' },
		})
	})
})

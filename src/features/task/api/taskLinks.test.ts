import { invoke } from '@tauri-apps/api/core'

import {
	createTaskLink,
	deleteTaskLink,
	listTaskLinks,
	updateTaskLink,
} from '@/features/task/api/taskLinks'

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn<(cmd: string, args?: Record<string, unknown>) => Promise<unknown>>(),
}))

const mockedInvoke = vi.mocked(invoke)

describe('taskLinks api', () => {
	afterEach(() => {
		mockedInvoke.mockReset()
	})

	it('读取 links 时保持 camelCase 载荷', async () => {
		mockedInvoke.mockResolvedValue([])

		await listTaskLinks({ taskId: 'task-1' })

		expect(mockedInvoke).toHaveBeenCalledWith('list_task_links', {
			input: { taskId: 'task-1' },
		})
	})

	it('新增、编辑、删除 links 时发送独立 command', async () => {
		mockedInvoke.mockResolvedValue({})

		await createTaskLink({
			taskId: 'task-1',
			title: '技术方案',
			url: 'https://example.com/spec',
		})
		await updateTaskLink({
			linkId: 'link-1',
			title: '最终方案',
			url: 'https://example.com/spec-final',
		})
		await deleteTaskLink({
			linkId: 'link-1',
		})

		expect(mockedInvoke).toHaveBeenNthCalledWith(1, 'create_task_link', {
			input: {
				taskId: 'task-1',
				title: '技术方案',
				url: 'https://example.com/spec',
			},
		})
		expect(mockedInvoke).toHaveBeenNthCalledWith(2, 'update_task_link', {
			input: {
				linkId: 'link-1',
				title: '最终方案',
				url: 'https://example.com/spec-final',
			},
		})
		expect(mockedInvoke).toHaveBeenNthCalledWith(3, 'delete_task_link', {
			input: {
				linkId: 'link-1',
			},
		})
	})
})

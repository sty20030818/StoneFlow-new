import { invoke } from '@tauri-apps/api/core'
import type * as TauriCore from '@tauri-apps/api/core'

import { createTask, TaskCreateError } from '@/features/task/api/createTask'
import { setActiveSpace } from '@/features/task/api/setActiveSpace'

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn<typeof TauriCore.invoke>(),
}))

const mockedInvoke = vi.mocked(invoke)

describe('task api', () => {
	afterEach(() => {
		vi.clearAllMocks()
	})

	it('映射任务创建返回中的 Space 回退状态', async () => {
		mockedInvoke.mockResolvedValue({
			id: 'task-1',
			space_id: 'space-1',
			project_id: null,
			title: '捕获底座',
			status: 'todo',
			priority: null,
			note: null,
			source: 'in_app_capture',
			space_fallback: false,
			created_at: '2026-04-22T08:00:00Z',
			updated_at: '2026-04-22T08:00:00Z',
		})

		await expect(
			createTask({
				spaceSlug: 'default',
				title: '捕获底座',
				note: null,
				priority: null,
				projectId: null,
			}),
		).resolves.toMatchObject({
			id: 'task-1',
			spaceFallback: false,
		})

		expect(mockedInvoke).toHaveBeenCalledWith('create_task', {
			input: {
				space_slug: 'default',
				title: '捕获底座',
				note: null,
				priority: null,
				project_id: null,
			},
		})
	})

	it('保留结构化创建错误分类', async () => {
		mockedInvoke.mockRejectedValue({
			type: 'DefaultSpaceUnavailable',
			message: 'default space `default` is archived',
		})

		await expect(
			createTask({
				spaceSlug: 'default',
				title: '捕获失败',
			}),
		).rejects.toMatchObject({
			type: 'DefaultSpaceUnavailable',
			message: 'default space `default` is archived',
		} satisfies Partial<TaskCreateError>)
	})

	it('同步当前 Space 状态', async () => {
		mockedInvoke.mockResolvedValue({
			active_space_id: 'space-1',
			space_slug: 'default',
		})

		await expect(setActiveSpace('default')).resolves.toEqual({
			activeSpaceId: 'space-1',
			spaceSlug: 'default',
		})

		expect(mockedInvoke).toHaveBeenCalledWith('set_active_space', {
			input: {
				space_slug: 'default',
			},
		})
	})
})

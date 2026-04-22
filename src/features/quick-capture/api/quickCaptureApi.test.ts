import { invoke } from '@tauri-apps/api/core'
import type * as TauriCore from '@tauri-apps/api/core'

import { createCaptureTask, CaptureTaskError } from '@/features/quick-capture/api/createCaptureTask'

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn<typeof TauriCore.invoke>(),
}))

const mockedInvoke = vi.mocked(invoke)

describe('quick capture api', () => {
	afterEach(() => {
		vi.clearAllMocks()
	})

	it('调用共享捕获创建命令并映射返回结果', async () => {
		mockedInvoke.mockResolvedValue({
			id: 'task-1',
			space_id: 'space-1',
			project_id: null,
			title: '系统级捕获',
			status: 'todo',
			priority: null,
			note: null,
			source: 'quick_capture',
			space_fallback: true,
			created_at: '2026-04-22T08:00:00Z',
			updated_at: '2026-04-22T08:00:00Z',
		})

		await expect(
			createCaptureTask({
				title: '系统级捕获',
				note: null,
				priority: null,
			}),
		).resolves.toMatchObject({
			id: 'task-1',
			source: 'quick_capture',
			spaceFallback: true,
		})

		expect(mockedInvoke).toHaveBeenCalledWith('create_capture_task', {
			input: {
				title: '系统级捕获',
				note: null,
				priority: null,
			},
		})
	})

	it('保留结构化捕获错误分类', async () => {
		mockedInvoke.mockRejectedValue({
			type: 'DefaultSpaceUnavailable',
			message: 'default space `default` is archived',
		})

		await expect(createCaptureTask({ title: '失败捕获' })).rejects.toMatchObject({
			type: 'DefaultSpaceUnavailable',
			message: 'default space `default` is archived',
		} satisfies Partial<CaptureTaskError>)
	})

})

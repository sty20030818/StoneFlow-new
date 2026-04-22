import { invoke } from '@tauri-apps/api/core'
import type * as TauriCore from '@tauri-apps/api/core'
import { getCurrentWindow } from '@tauri-apps/api/window'
import type * as TauriWindow from '@tauri-apps/api/window'

import { createCaptureTask, CaptureTaskError } from '@/features/quick-capture/api/createCaptureTask'

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn<typeof TauriCore.invoke>(),
}))

vi.mock('@tauri-apps/api/window', () => ({
	getCurrentWindow: vi.fn<typeof TauriWindow.getCurrentWindow>(),
}))

const mockedInvoke = vi.mocked(invoke)
const mockedGetCurrentWindow = vi.mocked(getCurrentWindow)

describe('quick capture api', () => {
	afterEach(() => {
		vi.clearAllMocks()
	})

	it('调用共享捕获创建命令并映射返回结果', async () => {
		mockedGetCurrentWindow.mockReturnValue({
			label: 'main',
		} as ReturnType<typeof getCurrentWindow>)
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

	it('在 Helper 窗口中调用 IPC 转发命令并补齐统一 payload', async () => {
		mockedGetCurrentWindow.mockReturnValue({
			label: 'quick-capture',
		} as ReturnType<typeof getCurrentWindow>)
		mockedInvoke.mockResolvedValue({
			id: 'task-helper',
			title: 'Helper 捕获',
			space_fallback: false,
		})

		await expect(
			createCaptureTask({
				title: 'Helper 捕获',
				note: null,
				priority: '  ',
			}),
		).resolves.toMatchObject({
			id: 'task-helper',
			title: 'Helper 捕获',
			source: 'quick-capture',
			spaceFallback: false,
			projectId: null,
		})

		expect(mockedInvoke).toHaveBeenCalledWith('helper_create_task', {
			input: {
				title: 'Helper 捕获',
				note: null,
				priority: null,
			},
		})
	})

	it('保留结构化捕获错误分类', async () => {
		mockedGetCurrentWindow.mockReturnValue({
			label: 'main',
		} as ReturnType<typeof getCurrentWindow>)
		mockedInvoke.mockRejectedValue({
			type: 'DefaultSpaceUnavailable',
			message: 'default space `default` is archived',
		})

		await expect(createCaptureTask({ title: '失败捕获' })).rejects.toMatchObject({
			type: 'DefaultSpaceUnavailable',
			message: 'default space `default` is archived',
		} satisfies Partial<CaptureTaskError>)
	})

	it('Tauri 窗口不可用时降级到主 App 捕获命令', async () => {
		mockedGetCurrentWindow.mockImplementation(() => {
			throw new Error('window unavailable')
		})
		mockedInvoke.mockResolvedValue({
			id: 'task-browser',
			space_id: 'space-1',
			project_id: null,
			title: '浏览器调试捕获',
			status: 'todo',
			priority: null,
			note: null,
			source: 'quick_capture',
			space_fallback: false,
			created_at: '2026-04-22T08:00:00Z',
			updated_at: '2026-04-22T08:00:00Z',
		})

		await expect(createCaptureTask({ title: '浏览器调试捕获' })).resolves.toMatchObject({
			id: 'task-browser',
			spaceFallback: false,
		})

		expect(mockedInvoke).toHaveBeenCalledWith('create_capture_task', {
			input: {
				title: '浏览器调试捕获',
				note: null,
				priority: null,
			},
		})
	})
})

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'

import { createTask } from '@/features/task-capture/api/createTask'
import { TaskCaptureDrawerContent } from '@/features/task-capture/ui/TaskCaptureDrawerContent'

vi.mock('@/features/task-capture/api/createTask', () => ({
	createTask: vi.fn<typeof createTask>(),
}))

const mockedCreateTask = vi.mocked(createTask)

describe('TaskCaptureDrawerContent', () => {
	afterEach(() => {
		vi.clearAllMocks()
		vi.useRealTimers()
	})

	it('创建成功后展示成功反馈并自动收起', async () => {
		vi.useFakeTimers()
		const onClose = vi.fn<() => void>()

		mockedCreateTask.mockResolvedValue({
			id: 'task-1',
			spaceId: 'space-1',
			projectId: null,
			title: '补齐 M2-B 创建链路',
			status: 'todo',
			priority: null,
			note: '先接通 Header',
			source: 'in_app_capture',
			createdAt: '2026-04-19T20:00:00Z',
			updatedAt: '2026-04-19T20:00:00Z',
		})

		render(<TaskCaptureDrawerContent currentSpaceId='default' onClose={onClose} />)

		fireEvent.change(screen.getByLabelText('任务标题'), {
			target: { value: '补齐 M2-B 创建链路' },
		})
		fireEvent.change(screen.getByLabelText('备注'), {
			target: { value: '先接通 Header' },
		})
		fireEvent.click(screen.getByRole('button', { name: '创建任务' }))

		await act(async () => {
			await Promise.resolve()
			await Promise.resolve()
		})

		expect(mockedCreateTask).toHaveBeenCalledWith({
			spaceSlug: 'default',
			title: '补齐 M2-B 创建链路',
			note: '先接通 Header',
		})

		expect(screen.getByRole('status').textContent).toContain('已创建“补齐 M2-B 创建链路”')

		await act(async () => {
			await vi.advanceTimersByTimeAsync(800)
		})

		expect(onClose).toHaveBeenCalledTimes(1)
	})

	it('创建失败后展示错误提示并保持抽屉打开', async () => {
		const onClose = vi.fn<() => void>()

		mockedCreateTask.mockRejectedValue(new Error('space `studio` does not exist'))

		render(<TaskCaptureDrawerContent currentSpaceId='studio' onClose={onClose} />)

		fireEvent.change(screen.getByLabelText('任务标题'), {
			target: { value: '验证空间错误反馈' },
		})
		fireEvent.click(screen.getByRole('button', { name: '创建任务' }))

		await waitFor(() => {
			expect(screen.getByRole('alert').textContent).toContain('space `studio` does not exist')
		})

		expect(onClose).not.toHaveBeenCalled()
	})
})

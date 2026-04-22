import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'

import {
	CaptureTaskError,
	type CreateCaptureTaskCommandInput,
	type CreatedCaptureTaskPayload,
} from '@/features/quick-capture/api/createCaptureTask'
import { QuickCaptureSurface } from '@/features/quick-capture/ui/QuickCapturePage'

type CreateTaskMock = (input: CreateCaptureTaskCommandInput) => Promise<CreatedCaptureTaskPayload>

type CloseWindowMock = () => void

vi.mock('@tauri-apps/api/window', () => ({
	getCurrentWindow: vi.fn<() => { close: CloseWindowMock }>(() => ({
		close: vi.fn<CloseWindowMock>(),
	})),
}))

const basePayload: CreatedCaptureTaskPayload = {
	id: 'task-1',
	spaceId: 'space-1',
	projectId: null,
	title: '快速捕获',
	status: 'todo',
	priority: null,
	note: null,
	source: 'quick_capture',
	spaceFallback: false,
	createdAt: '2026-04-22T08:00:00Z',
	updatedAt: '2026-04-22T08:00:00Z',
}

describe('QuickCaptureSurface', () => {
	it('打开后聚焦任务标题输入框', async () => {
		render(<QuickCaptureSurface closeWindow={vi.fn<CloseWindowMock>()} />)

		await waitFor(() => {
			expect(screen.getByLabelText('任务标题')).toHaveFocus()
		})
	})

	it('按 Enter 提交有效标题并关闭窗口', async () => {
		const createTask = vi.fn<CreateTaskMock>().mockResolvedValue(basePayload)
		const closeWindow = vi.fn<CloseWindowMock>()

		render(<QuickCaptureSurface closeWindow={closeWindow} createTask={createTask} />)

		const input = screen.getByLabelText('任务标题')
		fireEvent.change(input, { target: { value: '整理 M4-B 自测' } })
		fireEvent.keyDown(input, { key: 'Enter' })

		await waitFor(() => {
			expect(createTask).toHaveBeenCalledWith({
				title: '整理 M4-B 自测',
				note: null,
				priority: null,
			})
		})
		expect(closeWindow).toHaveBeenCalledTimes(1)
	})

	it('空标题不会调用捕获创建请求', async () => {
		const createTask = vi.fn<CreateTaskMock>().mockResolvedValue(basePayload)

		render(<QuickCaptureSurface closeWindow={vi.fn<CloseWindowMock>()} createTask={createTask} />)

		const input = screen.getByLabelText('任务标题')
		fireEvent.change(input, { target: { value: '   ' } })
		fireEvent.keyDown(input, { key: 'Enter' })

		expect(createTask).not.toHaveBeenCalled()
		expect(await screen.findByText('请输入任务标题')).toBeInTheDocument()
	})

	it('提交中防止重复创建', async () => {
		let resolveCreate: (payload: CreatedCaptureTaskPayload) => void = () => {}
		const createTask = vi.fn<CreateTaskMock>(
			() =>
				new Promise<CreatedCaptureTaskPayload>((resolve) => {
					resolveCreate = resolve
				}),
		)
		const closeWindow = vi.fn<CloseWindowMock>()

		render(<QuickCaptureSurface closeWindow={closeWindow} createTask={createTask} />)

		const input = screen.getByLabelText('任务标题')
		fireEvent.change(input, { target: { value: '不要重复写入' } })
		fireEvent.keyDown(input, { key: 'Enter' })
		fireEvent.keyDown(input, { key: 'Enter' })

		expect(createTask).toHaveBeenCalledTimes(1)

		await act(async () => {
			resolveCreate(basePayload)
		})

		await waitFor(() => {
			expect(closeWindow).toHaveBeenCalledTimes(1)
		})
	})

	it('按 Esc 关闭窗口且不创建任务', () => {
		const createTask = vi.fn<CreateTaskMock>().mockResolvedValue(basePayload)
		const closeWindow = vi.fn<CloseWindowMock>()

		render(<QuickCaptureSurface closeWindow={closeWindow} createTask={createTask} />)

		fireEvent.keyDown(screen.getByLabelText('任务标题'), { key: 'Escape' })

		expect(closeWindow).toHaveBeenCalledTimes(1)
		expect(createTask).not.toHaveBeenCalled()
	})

	it('Space 回退时展示短成功反馈并延迟关闭', async () => {
		const createTask = vi.fn<CreateTaskMock>().mockResolvedValue({
			...basePayload,
			spaceFallback: true,
		})
		const closeWindow = vi.fn<CloseWindowMock>()

		render(
			<QuickCaptureSurface closeDelayMs={1} closeWindow={closeWindow} createTask={createTask} />,
		)

		const input = screen.getByLabelText('任务标题')
		fireEvent.change(input, { target: { value: '回退默认 Space' } })
		fireEvent.keyDown(input, { key: 'Enter' })

		expect(await screen.findByText('已写入默认 Space 的 Inbox')).toBeInTheDocument()

		await waitFor(() => {
			expect(closeWindow).toHaveBeenCalledTimes(1)
		})
	})

	it('失败时展示错误并保留输入', async () => {
		const createTask = vi.fn<CreateTaskMock>().mockRejectedValue(
			new CaptureTaskError({
				type: 'CapturePersistence',
				message: 'failed to create task `capture`',
			}),
		)

		render(<QuickCaptureSurface closeWindow={vi.fn<CloseWindowMock>()} createTask={createTask} />)

		const input = screen.getByLabelText('任务标题')
		fireEvent.change(input, { target: { value: '失败后还在' } })
		fireEvent.keyDown(input, { key: 'Enter' })

		expect(await screen.findByText('写入任务失败，请稍后重试。')).toBeInTheDocument()
		expect(input).toHaveValue('失败后还在')
	})

	it('不会把 token 文本解析成复杂命令', async () => {
		const createTask = vi.fn<CreateTaskMock>().mockResolvedValue(basePayload)

		render(<QuickCaptureSurface closeWindow={vi.fn<CloseWindowMock>()} createTask={createTask} />)

		const input = screen.getByLabelText('任务标题')
		fireEvent.change(input, { target: { value: 'p0 #项目 @空间 都只是标题' } })
		fireEvent.keyDown(input, { key: 'Enter' })

		await waitFor(() => {
			expect(createTask).toHaveBeenCalledWith({
				title: 'p0 #项目 @空间 都只是标题',
				note: null,
				priority: null,
			})
		})
	})
})

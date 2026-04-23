import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'

import {
	CaptureTaskError,
	type CreateCaptureTaskCommandInput,
	type CreatedCaptureTaskPayload,
} from '@/features/quick-capture/api/createCaptureTask'
import { QuickCaptureSurface } from '@/features/quick-capture/ui/QuickCapturePage'
import type { WorkspaceSearchResult } from '@/features/global-search/api/searchWorkspace'

type CreateTaskMock = (input: CreateCaptureTaskCommandInput) => Promise<CreatedCaptureTaskPayload>
type SearchMock = (input: {
	spaceSlug: string
	query: string
	limit?: number
}) => Promise<WorkspaceSearchResult>
type OpenResultMock = (id: string) => Promise<void>
type CloseWindowMock = () => void

vi.mock('@tauri-apps/api/event', () => ({
	listen: vi.fn<() => Promise<() => void>>(async () => vi.fn<() => void>()),
}))

vi.mock('@tauri-apps/api/window', () => ({
	getCurrentWindow: vi.fn<() => { hide: () => void; label: string }>(() => ({
		hide: vi.fn<() => void>(),
		label: 'quick-capture',
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

const emptyResults: WorkspaceSearchResult = {
	spaceSlug: 'work',
	tasks: [],
	projects: [],
}

function renderCommandSurface({
	createTask = vi.fn<CreateTaskMock>().mockResolvedValue(basePayload),
	search = vi.fn<SearchMock>().mockResolvedValue(emptyResults),
	openTask = vi.fn<OpenResultMock>().mockResolvedValue(undefined),
	openProject = vi.fn<OpenResultMock>().mockResolvedValue(undefined),
	closeWindow = vi.fn<CloseWindowMock>(),
	closeDelayMs,
}: Partial<{
	createTask: ReturnType<typeof vi.fn<CreateTaskMock>>
	search: ReturnType<typeof vi.fn<SearchMock>>
	openTask: ReturnType<typeof vi.fn<OpenResultMock>>
	openProject: ReturnType<typeof vi.fn<OpenResultMock>>
	closeWindow: ReturnType<typeof vi.fn<CloseWindowMock>>
	closeDelayMs: number
}> = {}) {
	render(
		<QuickCaptureSurface
			closeDelayMs={closeDelayMs}
			closeWindow={closeWindow}
			createTask={createTask}
			openProject={openProject}
			openTask={openTask}
			search={search}
		/>,
	)

	return {
		createTask,
		search,
		openTask,
		openProject,
		closeWindow,
		input: screen.getByLabelText('Command 输入'),
	}
}

async function waitForCreateMode() {
	await screen.findByText(/没有匹配结果/)
	expect(screen.getByRole('button', { name: /创建任务/ })).toBeInTheDocument()
}

describe('QuickCaptureSurface', () => {
	it('打开后聚焦 Command 输入框', async () => {
		renderCommandSurface()

		await waitFor(() => {
			expect(screen.getByLabelText('Command 输入')).toHaveFocus()
		})
	})

	it('输入关键词后搜索并展示 Task / Project 分组', async () => {
		const search = vi.fn<SearchMock>().mockResolvedValue({
			spaceSlug: 'work',
			tasks: [
				{
					id: 'task-1',
					title: '完善 Command 面板',
					note: '键盘导航',
					priority: 'high',
					projectId: 'project-1',
					projectName: 'StoneFlow 开发',
					updatedAt: '2026-04-22T08:00:00Z',
				},
			],
			projects: [
				{
					id: 'project-1',
					name: 'StoneFlow 开发',
					note: null,
					status: 'active',
					sortOrder: 0,
				},
			],
		})

		const { input } = renderCommandSurface({ search })
		fireEvent.change(input, { target: { value: 'Command' } })

		await waitFor(() => {
			expect(search).toHaveBeenCalledWith({
				spaceSlug: 'work',
				query: 'Command',
				limit: 5,
			})
		})

		expect(await screen.findAllByText('任务')).not.toHaveLength(0)
		expect(screen.getAllByText('项目')).not.toHaveLength(0)
		expect(screen.getByText('完善 Command 面板')).toBeInTheDocument()
		expect(screen.getAllByText('StoneFlow 开发')).not.toHaveLength(0)
	})

	it('有搜索结果时支持 ↑↓ + Enter 打开高亮结果', async () => {
		const openTask = vi.fn<OpenResultMock>().mockResolvedValue(undefined)
		const openProject = vi.fn<OpenResultMock>().mockResolvedValue(undefined)
		const closeWindow = vi.fn<CloseWindowMock>()
		const search = vi.fn<SearchMock>().mockResolvedValue({
			spaceSlug: 'work',
			tasks: [
				{
					id: 'task-1',
					title: '任务结果',
					note: null,
					priority: 'medium',
					projectId: null,
					projectName: null,
					updatedAt: '2026-04-22T08:00:00Z',
				},
			],
			projects: [
				{
					id: 'project-1',
					name: '项目结果',
					note: null,
					status: 'active',
					sortOrder: 0,
				},
			],
		})

		const { input } = renderCommandSurface({ closeWindow, openProject, openTask, search })
		fireEvent.change(input, { target: { value: '结果' } })
		expect(await screen.findByText('项目结果')).toBeInTheDocument()

		fireEvent.keyDown(input, { key: 'ArrowDown' })
		fireEvent.keyDown(input, { key: 'Enter' })

		await waitFor(() => {
			expect(openProject).toHaveBeenCalledWith('project-1')
		})
		expect(openTask).not.toHaveBeenCalled()
		expect(closeWindow).toHaveBeenCalledTimes(1)
	})

	it('无结果时切换创建模式，Enter 创建任务并关闭窗口', async () => {
		const createTask = vi.fn<CreateTaskMock>().mockResolvedValue(basePayload)
		const closeWindow = vi.fn<CloseWindowMock>()

		const { input } = renderCommandSurface({ closeWindow, createTask })
		fireEvent.change(input, { target: { value: '整理 M4-B 自测' } })
		await waitForCreateMode()
		fireEvent.keyDown(input, { key: 'Enter' })

		await waitFor(() => {
			expect(createTask).toHaveBeenCalledWith({
				title: '整理 M4-B 自测',
				note: null,
				priority: 'high',
			})
		})
		expect(closeWindow).toHaveBeenCalledTimes(1)
	})

	it('创建模式下 Tab 轮换优先级并映射 priority', async () => {
		const createTask = vi.fn<CreateTaskMock>().mockResolvedValue(basePayload)

		const { input } = renderCommandSurface({ createTask })
		fireEvent.change(input, { target: { value: '切到 P2' } })
		await waitForCreateMode()

		fireEvent.keyDown(input, { key: 'Tab' })
		fireEvent.keyDown(input, { key: 'Enter' })

		await waitFor(() => {
			expect(createTask).toHaveBeenCalledWith({
				title: '切到 P2',
				note: null,
				priority: 'medium',
			})
		})
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

		const { input } = renderCommandSurface({ closeWindow, createTask })
		fireEvent.change(input, { target: { value: '不要重复写入' } })
		await waitForCreateMode()
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

		const { input } = renderCommandSurface({ closeWindow, createTask })
		fireEvent.keyDown(input, { key: 'Escape' })

		expect(closeWindow).toHaveBeenCalledTimes(1)
		expect(createTask).not.toHaveBeenCalled()
	})

	it('Space 回退时展示短成功反馈并延迟关闭', async () => {
		const createTask = vi.fn<CreateTaskMock>().mockResolvedValue({
			...basePayload,
			spaceFallback: true,
		})
		const closeWindow = vi.fn<CloseWindowMock>()

		const { input } = renderCommandSurface({
			closeDelayMs: 1,
			closeWindow,
			createTask,
		})
		fireEvent.change(input, { target: { value: '回退默认 Space' } })
		await waitForCreateMode()
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

		const { input } = renderCommandSurface({ createTask })
		fireEvent.change(input, { target: { value: '失败后还在' } })
		await waitForCreateMode()
		fireEvent.keyDown(input, { key: 'Enter' })

		expect(await screen.findByText('写入任务失败，请稍后重试。')).toBeInTheDocument()
		expect(input).toHaveValue('失败后还在')
	})

	it('不会把 token 文本解析成复杂命令', async () => {
		const createTask = vi.fn<CreateTaskMock>().mockResolvedValue(basePayload)

		const { input } = renderCommandSurface({ createTask })
		fireEvent.change(input, { target: { value: 'p0 #项目 @空间 都只是标题' } })
		await waitForCreateMode()
		fireEvent.keyDown(input, { key: 'Enter' })

		await waitFor(() => {
			expect(createTask).toHaveBeenCalledWith({
				title: 'p0 #项目 @空间 都只是标题',
				note: null,
				priority: 'high',
			})
		})
	})
})

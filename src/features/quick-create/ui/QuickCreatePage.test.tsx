import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import type { PropsWithChildren } from 'react'

import {
	create,
	createAndOpen,
	getInitialState,
	listProjectsBySpace,
	notifyFrontendReady,
	notifyFrontendUnready,
	openTarget,
	presentWindow,
	reportLayoutDiagnostics,
	resizeWindow,
	search,
} from '@/features/quick-create/api/quickCreate'
import { measureQuickCreateTargetHeight } from '@/features/quick-create/layout/measureQuickCreateLayout'
import { QuickCreatePage } from '@/features/quick-create/ui/QuickCreatePage'
import type {
	QuickCreateInitialState,
	QuickCreateProjectItem,
	QuickCreateProjectOption,
	QuickCreateProjectsBySpace,
	QuickCreateTaskItem,
} from '@/features/quick-create/model/types'
import { formatDateLabel } from '@/features/quick-create/model/QuickCreateProvider'

const hideMock = vi.fn()
const setSizeMock = vi.fn()
const setSizeConstraintsMock = vi.fn()
const listenMock = vi.fn()
const originalRequestAnimationFrame = window.requestAnimationFrame
const originalCancelAnimationFrame = window.cancelAnimationFrame

vi.mock('@/features/quick-create/api/quickCreate', () => ({
	create: vi.fn<typeof create>(),
	createAndOpen: vi.fn<typeof createAndOpen>(),
	getInitialState: vi.fn<typeof getInitialState>(),
	listProjectsBySpace: vi.fn<typeof listProjectsBySpace>(),
	notifyFrontendReady: vi.fn<typeof notifyFrontendReady>(),
	notifyFrontendUnready: vi.fn<typeof notifyFrontendUnready>(),
	openTarget: vi.fn<typeof openTarget>(),
	presentWindow: vi.fn<typeof presentWindow>(),
	reportLayoutDiagnostics: vi.fn<typeof reportLayoutDiagnostics>(),
	resizeWindow: vi.fn<typeof resizeWindow>(),
	search: vi.fn<typeof search>(),
}))

vi.mock('@tauri-apps/api/event', () => ({
	listen: (...args: unknown[]) => listenMock(...args),
}))

vi.mock('@tauri-apps/api/window', () => ({
	getCurrentWindow: () => ({
		hide: hideMock,
		setSize: setSizeMock,
		setSizeConstraints: setSizeConstraintsMock,
	}),
}))

vi.mock('@/shared/ui/base/dropdown-menu', async () => {
	const React = await import('react')
	const DropdownMenuContext = React.createContext<(() => void) | null>(null)

	function DropdownMenu({
		children,
		open,
		onOpenChange,
	}: PropsWithChildren<{ open?: boolean; onOpenChange?: (open: boolean) => void }>) {
		const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false)
		const isControlled = typeof open === 'boolean'
		const visible = isControlled ? open : uncontrolledOpen
		const setOpen = (nextOpen: boolean) => {
			onOpenChange?.(nextOpen)
			if (!isControlled) {
				setUncontrolledOpen(nextOpen)
			}
		}
		const childArray = React.Children.toArray(children)
		const trigger = childArray[0]
		const content = childArray[1]

		return (
			<DropdownMenuContext.Provider value={() => setOpen(false)}>
				<span
					onClick={() => setOpen(!visible)}
					onKeyDown={(event) => {
						if (event.key === 'Enter' || event.key === ' ') {
							setOpen(!visible)
						}
					}}
				>
					{trigger}
				</span>
				{visible ? content : null}
			</DropdownMenuContext.Provider>
		)
	}

	function DropdownMenuTrigger({ children }: PropsWithChildren<{ asChild?: boolean }>) {
		return <>{children}</>
	}

	function DropdownMenuContent({ children }: PropsWithChildren) {
		return <div data-testid='dropdown-menu-content'>{children}</div>
	}

	function DropdownMenuGroup({ children }: PropsWithChildren) {
		return <div>{children}</div>
	}

	function DropdownMenuLabel({ children }: PropsWithChildren) {
		return <div>{children}</div>
	}

	function DropdownMenuItem({ children, onSelect }: PropsWithChildren<{ onSelect?: () => void }>) {
		const close = React.useContext(DropdownMenuContext)
		return (
			<button
				onClick={() => {
					onSelect?.()
					close?.()
				}}
				type='button'
			>
				{children}
			</button>
		)
	}

	return {
		DropdownMenu,
		DropdownMenuTrigger,
		DropdownMenuContent,
		DropdownMenuGroup,
		DropdownMenuLabel,
		DropdownMenuItem,
	}
})

vi.mock('@/shared/ui/base/calendar', () => ({
	Calendar: () => <div data-testid='calendar' />,
}))

const mockedCreate = vi.mocked(create)
const mockedCreateAndOpen = vi.mocked(createAndOpen)
const mockedGetInitialState = vi.mocked(getInitialState)
const mockedListProjectsBySpace = vi.mocked(listProjectsBySpace)
const mockedNotifyFrontendReady = vi.mocked(notifyFrontendReady)
const mockedNotifyFrontendUnready = vi.mocked(notifyFrontendUnready)
const mockedOpenTarget = vi.mocked(openTarget)
const mockedPresentWindow = vi.mocked(presentWindow)
const mockedReportLayoutDiagnostics = vi.mocked(reportLayoutDiagnostics)
const mockedResizeWindow = vi.mocked(resizeWindow)
const mockedSearch = vi.mocked(search)

describe('QuickCreatePage', () => {
	beforeEach(() => {
		window.requestAnimationFrame = ((callback: FrameRequestCallback) => {
			return window.setTimeout(() => callback(performance.now()), 0)
		}) as typeof window.requestAnimationFrame
		window.cancelAnimationFrame = ((id: number) => {
			window.clearTimeout(id)
		}) as typeof window.cancelAnimationFrame
		hideMock.mockReset()
		setSizeMock.mockReset()
		setSizeMock.mockResolvedValue(undefined)
		setSizeConstraintsMock.mockReset()
		setSizeConstraintsMock.mockResolvedValue(undefined)
		listenMock.mockReset()
		listenMock.mockResolvedValue(() => undefined)
		mockedCreate.mockReset()
		mockedCreate.mockResolvedValue(undefined)
		mockedCreateAndOpen.mockReset()
		mockedCreateAndOpen.mockResolvedValue(undefined)
		mockedGetInitialState.mockReset()
		mockedGetInitialState.mockResolvedValue(createInitialState())
		mockedListProjectsBySpace.mockReset()
		mockedListProjectsBySpace.mockResolvedValue(createProjectsBySpace('space-2'))
		mockedNotifyFrontendReady.mockReset()
		mockedNotifyFrontendReady.mockResolvedValue(undefined)
		mockedNotifyFrontendUnready.mockReset()
		mockedNotifyFrontendUnready.mockResolvedValue(undefined)
		mockedOpenTarget.mockReset()
		mockedOpenTarget.mockResolvedValue(undefined)
		mockedPresentWindow.mockReset()
		mockedPresentWindow.mockResolvedValue(undefined)
		mockedReportLayoutDiagnostics.mockReset()
		mockedReportLayoutDiagnostics.mockResolvedValue(undefined)
		mockedResizeWindow.mockReset()
		mockedResizeWindow.mockResolvedValue(undefined)
		mockedSearch.mockReset()
		mockedSearch.mockResolvedValue({
			tasks: [createTaskResult({ id: 'task-search', title: 'Stone 搜索任务' })],
			projects: [createProjectResult({ id: 'project-search', name: 'Stone 搜索项目' })],
		})
	})

	afterEach(async () => {
		cleanup()
		window.requestAnimationFrame = originalRequestAnimationFrame
		window.cancelAnimationFrame = originalCancelAnimationFrame
	})

	it('初始打开显示 recent 区并聚焦输入框', async () => {
		render(<QuickCreatePage />)

		expect(await screen.findByTestId('quick-create-recent-tasks-section')).toBeInTheDocument()
		expect(screen.getByTestId('quick-create-recent-projects-section')).toBeInTheDocument()
		expect(screen.queryByText('创建任务')).not.toBeInTheDocument()

		const input = screen.getByLabelText('Quick Create 输入')
		expect(input).toBeInTheDocument()
	})

	it('页面保持 composer、action board、footer 三段逻辑分区', async () => {
		render(<QuickCreatePage />)

		await screen.findByTestId('quick-create-recent-tasks-section')

		expect(screen.getByTestId('quick-create-composer')).toBeInTheDocument()
		expect(screen.getByTestId('quick-create-action-board')).toBeInTheDocument()
		expect(screen.getByTestId('quick-create-footer')).toBeInTheDocument()
	})

	it('resize 使用完整内容流高度和前端阴影安全区，避免 footer 或阴影被裁切', async () => {
		const regionSumHeight = 96 + 44 + 118 + 120 + 46
		const contentFlowHeight = regionSumHeight + 24
		const surfaceHeight = contentFlowHeight + 2
		const expectedHeight = surfaceHeight + 72
		const offsetHeightSpy = vi
			.spyOn(HTMLElement.prototype, 'offsetHeight', 'get')
			.mockImplementation(function (this: HTMLElement) {
				if (this.getAttribute('aria-label') === 'StoneFlow Quick Create') {
					return surfaceHeight
				}
				if (this.dataset.testid === 'quick-create-content-flow') {
					return contentFlowHeight
				}
				if (this.querySelector('[data-testid="quick-create-composer"]')) {
					return 96
				}
				if (this.querySelector('[data-testid="quick-create-create-section"]')) {
					return 44
				}
				if (this.dataset.testid === 'quick-create-task-board-region') {
					return 118
				}
				if (this.dataset.testid === 'quick-create-project-board-region') {
					return 120
				}
				if (this.querySelector('[data-testid="quick-create-footer"]')) {
					return 46
				}

				return 0
			})
		const scrollHeightSpy = vi
			.spyOn(HTMLElement.prototype, 'scrollHeight', 'get')
			.mockImplementation(function (this: HTMLElement) {
				if (this.dataset.testid === 'quick-create-content-flow') {
					return contentFlowHeight
				}

				return 0
			})
		const clientHeightSpy = vi
			.spyOn(HTMLElement.prototype, 'clientHeight', 'get')
			.mockImplementation(function (this: HTMLElement) {
				if (this.getAttribute('aria-label') === 'StoneFlow Quick Create') {
					return surfaceHeight - 2
				}

				return 0
			})

		try {
			render(<QuickCreatePage />)

			await screen.findByTestId('quick-create-recent-tasks-section')
			await waitFor(() => {
				expect(mockedResizeWindow).toHaveBeenCalledWith(expectedHeight)
			})

			expect(mockedResizeWindow).not.toHaveBeenCalledWith(surfaceHeight)
		} finally {
			offsetHeightSpy.mockRestore()
			scrollHeightSpy.mockRestore()
			clientHeightSpy.mockRestore()
		}
	})

	it('composer 保持 primary/advanced 分区，展开 advanced 不影响基础输入区', async () => {
		render(<QuickCreatePage />)
		await screen.findByTestId('quick-create-recent-tasks-section')

		expect(screen.getByTestId('quick-create-primary-meta-bar')).toBeInTheDocument()
		expect(screen.queryByTestId('quick-create-advanced-meta-bar')).not.toBeInTheDocument()

		fireEvent.click(screen.getByLabelText('更多参数'))

		expect(screen.getByTestId('quick-create-advanced-meta-bar')).toBeInTheDocument()
		expect(screen.getByLabelText('Quick Create 输入')).toBeInTheDocument()
	})

	it('搜索时先保留旧结果，不显示正在搜索状态', async () => {
		mockedSearch.mockImplementation(
			() =>
				new Promise((resolve) =>
					window.setTimeout(
						() =>
							resolve({
								tasks: [createTaskResult({ id: 'task-search-next', title: 'Stone 新搜索任务' })],
								projects: [
									createProjectResult({ id: 'project-search-next', name: 'Stone 新搜索项目' }),
								],
							}),
						10,
					),
				),
		)

		render(<QuickCreatePage />)
		await screen.findByTestId('quick-create-recent-tasks-section')

		const input = screen.getByLabelText('Quick Create 输入')
		fireEvent.change(input, { target: { value: 'stone' } })

		expect(screen.queryByText('正在搜索…')).not.toBeInTheDocument()
		expect(screen.getByTestId('quick-create-recent-tasks-section')).toBeInTheDocument()
		expect(screen.getByTestId('quick-create-recent-projects-section')).toBeInTheDocument()
		expect(screen.getByText('最近任务 A')).toBeInTheDocument()
		expect(screen.getByText('最近项目 A')).toBeInTheDocument()

		await waitFor(() => {
			expect(screen.getByTestId('quick-create-tasks-section')).toBeInTheDocument()
		})
		expect(screen.getByTestId('quick-create-projects-section')).toBeInTheDocument()
		expect(screen.getByText('Stone 新搜索任务')).toBeInTheDocument()
		expect(screen.getByText('Stone 新搜索项目')).toBeInTheDocument()
	})

	it('没有匹配结果时直接显示空态，不回 recent', async () => {
		mockedSearch.mockResolvedValueOnce({
			tasks: [],
			projects: [],
		})

		render(<QuickCreatePage />)
		await screen.findByTestId('quick-create-recent-tasks-section')

		fireEvent.change(screen.getByLabelText('Quick Create 输入'), { target: { value: 'xxx' } })

		await waitFor(() => {
			expect(screen.getByText('没有匹配结果')).toBeInTheDocument()
		})
		expect(screen.getByText('Enter')).toBeInTheDocument()
		expect(screen.getByText('创建“xxx”')).toBeInTheDocument()
		expect(screen.queryByTestId('quick-create-recent-tasks-section')).not.toBeInTheDocument()
		expect(screen.queryByTestId('quick-create-recent-projects-section')).not.toBeInTheDocument()
	})

	it('action board 会按 recent/search 模式切换 section', async () => {
		mockedSearch.mockResolvedValueOnce({
			tasks: [createTaskResult({ id: 'task-only', title: '只有任务结果' })],
			projects: [],
		})

		render(<QuickCreatePage />)
		await screen.findByTestId('quick-create-recent-tasks-section')

		expect(screen.getByTestId('quick-create-recent-tasks-section')).toBeInTheDocument()
		expect(screen.getByTestId('quick-create-recent-projects-section')).toBeInTheDocument()

		fireEvent.change(screen.getByLabelText('Quick Create 输入'), { target: { value: 'Only Task' } })

		await waitFor(() => {
			expect(screen.getByTestId('quick-create-tasks-section')).toBeInTheDocument()
		})
		expect(screen.queryByTestId('quick-create-projects-section')).not.toBeInTheDocument()
	})

	it('有搜索结果时 Enter 仍默认创建，ArrowDown 后 Enter 才打开结果', async () => {
		render(<QuickCreatePage />)
		await screen.findByTestId('quick-create-recent-tasks-section')

		const input = screen.getByLabelText('Quick Create 输入')
		fireEvent.change(input, { target: { value: 'Stone' } })
		await waitFor(() => {
			expect(mockedSearch).toHaveBeenCalledWith('Stone', 3)
		})

		fireEvent.keyDown(input, { key: 'Enter' })

		await waitFor(() => {
			expect(mockedCreate).toHaveBeenCalledWith(expect.objectContaining({ title: 'Stone' }))
		})
		expect(mockedOpenTarget).not.toHaveBeenCalled()

		mockedCreate.mockClear()
		fireEvent.change(input, { target: { value: 'Again' } })
		await waitFor(() => {
			expect(mockedSearch).toHaveBeenCalledWith('Again', 3)
		})

		fireEvent.keyDown(input, { key: 'ArrowDown' })
		fireEvent.keyDown(input, { key: 'Enter' })

		await waitFor(() => {
			expect(mockedOpenTarget).toHaveBeenCalledWith({ kind: 'task', id: 'task-search' })
		})
		expect(mockedCreate).not.toHaveBeenCalled()
	})

	it('Shift+Enter 会连续创建并保留已选参数', async () => {
		render(<QuickCreatePage />)
		await screen.findByTestId('quick-create-recent-tasks-section')

		fireEvent.click(screen.getByLabelText('优先级'))
		fireEvent.click(screen.getByText('紧急'))
		fireEvent.click(screen.getByLabelText('更多参数'))
		fireEvent.click(screen.getByRole('button', { name: /待执行/ }))
		fireEvent.click(screen.getByText('已完成'))
		fireEvent.click(screen.getByRole('button', { name: /截止时间/ }))
		fireEvent.click(screen.getByText('明天'))

		const input = screen.getByLabelText('Quick Create 输入')
		fireEvent.change(input, { target: { value: '连续创建任务' } })
		fireEvent.keyDown(input, { key: 'Enter', shiftKey: true })

		await waitFor(() => {
			expect(mockedCreate).toHaveBeenCalledWith(
				expect.objectContaining({
					title: '连续创建任务',
					priority: 4,
					status: 'done',
				}),
			)
		})

		await waitFor(() => {
			expect(screen.getAllByText('已连续创建 1 条').length).toBeGreaterThan(0)
		})
		expect(input).toHaveValue('')
		expect(screen.getByLabelText('优先级').querySelector('svg')).not.toBeNull()
		expect(screen.getByRole('button', { name: /已完成/ })).toBeInTheDocument()
		expect(screen.getByRole('button', { name: /截止/ })).not.toHaveTextContent('截止时间')
	})

	it('Esc 按优先级先关弹层、再清空输入、最后关闭窗口', async () => {
		render(<QuickCreatePage />)
		await screen.findByTestId('quick-create-recent-tasks-section')

		const input = screen.getByLabelText('Quick Create 输入')
		fireEvent.change(input, { target: { value: 'Stone' } })
		fireEvent.click(screen.getByLabelText('优先级'))
		expect(screen.getByText('无优先级')).toBeInTheDocument()

		fireEvent.keyDown(document, { key: 'Escape' })
		await waitFor(() => {
			expect(screen.queryByText('无优先级')).not.toBeInTheDocument()
		})
		expect(input).toHaveValue('Stone')

		fireEvent.keyDown(document, { key: 'Escape' })
		expect(input).toHaveValue('')

		fireEvent.keyDown(document, { key: 'Escape' })
		await waitFor(() => {
			expect(hideMock).toHaveBeenCalled()
		})
	})

	it('切换 Space 后会把项目重置为收件箱', async () => {
		render(<QuickCreatePage />)
		await screen.findByTestId('quick-create-recent-tasks-section')

		fireEvent.click(screen.getByLabelText('项目选择'))
		fireEvent.click(screen.getByText('StoneFlow 开发'))
		expect(screen.getByLabelText('项目选择')).toHaveTextContent('StoneFlow 开发')

		fireEvent.click(screen.getByLabelText('空间选择'))
		fireEvent.click(screen.getByText('工程基础'))

		await waitFor(() => {
			expect(mockedListProjectsBySpace).toHaveBeenCalledWith('space-2')
		})
		await waitFor(() => {
			expect(screen.getByLabelText('项目选择')).toHaveTextContent('收件箱')
		})
	})

	it('切换 Space 不会改变全局最近任务和最近项目', async () => {
		render(<QuickCreatePage />)
		await screen.findByTestId('quick-create-recent-tasks-section')

		expect(screen.getByText('最近任务 A')).toBeInTheDocument()
		expect(screen.getByText('最近项目 A')).toBeInTheDocument()

		fireEvent.click(screen.getByLabelText('空间选择'))
		fireEvent.click(screen.getByText('工程基础'))

		await waitFor(() => {
			expect(mockedListProjectsBySpace).toHaveBeenCalledWith('space-2')
		})

		expect(screen.getByText('最近任务 A')).toBeInTheDocument()
		expect(screen.getByText('最近项目 A')).toBeInTheDocument()
	})

	it('创建成功后会静默刷新全局最近任务', async () => {
		mockedGetInitialState.mockResolvedValueOnce(createInitialState()).mockResolvedValueOnce({
			...createInitialState(),
			recentTasks: [createTaskResult({ id: 'task-new', title: '新建后最近任务' })],
			recentProjects: [createProjectResult({ id: 'project-recent', name: '最近项目 A' })],
		})

		render(<QuickCreatePage />)
		await screen.findByText('最近任务 A')

		const input = screen.getByLabelText('Quick Create 输入')
		fireEvent.change(input, { target: { value: '刚创建的任务' } })
		fireEvent.keyDown(input, { key: 'Enter', shiftKey: true })

		await waitFor(() => {
			expect(mockedCreate).toHaveBeenCalledWith(expect.objectContaining({ title: '刚创建的任务' }))
		})
		await waitFor(() => {
			expect(mockedGetInitialState).toHaveBeenCalledTimes(2)
		})
		await waitFor(() => {
			expect(screen.getByText('新建后最近任务')).toBeInTheDocument()
		})
	})

	it('面板再次显示时会重新读取最新默认 Space', async () => {
		const nextInitialState = {
			...createInitialState(),
			currentScope: {
				type: 'space' as const,
				spaceId: 'space-2',
			},
			defaultSpaceId: 'space-2',
			projects: [
				createProjectOption({ kind: 'inbox', id: null, name: '收件箱', spaceId: 'space-2' }),
				createProjectOption({ kind: 'noProject', id: null, name: '独立事项', spaceId: 'space-2' }),
				createProjectOption({
					kind: 'project',
					id: 'project-2',
					name: '工程基座',
					spaceId: 'space-2',
				}),
			],
		}
		let prepareHandler: (() => void) | null = null
		listenMock.mockImplementation(async (event, handler) => {
			if (event === 'quick-create:prepare') {
				prepareHandler = handler as () => void
			}
			return () => undefined
		})
		mockedGetInitialState
			.mockResolvedValueOnce(createInitialState())
			.mockResolvedValueOnce(nextInitialState)

		render(<QuickCreatePage />)
		await screen.findByTestId('quick-create-recent-tasks-section')
		expect(screen.getByLabelText('空间选择')).toHaveTextContent('产品研发')

		if (prepareHandler) {
			;(prepareHandler as () => void)()
		}

		expect(screen.getByTestId('quick-create-recent-tasks-section')).toBeInTheDocument()

		await waitFor(() => {
			expect(mockedGetInitialState).toHaveBeenCalledTimes(2)
		})
		await waitFor(() => {
			expect(screen.getByLabelText('空间选择')).toHaveTextContent('工程基础')
		})
	})

	it('挂载后会通知 helper 前端监听器已就绪', async () => {
		render(<QuickCreatePage />)

		await screen.findByTestId('quick-create-recent-tasks-section')

		expect(mockedNotifyFrontendReady).toHaveBeenCalledTimes(1)
	})

	it('搜索结果只显示有内容的分组标题', async () => {
		mockedSearch.mockResolvedValueOnce({
			tasks: [createTaskResult({ id: 'task-only', title: '只有任务结果' })],
			projects: [],
		})

		render(<QuickCreatePage />)
		await screen.findByTestId('quick-create-recent-tasks-section')

		const input = screen.getByLabelText('Quick Create 输入')
		fireEvent.change(input, { target: { value: 'Only Task' } })

		await waitFor(() => {
			expect(screen.getByTestId('quick-create-tasks-section')).toBeInTheDocument()
		})
		expect(screen.queryByTestId('quick-create-projects-section')).not.toBeInTheDocument()
	})
})

describe('formatDateLabel', () => {
	it('按本地日期解析 yyyy-MM-dd，避免 UTC 偏移', () => {
		expect(formatDateLabel('2026-05-01')).toBe('5/1')
	})
})

describe('measureQuickCreateTargetHeight', () => {
	it('缺 toast 时按固定区域和 surface chrome 求和', () => {
		expect(
			measureQuickCreateTargetHeight({
				composerHeight: 92,
				createRowHeight: 42,
				taskBoardHeight: 110,
				projectBoardHeight: 116,
				footerHeight: 44,
				surfaceOffsetHeight: 406,
				surfaceClientHeight: 404,
			}),
		).toBe(478)
	})

	it('内容流高度高于分区求和时，以内容流为准', () => {
		expect(
			measureQuickCreateTargetHeight({
				contentHeight: 430,
				composerHeight: 92,
				createRowHeight: 42,
				taskBoardHeight: 110,
				projectBoardHeight: 116,
				footerHeight: 44,
				surfaceOffsetHeight: 432,
				surfaceClientHeight: 430,
			}),
		).toBe(504)
	})

	it('含 toast 时把 toast 自然高度纳入窗口高度', () => {
		expect(
			measureQuickCreateTargetHeight({
				composerHeight: 92,
				toastHeight: 28,
				createRowHeight: 42,
				taskBoardHeight: 110,
				projectBoardHeight: 116,
				footerHeight: 44,
				surfaceOffsetHeight: 434,
				surfaceClientHeight: 432,
			}),
		).toBe(506)
	})

	it('只有 task board 时 project board 按 0 计算', () => {
		expect(
			measureQuickCreateTargetHeight({
				composerHeight: 92,
				createRowHeight: 42,
				taskBoardHeight: 110,
				footerHeight: 44,
				surfaceOffsetHeight: 290,
				surfaceClientHeight: 288,
			}),
		).toBe(362)
	})

	it('task 和 project 双 board 时完整展开求和', () => {
		expect(
			measureQuickCreateTargetHeight({
				composerHeight: 92,
				createRowHeight: 42,
				taskBoardHeight: 110,
				projectBoardHeight: 116,
				footerHeight: 44,
				surfaceOffsetHeight: 406,
				surfaceClientHeight: 404,
			}),
		).toBe(478)
	})

	it('空态缺 board 时只计算固定区域', () => {
		expect(
			measureQuickCreateTargetHeight({
				composerHeight: 92,
				createRowHeight: 42,
				footerHeight: 44,
				surfaceOffsetHeight: 180,
				surfaceClientHeight: 178,
			}),
		).toBe(252)
	})
})

function createInitialState(): QuickCreateInitialState {
	return {
		currentScope: {
			type: 'space',
			spaceId: 'space-1',
		},
		defaultSpaceId: 'space-1',
		defaultPlacement: {
			kind: 'inbox',
			projectId: null,
		},
		spaces: [
			{ id: 'space-1', name: '产品研发', iconKey: 'briefcase', colorKey: 'blue', isDefault: true },
			{ id: 'space-2', name: '工程基础', iconKey: 'sparkles', colorKey: 'amber', isDefault: false },
		],
		projects: [
			createProjectOption({ kind: 'inbox', id: null, name: '收件箱' }),
			createProjectOption({ kind: 'noProject', id: null, name: '独立事项' }),
			createProjectOption({ kind: 'project', id: 'project-1', name: 'StoneFlow 开发' }),
		],
		recentTasks: [createTaskResult({ id: 'task-recent', title: '最近任务 A' })],
		recentProjects: [createProjectResult({ id: 'project-recent', name: '最近项目 A' })],
	}
}

function createProjectsBySpace(spaceId: string): QuickCreateProjectsBySpace {
	return {
		spaceId,
		inboxProject: createProjectOption({ kind: 'inbox', id: null, name: '收件箱', spaceId }),
		noProjectOption: createProjectOption({
			kind: 'noProject',
			id: null,
			name: '独立事项',
			spaceId,
		}),
		projects: [
			createProjectOption({ kind: 'project', id: 'project-2', name: '工程基座', spaceId }),
		],
	}
}

function createProjectOption(
	overrides: Partial<Extract<QuickCreateProjectOption, { kind: 'project' }>> &
		Pick<Extract<QuickCreateProjectOption, { kind: 'project' }>, 'kind' | 'id' | 'name'>,
): Extract<QuickCreateProjectOption, { kind: 'project' }>
function createProjectOption(
	overrides: Partial<Extract<QuickCreateProjectOption, { kind: 'inbox' }>> &
		Pick<Extract<QuickCreateProjectOption, { kind: 'inbox' }>, 'kind' | 'id' | 'name'>,
): Extract<QuickCreateProjectOption, { kind: 'inbox' }>
function createProjectOption(
	overrides: Partial<Extract<QuickCreateProjectOption, { kind: 'noProject' }>> &
		Pick<Extract<QuickCreateProjectOption, { kind: 'noProject' }>, 'kind' | 'id' | 'name'>,
): Extract<QuickCreateProjectOption, { kind: 'noProject' }>
function createProjectOption(
	overrides: Partial<QuickCreateProjectOption> &
		Pick<QuickCreateProjectOption, 'kind' | 'id' | 'name'>,
): QuickCreateProjectOption {
	switch (overrides.kind) {
		case 'project':
			return {
				kind: 'project',
				id: overrides.id ?? 'project-1',
				spaceId: overrides.spaceId ?? 'space-1',
				name: overrides.name,
			}
		case 'inbox':
			return {
				kind: 'inbox',
				id: null,
				spaceId: overrides.spaceId ?? 'space-1',
				name: overrides.name,
			}
		default:
			return {
				kind: 'noProject',
				id: null,
				spaceId: overrides.spaceId ?? 'space-1',
				name: overrides.name,
			}
	}
}

function createTaskResult(overrides: Partial<QuickCreateTaskItem> = {}): QuickCreateTaskItem {
	return {
		id: 'task-1',
		spaceId: 'space-1',
		spaceName: '产品研发',
		projectId: null,
		projectName: null,
		inboxAt: '2026-05-10T10:00:00Z',
		title: '任务 A',
		note: null,
		priority: 2,
		status: 'todo',
		updatedAt: '2026-05-10T10:00:00Z',
		completedAt: null,
		...overrides,
	}
}

function createProjectResult(
	overrides: Partial<QuickCreateProjectItem> = {},
): QuickCreateProjectItem {
	return {
		id: 'project-1',
		spaceId: 'space-1',
		spaceName: '产品研发',
		name: '项目 A',
		note: null,
		updatedAt: '2026-05-10T10:00:00Z',
		completedAt: null,
		...overrides,
	}
}

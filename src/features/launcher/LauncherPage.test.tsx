import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import type { PropsWithChildren } from 'react'

import {
	closeSession,
	create,
	createAndOpen,
	getRecentData,
	listProjectsBySpace,
	notifyFrontendReady,
	openTarget,
	presentSession,
	search,
} from './api/launcherApi'
import { LauncherPage } from './LauncherPage'
import type {
	LauncherOpenContext,
	LauncherRecentData,
	LauncherProjectItem,
	LauncherProjectOption,
	LauncherProjectsBySpace,
	LauncherTaskItem,
} from './model/types'
import { formatDateLabel } from './model/launcherFormatters'

const listenMock = vi.fn()
const originalRequestAnimationFrame = window.requestAnimationFrame
const originalCancelAnimationFrame = window.cancelAnimationFrame
const DEFAULT_SESSION_ID = 'session-1'

vi.mock('./api/launcherApi', () => ({
	closeSession: vi.fn<typeof closeSession>(),
	create: vi.fn<typeof create>(),
	createAndOpen: vi.fn<typeof createAndOpen>(),
	getRecentData: vi.fn<typeof getRecentData>(),
	listProjectsBySpace: vi.fn<typeof listProjectsBySpace>(),
	notifyFrontendReady: vi.fn<typeof notifyFrontendReady>(),
	openTarget: vi.fn<typeof openTarget>(),
	presentSession: vi.fn<typeof presentSession>(),
	search: vi.fn<typeof search>(),
}))

vi.mock('@tauri-apps/api/event', () => ({
	listen: (...args: unknown[]) => listenMock(...args),
}))

vi.mock('@/shared/components/base/dropdown-menu', async () => {
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

vi.mock('@/shared/components/base/calendar', () => ({
	Calendar: () => <div data-testid='calendar' />,
}))

const mockedCloseSession = vi.mocked(closeSession)
const mockedCreate = vi.mocked(create)
const mockedCreateAndOpen = vi.mocked(createAndOpen)
const mockedGetRecentData = vi.mocked(getRecentData)
const mockedListProjectsBySpace = vi.mocked(listProjectsBySpace)
const mockedNotifyFrontendReady = vi.mocked(notifyFrontendReady)
const mockedOpenTarget = vi.mocked(openTarget)
const mockedPresentSession = vi.mocked(presentSession)
const mockedSearch = vi.mocked(search)

type PreparedSessionHandler = (event: {
	payload: ReturnType<typeof createOpenSessionResponse>
}) => void
type PresentedSessionHandler = (event: { payload: { sessionId: string } }) => void

function unregisteredPreparedHandler(): never {
	throw new Error('preparedHandler 未注册')
}

function unregisteredPresentedHandler(): never {
	throw new Error('presentedHandler 未注册')
}

describe('LauncherPage', () => {
	beforeEach(() => {
		window.requestAnimationFrame = ((callback: FrameRequestCallback) => {
			return window.setTimeout(() => callback(performance.now()), 0)
		}) as typeof window.requestAnimationFrame
		window.cancelAnimationFrame = ((id: number) => {
			window.clearTimeout(id)
		}) as typeof window.cancelAnimationFrame
		listenMock.mockReset()
		listenMock.mockImplementation(async (event, handler) => {
			if (event === 'launcher:session-prepared') {
				queueMicrotask(() => {
					void (
						handler as (event: { payload: ReturnType<typeof createOpenSessionResponse> }) => void
					)({
						payload: createOpenSessionResponse(),
					})
				})
			}
			if (event === 'launcher:session-presented') {
				queueMicrotask(() => {
					void (handler as (event: { payload: { sessionId: string } }) => void)({
						payload: { sessionId: DEFAULT_SESSION_ID },
					})
				})
			}
			return () => undefined
		})
		mockedCloseSession.mockReset()
		mockedCloseSession.mockResolvedValue(undefined)
		mockedCreate.mockReset()
		mockedCreate.mockResolvedValue(createTaskDetail())
		mockedCreateAndOpen.mockReset()
		mockedCreateAndOpen.mockResolvedValue(createTaskDetail())
		mockedGetRecentData.mockReset()
		mockedGetRecentData.mockResolvedValue(createRecentData())
		mockedListProjectsBySpace.mockReset()
		mockedListProjectsBySpace.mockResolvedValue(createProjectsBySpace('space-2'))
		mockedNotifyFrontendReady.mockReset()
		mockedNotifyFrontendReady.mockResolvedValue(undefined)
		mockedOpenTarget.mockReset()
		mockedOpenTarget.mockResolvedValue(undefined)
		mockedPresentSession.mockReset()
		mockedPresentSession.mockResolvedValue(undefined)
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
		render(<LauncherPage />)

		expect(await screen.findByTestId('launcher-recent-tasks-section')).toBeInTheDocument()
		expect(screen.getByTestId('launcher-recent-projects-section')).toBeInTheDocument()
		expect(screen.queryByText('创建任务')).not.toBeInTheDocument()

		const input = screen.getByLabelText('Launcher 输入')
		expect(input).toBeInTheDocument()
	})

	it('页面保持 composer、action board、footer 三段逻辑分区', async () => {
		render(<LauncherPage />)

		await screen.findByTestId('launcher-recent-tasks-section')

		expect(screen.getByTestId('launcher-composer')).toBeInTheDocument()
		expect(screen.getByTestId('launcher-results')).toBeInTheDocument()
		expect(screen.getByTestId('launcher-footer')).toBeInTheDocument()
	})

	it('打开会话直接 present', async () => {
		render(<LauncherPage />)

		await screen.findByTestId('launcher-recent-tasks-section')
		await waitFor(() => {
			expect(mockedPresentSession).toHaveBeenCalledWith({ sessionId: DEFAULT_SESSION_ID })
		})
	})

	it('展开 advanced 或输入变长仍只 present 一次', async () => {
		render(<LauncherPage />)
		await screen.findByTestId('launcher-recent-tasks-section')
		await waitFor(() => {
			expect(mockedPresentSession).toHaveBeenCalledTimes(1)
		})

		fireEvent.click(screen.getByLabelText('更多参数'))
		fireEvent.change(screen.getByLabelText('Launcher 输入'), {
			target: { value: '需要创建一条较长标题来撑高内容' },
		})

		await screen.findByTestId('launcher-advanced-meta-bar')
		expect(mockedPresentSession).toHaveBeenCalledTimes(1)
	})

	it('composer 保持 primary/advanced 分区，展开 advanced 不影响基础输入区', async () => {
		render(<LauncherPage />)
		await screen.findByTestId('launcher-recent-tasks-section')

		expect(screen.getByTestId('launcher-primary-meta-bar')).toBeInTheDocument()
		expect(screen.getByTestId('launcher-advanced-collapse')).toHaveAttribute('aria-hidden', 'true')

		fireEvent.click(screen.getByLabelText('更多参数'))

		expect(screen.getByTestId('launcher-advanced-collapse')).toHaveAttribute('aria-hidden', 'false')
		expect(screen.getByTestId('launcher-advanced-meta-bar')).toBeInTheDocument()
		expect(screen.getByLabelText('Launcher 输入')).toBeInTheDocument()
	})

	it('固定壳包含 panel 与 Results 内滚槽位', async () => {
		render(<LauncherPage />)
		await screen.findByTestId('launcher-recent-tasks-section')

		expect(screen.getByTestId('launcher-panel')).toBeInTheDocument()
		expect(screen.getByTestId('launcher-results-scroll')).toBeInTheDocument()
		expect(screen.getByTestId('launcher-results-scroll')).toHaveAttribute(
			'data-scroll-container',
			'true',
		)
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

		render(<LauncherPage />)
		await screen.findByTestId('launcher-recent-tasks-section')

		const input = screen.getByLabelText('Launcher 输入')
		fireEvent.change(input, { target: { value: 'stone' } })

		expect(screen.queryByText('正在搜索…')).not.toBeInTheDocument()
		expect(screen.getByTestId('launcher-recent-tasks-section')).toBeInTheDocument()
		expect(screen.getByTestId('launcher-recent-projects-section')).toBeInTheDocument()
		expect(screen.getByText('最近任务 A')).toBeInTheDocument()
		expect(screen.getByText('最近项目 A')).toBeInTheDocument()

		await waitFor(() => {
			expect(screen.getByTestId('launcher-search-results')).toBeInTheDocument()
		})

		expect(screen.getByText('Stone 新搜索任务')).toBeInTheDocument()
		expect(screen.getByText('Stone 新搜索项目')).toBeInTheDocument()
	})

	it('中文组合输入期间不触发搜索，结束后再按最终标题搜索', async () => {
		render(<LauncherPage />)
		await screen.findByTestId('launcher-recent-tasks-section')

		const input = screen.getByLabelText('Launcher 输入')

		fireEvent.compositionStart(input)
		fireEvent.change(input, {
			target: { value: '输' },
			nativeEvent: { isComposing: true },
		})
		fireEvent.change(input, {
			target: { value: '输入' },
			nativeEvent: { isComposing: true },
		})

		expect(input).toHaveValue('输入')
		expect(mockedSearch).not.toHaveBeenCalled()

		fireEvent.compositionEnd(input, {
			target: { value: '输入法' },
		})

		await waitFor(() => {
			expect(mockedSearch).toHaveBeenCalledWith('输入法', 20)
		})
		expect(input).toHaveValue('输入法')
	})

	it('没有匹配结果时直接显示空态，不回 recent', async () => {
		mockedSearch.mockResolvedValueOnce({
			tasks: [],
			projects: [],
		})

		render(<LauncherPage />)
		await screen.findByTestId('launcher-recent-tasks-section')

		fireEvent.change(screen.getByLabelText('Launcher 输入'), { target: { value: 'xxx' } })

		await waitFor(() => {
			expect(screen.getByText('没有匹配结果')).toBeInTheDocument()
		})
		expect(screen.getByText('Enter')).toBeInTheDocument()
		expect(screen.getByText(/创建「xxx」/)).toBeInTheDocument()
		expect(screen.queryByTestId('launcher-recent-tasks-section')).not.toBeInTheDocument()
		expect(screen.queryByTestId('launcher-recent-projects-section')).not.toBeInTheDocument()
	})

	it('action board 会按 recent/search 模式切换', async () => {
		mockedSearch.mockResolvedValueOnce({
			tasks: [createTaskResult({ id: 'task-only', title: '只有任务结果' })],
			projects: [],
		})

		render(<LauncherPage />)
		await screen.findByTestId('launcher-recent-tasks-section')

		expect(screen.getByTestId('launcher-recent-tasks-section')).toBeInTheDocument()
		expect(screen.getByTestId('launcher-recent-projects-section')).toBeInTheDocument()

		fireEvent.change(screen.getByLabelText('Launcher 输入'), { target: { value: 'Only Task' } })

		await waitFor(() => {
			expect(screen.getByTestId('launcher-search-results')).toBeInTheDocument()
		})
		expect(screen.getByText('只有任务结果')).toBeInTheDocument()
		expect(screen.queryByTestId('launcher-recent-tasks-section')).not.toBeInTheDocument()
		expect(screen.queryByText('最近任务')).not.toBeInTheDocument()
	})

	it('有搜索结果时 Enter 仍默认创建，ArrowDown 后 Enter 才打开结果', async () => {
		render(<LauncherPage />)
		await screen.findByTestId('launcher-recent-tasks-section')

		const input = screen.getByLabelText('Launcher 输入')
		fireEvent.change(input, { target: { value: 'Stone' } })
		await waitFor(() => {
			expect(mockedSearch).toHaveBeenCalledWith('Stone', 20)
		})

		fireEvent.keyDown(input, { key: 'Enter' })

		await waitFor(() => {
			expect(mockedCreate).toHaveBeenCalledWith(expect.objectContaining({ title: 'Stone' }))
		})
		expect(mockedOpenTarget).not.toHaveBeenCalled()

		mockedCreate.mockClear()
		fireEvent.change(input, { target: { value: 'Again' } })
		await waitFor(() => {
			expect(mockedSearch).toHaveBeenCalledWith('Again', 20)
		})

		fireEvent.keyDown(input, { key: 'ArrowDown' })
		fireEvent.keyDown(input, { key: 'Enter' })

		await waitFor(() => {
			expect(mockedOpenTarget).toHaveBeenCalledWith({ kind: 'task', id: 'task-search' })
		})
		expect(mockedCreate).not.toHaveBeenCalled()
	})

	it('Shift+Enter 会连续创建并保留已选参数', async () => {
		render(<LauncherPage />)
		await screen.findByTestId('launcher-recent-tasks-section')

		fireEvent.click(screen.getByLabelText('优先级'))
		fireEvent.click(screen.getByText('紧急'))
		fireEvent.click(screen.getByLabelText('更多参数'))
		fireEvent.click(screen.getByRole('button', { name: /待执行/ }))
		fireEvent.click(screen.getByText('已完成'))
		fireEvent.click(screen.getByRole('button', { name: /截止时间/ }))
		fireEvent.click(screen.getByText('明天'))

		const input = screen.getByLabelText('Launcher 输入')
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
		render(<LauncherPage />)
		await screen.findByTestId('launcher-recent-tasks-section')

		const input = screen.getByLabelText('Launcher 输入')
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
			expect(mockedCloseSession).toHaveBeenCalledWith({
				reason: 'escape',
				sessionId: DEFAULT_SESSION_ID,
			})
		})
	})

	it('切换 Space 后会把项目重置为独立事项', async () => {
		render(<LauncherPage />)
		await screen.findByTestId('launcher-recent-tasks-section')

		fireEvent.click(screen.getByLabelText('项目选择'))
		fireEvent.click(screen.getByText('StoneFlow 开发'))
		expect(screen.getByLabelText('项目选择')).toHaveTextContent('StoneFlow 开发')

		fireEvent.click(screen.getByLabelText('空间选择'))
		fireEvent.click(screen.getByText('工程基础'))

		await waitFor(() => {
			expect(mockedListProjectsBySpace).toHaveBeenCalledWith('space-2')
		})
		await waitFor(() => {
			expect(screen.getByLabelText('项目选择')).toHaveTextContent('独立事项')
		})
	})

	it('切换 Space 不会改变全局最近任务和最近项目', async () => {
		render(<LauncherPage />)
		await screen.findByTestId('launcher-recent-tasks-section')

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
		mockedGetRecentData.mockResolvedValueOnce(createRecentData()).mockResolvedValueOnce({
			recentTasks: [createTaskResult({ id: 'task-new', title: '新建后最近任务' })],
			recentProjects: [createProjectResult({ id: 'project-recent', name: '最近项目 A' })],
		})

		render(<LauncherPage />)
		await screen.findByText('最近任务 A')

		const input = screen.getByLabelText('Launcher 输入')
		fireEvent.change(input, { target: { value: '刚创建的任务' } })
		fireEvent.keyDown(input, { key: 'Enter', shiftKey: true })

		await waitFor(() => {
			expect(mockedCreate).toHaveBeenCalledWith(expect.objectContaining({ title: '刚创建的任务' }))
		})
		await waitFor(() => {
			expect(mockedGetRecentData).toHaveBeenCalledTimes(2)
		})
		await waitFor(() => {
			expect(screen.getByText('新建后最近任务')).toBeInTheDocument()
		})
	})

	it('面板再次显示时会重新读取最新默认 Space', async () => {
		const nextOpenContext = createOpenSessionResponse({
			sessionId: 'session-2',
			currentScope: {
				type: 'space',
				spaceId: 'space-2',
			},
			defaultSpaceId: 'space-2',
			projects: [
				createProjectOption({ kind: 'standalone', id: null, name: '独立事项', spaceId: 'space-2' }),
				createProjectOption({
					kind: 'project',
					id: 'project-2',
					name: '工程基座',
					spaceId: 'space-2',
				}),
			],
		})
		let preparedHandler: PreparedSessionHandler = unregisteredPreparedHandler
		listenMock.mockImplementation(async (event, handler) => {
			if (event === 'launcher:session-prepared') {
				preparedHandler = handler as PreparedSessionHandler
				queueMicrotask(() => {
					preparedHandler?.({ payload: createOpenSessionResponse() })
				})
			}
			if (event === 'launcher:session-presented') {
				queueMicrotask(() => {
					void (handler as (event: { payload: { sessionId: string } }) => void)({
						payload: { sessionId: DEFAULT_SESSION_ID },
					})
				})
			}
			return () => undefined
		})

		render(<LauncherPage />)
		await screen.findByTestId('launcher-recent-tasks-section')
		expect(screen.getByLabelText('空间选择')).toHaveTextContent('产品研发')

		fireEvent.keyDown(document, { key: 'Escape' })
		await waitFor(() => {
			expect(mockedCloseSession).toHaveBeenCalledWith({
				reason: 'escape',
				sessionId: DEFAULT_SESSION_ID,
			})
		})

		preparedHandler({ payload: nextOpenContext })

		await waitFor(() => {
			expect(screen.getByLabelText('空间选择')).toHaveTextContent('工程基础')
		})
	})

	it('面板再次显示时不会覆盖已编辑草稿', async () => {
		let preparedHandler: PreparedSessionHandler = unregisteredPreparedHandler
		listenMock.mockImplementation(async (event, handler) => {
			if (event === 'launcher:session-prepared') {
				preparedHandler = handler as PreparedSessionHandler
				queueMicrotask(() => {
					preparedHandler?.({ payload: createOpenSessionResponse() })
				})
			}
			return () => undefined
		})

		render(<LauncherPage />)
		await screen.findByTestId('launcher-recent-tasks-section')

		const input = screen.getByLabelText('Launcher 输入')
		fireEvent.change(input, { target: { value: '用户已编辑草稿' } })

		preparedHandler({
			payload: createOpenSessionResponse({
				sessionId: 'session-2',
				currentScope: { type: 'space', spaceId: 'space-2' },
				defaultSpaceId: 'space-2',
				projects: [
					createProjectOption({
						kind: 'standalone',
						id: null,
						name: '独立事项',
						spaceId: 'space-2',
					}),
					createProjectOption({
						kind: 'standalone',
						id: null,
						name: '独立事项',
						spaceId: 'space-2',
					}),
				],
			}),
		})

		await waitFor(() => {
			expect(screen.getByLabelText('Launcher 输入')).toHaveValue('用户已编辑草稿')
		})
		expect(screen.getByLabelText('空间选择')).toHaveTextContent('产品研发')
	})

	it('stale session 的 presented 事件不会重新显示已关闭面板', async () => {
		let preparedHandler: PreparedSessionHandler = unregisteredPreparedHandler
		let presentedHandler: PresentedSessionHandler = unregisteredPresentedHandler
		listenMock.mockImplementation(async (event, handler) => {
			if (event === 'launcher:session-prepared') {
				preparedHandler = handler as PreparedSessionHandler
				queueMicrotask(() => {
					preparedHandler?.({ payload: createOpenSessionResponse() })
				})
			}
			if (event === 'launcher:session-presented') {
				presentedHandler = handler as PresentedSessionHandler
				queueMicrotask(() => {
					presentedHandler?.({ payload: { sessionId: DEFAULT_SESSION_ID } })
				})
			}
			return () => undefined
		})

		render(<LauncherPage />)
		await screen.findByTestId('launcher-recent-tasks-section')

		fireEvent.keyDown(document, { key: 'Escape' })
		await waitFor(() => {
			expect(mockedCloseSession).toHaveBeenCalledWith({
				reason: 'escape',
				sessionId: DEFAULT_SESSION_ID,
			})
		})

		await waitFor(() => {
			expect(screen.getByLabelText('StoneFlow Launcher')).toHaveClass('opacity-0')
		})

		presentedHandler({ payload: { sessionId: DEFAULT_SESSION_ID } })

		await waitFor(() => {
			expect(screen.getByLabelText('StoneFlow Launcher')).toHaveClass('opacity-0')
		})
	})

	it('挂载后会通知 runtime 前端监听器已就绪', async () => {
		render(<LauncherPage />)

		await screen.findByTestId('launcher-recent-tasks-section')

		expect(mockedNotifyFrontendReady).toHaveBeenCalledTimes(1)
	})

	it('搜索结果以统一流展示，顶部固定轻标题', async () => {
		mockedSearch.mockResolvedValueOnce({
			tasks: [createTaskResult({ id: 'task-only', title: '只有任务结果' })],
			projects: [],
		})

		render(<LauncherPage />)
		await screen.findByTestId('launcher-recent-tasks-section')

		const input = screen.getByLabelText('Launcher 输入')
		fireEvent.change(input, { target: { value: 'Only Task' } })

		await waitFor(() => {
			expect(screen.getByTestId('launcher-search-results')).toBeInTheDocument()
		})
		expect(screen.getByTestId('launcher-search-section')).toBeInTheDocument()
		expect(screen.getByText('搜索结果')).toBeInTheDocument()
		expect(screen.getByText('只有任务结果')).toBeInTheDocument()
		expect(screen.queryByText('最近任务')).not.toBeInTheDocument()
		expect(screen.queryByText('最近项目')).not.toBeInTheDocument()
	})
})

describe('formatDateLabel', () => {
	it('按本地日期解析 yyyy-MM-dd，避免 UTC 偏移', () => {
		expect(formatDateLabel('2026-05-01')).toBe('5/1')
	})
})

function createOpenContext(): LauncherOpenContext {
	return {
		currentScope: {
			type: 'space',
			spaceId: 'space-1',
		},
		defaultSpaceId: 'space-1',
		defaultPlacement: {
			kind: 'standalone',
			projectId: null,
		},
		spaces: [
			{ id: 'space-1', name: '产品研发', iconKey: 'briefcase', colorKey: 'blue', isDefault: true },
			{ id: 'space-2', name: '工程基础', iconKey: 'sparkles', colorKey: 'amber', isDefault: false },
		],
		projects: [
			createProjectOption({ kind: 'standalone', id: null, name: '独立事项' }),
			createProjectOption({ kind: 'project', id: 'project-1', name: 'StoneFlow 开发' }),
		],
	}
}

function createRecentData(): LauncherRecentData {
	return {
		recentTasks: [createTaskResult({ id: 'task-recent', title: '最近任务 A' })],
		recentProjects: [createProjectResult({ id: 'project-recent', name: '最近项目 A' })],
	}
}

function createOpenSessionResponse(
	overrides: Partial<LauncherOpenContext & { sessionId: string; openedAt: string }> = {},
) {
	const openContext = {
		...createOpenContext(),
		...overrides,
	}

	return {
		sessionId: overrides.sessionId ?? DEFAULT_SESSION_ID,
		openedAt: overrides.openedAt ?? '2026-05-13T08:00:00.000Z',
		currentScope: openContext.currentScope,
		defaultSpaceId: openContext.defaultSpaceId,
		defaultPlacement: openContext.defaultPlacement,
		spaces: openContext.spaces,
		projects: openContext.projects,
	}
}

function createProjectsBySpace(spaceId: string): LauncherProjectsBySpace {
	return {
		spaceId,
		standaloneOption: createProjectOption({
			kind: 'standalone',
			id: null,
			name: '独立事项',
			spaceId,
		}) as Extract<LauncherProjectOption, { kind: 'standalone' }>,
		projects: [
			createProjectOption({
				kind: 'project',
				id: 'project-2',
				name: '工程基座',
				spaceId,
			}) as Extract<LauncherProjectOption, { kind: 'project' }>,
		],
	}
}

function createProjectOption(
	overrides: Partial<LauncherProjectOption> &
		Pick<LauncherProjectOption, 'kind' | 'name'> & {
			id?: string | null
			spaceId?: string
		},
): LauncherProjectOption {
	if (overrides.kind === 'project') {
		return {
			kind: 'project',
			id: overrides.id ?? 'project-1',
			spaceId: overrides.spaceId ?? 'space-1',
			name: overrides.name,
		}
	}
	return {
		kind: 'standalone',
		id: null,
		spaceId: overrides.spaceId ?? 'space-1',
		name: overrides.name,
	}
}

function createTaskResult(overrides: Partial<LauncherTaskItem> = {}): LauncherTaskItem {
	return {
		id: 'task-1',
		spaceId: 'space-1',
		spaceName: '产品研发',
		projectId: null,
		projectName: null,
		title: '任务 A',
		note: null,
		priority: 2,
		status: 'todo',
		updatedAt: '2026-05-10T10:00:00Z',
		completedAt: null,
		...overrides,
	}
}

function createTaskDetail() {
	return {
		id: 'task-created',
		spaceId: 'space-1',
		spaceName: '产品研发',
		spaceSlug: 'work',
		projectId: null,
		projectName: null,
		title: '新任务',
		note: null,
		priority: 0 as const,
		status: 'todo' as const,
		statusChangedAt: '2026-05-10T10:00:00Z',
		dueAt: null,
		plannedAt: null,
		remindAt: null,
		completedAt: null,
		canceledAt: null,
		archivedAt: null,
		createdAt: '2026-05-10T10:00:00Z',
		updatedAt: '2026-05-10T10:00:00Z',
		position: 0,
		deletedAt: null,
	}
}

function createProjectResult(overrides: Partial<LauncherProjectItem> = {}): LauncherProjectItem {
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

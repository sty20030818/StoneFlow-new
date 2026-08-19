import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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
	LauncherProjectItem,
	LauncherProjectOption,
	LauncherProjectsBySpace,
	LauncherRecentData,
	LauncherTaskItem,
} from './model/types'
import { getLauncherShortcutTokens } from './model/launcherShortcutKeymap'
import { getShortcutAccessibilityLabel, inferShortcutPlatform } from '@/shared/lib/keyboardShortcut'

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
		window.requestAnimationFrame = ((callback: FrameRequestCallback) =>
			window.setTimeout(
				() => callback(performance.now()),
				0,
			)) as typeof window.requestAnimationFrame
		window.cancelAnimationFrame = ((id: number) => {
			window.clearTimeout(id)
		}) as typeof window.cancelAnimationFrame
		listenMock.mockReset()
		listenMock.mockImplementation(async (event, handler) => {
			if (event === 'launcher:session-prepared') {
				queueMicrotask(() => {
					;(handler as PreparedSessionHandler)({ payload: createOpenSessionResponse() })
				})
			}
			if (event === 'launcher:session-presented') {
				queueMicrotask(() => {
					;(handler as PresentedSessionHandler)({
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

	afterEach(() => {
		window.requestAnimationFrame = originalRequestAnimationFrame
		window.cancelAnimationFrame = originalCancelAnimationFrame
	})

	it('准备会话后展示最近内容，并完成 runtime ready 与 present 握手', async () => {
		render(<LauncherPage />)

		expect(await screen.findByTestId('launcher-recent-tasks-section')).toBeInTheDocument()
		expect(screen.getByTestId('launcher-recent-projects-section')).toBeInTheDocument()
		expect(screen.getByLabelText('Launcher 输入')).toBeInTheDocument()
		await waitFor(() => {
			expect(mockedNotifyFrontendReady).toHaveBeenCalledTimes(1)
			expect(mockedPresentSession).toHaveBeenCalledWith({ sessionId: DEFAULT_SESSION_ID })
		})
	})

	it('搜索期间保留最近内容，完成后切换为搜索结果', async () => {
		let resolveSearch: ((value: Awaited<ReturnType<typeof search>>) => void) | undefined
		mockedSearch.mockReturnValue(
			new Promise((resolve) => {
				resolveSearch = resolve
			}),
		)
		render(<LauncherPage />)
		await screen.findByTestId('launcher-recent-tasks-section')

		fireEvent.change(screen.getByLabelText('Launcher 输入'), { target: { value: 'stone' } })
		await waitFor(() => expect(mockedSearch).toHaveBeenCalledWith('stone', 20))
		expect(screen.getByText('最近任务 A')).toBeInTheDocument()
		expect(screen.queryByText('正在搜索…')).not.toBeInTheDocument()

		resolveSearch?.({
			tasks: [createTaskResult({ id: 'task-next', title: 'Stone 新搜索任务' })],
			projects: [createProjectResult({ id: 'project-next', name: 'Stone 新搜索项目' })],
		})
		await waitFor(() => expect(screen.getByText('Stone 新搜索任务')).toBeInTheDocument())
		expect(screen.queryByTestId('launcher-recent-tasks-section')).not.toBeInTheDocument()
	})

	it('中文组合输入只在 composition end 后搜索最终标题', async () => {
		render(<LauncherPage />)
		await screen.findByTestId('launcher-recent-tasks-section')
		const input = screen.getByLabelText('Launcher 输入')

		fireEvent.compositionStart(input)
		fireEvent.change(input, { target: { value: '输入' }, nativeEvent: { isComposing: true } })
		expect(mockedSearch).not.toHaveBeenCalled()
		fireEvent.compositionEnd(input, { target: { value: '输入法' } })

		await waitFor(() => expect(mockedSearch).toHaveBeenCalledWith('输入法', 20))
		expect(input).toHaveValue('输入法')
	})

	it('中文组合输入期间 Escape 不清空草稿或关闭窗口', async () => {
		render(<LauncherPage />)
		await screen.findByTestId('launcher-recent-tasks-section')
		const input = screen.getByLabelText('Launcher 输入')

		fireEvent.compositionStart(input)
		fireEvent.change(input, { target: { value: '组合中' }, nativeEvent: { isComposing: true } })
		fireEvent.keyDown(input, { key: 'Escape', isComposing: true, keyCode: 229 })

		expect(input).toHaveValue('组合中')
		expect(mockedCloseSession).not.toHaveBeenCalled()
		fireEvent.compositionEnd(input, { target: { value: '组合完成' } })
		await waitFor(() => expect(input).toHaveValue('组合完成'))
	})

	it('空搜索结果不回退最近内容，并保留创建入口', async () => {
		mockedSearch.mockResolvedValueOnce({ tasks: [], projects: [] })
		render(<LauncherPage />)
		await screen.findByTestId('launcher-recent-tasks-section')

		fireEvent.change(screen.getByLabelText('Launcher 输入'), { target: { value: 'xxx' } })

		expect(await screen.findByText('没有匹配结果')).toBeInTheDocument()
		expect(screen.getByText(/创建「xxx」/).parentElement).toHaveTextContent('Enter 创建「xxx」')
		expect(screen.queryByTestId('launcher-recent-tasks-section')).not.toBeInTheDocument()
	})

	it('Enter 默认创建，移动到结果后 Enter 打开结果', async () => {
		render(<LauncherPage />)
		await screen.findByTestId('launcher-recent-tasks-section')
		const input = screen.getByLabelText('Launcher 输入')

		fireEvent.change(input, { target: { value: 'Stone' } })
		await waitFor(() => expect(mockedSearch).toHaveBeenCalledWith('Stone', 20))
		fireEvent.keyDown(input, { key: 'Enter' })
		await waitFor(() =>
			expect(mockedCreate).toHaveBeenCalledWith(expect.objectContaining({ title: 'Stone' })),
		)

		mockedCreate.mockClear()
		fireEvent.change(input, { target: { value: 'Again' } })
		await waitFor(() => expect(mockedSearch).toHaveBeenCalledWith('Again', 20))
		const taskResult = await screen.findByRole('button', { name: '打开任务 Stone 搜索任务' })
		const projectResult = screen.getByRole('button', { name: '打开项目 Stone 搜索项目' })
		fireEvent.keyDown(input, { key: 'ArrowDown' })
		await waitFor(() => expect(taskResult).toHaveFocus())
		fireEvent.keyDown(taskResult, { key: 'ArrowDown' })
		await waitFor(() => expect(projectResult).toHaveFocus())
		fireEvent.keyDown(projectResult, { key: 'ArrowUp' })
		await waitFor(() => expect(taskResult).toHaveFocus())
		fireEvent.keyDown(taskResult, { key: 'Enter' })

		await waitFor(() =>
			expect(mockedOpenTarget).toHaveBeenCalledWith({ kind: 'task', id: 'task-search' }),
		)
		expect(mockedOpenTarget).toHaveBeenCalledTimes(1)
		expect(mockedCreate).not.toHaveBeenCalled()
	})

	it('无结果 current 时 ArrowUp 从末项建立真实焦点', async () => {
		render(<LauncherPage />)
		await screen.findByTestId('launcher-recent-projects-section')
		const input = screen.getByLabelText('Launcher 输入')
		const lastResult = screen.getByRole('button', { name: '打开项目 最近项目 A' })

		fireEvent.keyDown(input, { key: 'ArrowUp' })

		await waitFor(() => expect(lastResult).toHaveFocus())
	})

	it('CreateRow 获得真实焦点后清除旧结果 current，并继续使用 Launcher keymap', async () => {
		render(<LauncherPage />)
		await screen.findByTestId('launcher-recent-tasks-section')
		const input = screen.getByLabelText('Launcher 输入')

		fireEvent.change(input, { target: { value: '从创建行提交' } })
		await waitFor(() => expect(mockedSearch).toHaveBeenCalledWith('从创建行提交', 20))
		const taskResult = await screen.findByRole('button', { name: '打开任务 Stone 搜索任务' })
		const createRow = screen.getByRole('button', { name: '创建任务 从创建行提交' })
		fireEvent.keyDown(input, { key: 'ArrowDown' })
		await waitFor(() => expect(taskResult).toHaveFocus())
		fireEvent.pointerEnter(createRow, { pointerType: 'mouse' })
		await waitFor(() => expect(createRow).toHaveClass('bg-accent-soft'))
		expect(taskResult).toHaveFocus()
		fireEvent.keyDown(taskResult, { key: 'ArrowUp' })
		await waitFor(() => expect(input).toHaveFocus())

		await act(async () => {
			createRow.focus()
		})
		expect(createRow).toHaveFocus()
		await waitFor(() => expect(createRow).toHaveClass('bg-accent-soft'))
		fireEvent.keyDown(createRow, { key: 'Enter' })

		await waitFor(() =>
			expect(mockedCreate).toHaveBeenCalledWith(expect.objectContaining({ title: '从创建行提交' })),
		)
		expect(mockedCreate).toHaveBeenCalledTimes(1)
		expect(mockedOpenTarget).not.toHaveBeenCalled()
	})

	it('Mod+Enter 使用 Registry binding 创建并打开', async () => {
		render(<LauncherPage />)
		await screen.findByTestId('launcher-recent-tasks-section')
		const input = screen.getByLabelText('Launcher 输入')
		fireEvent.change(input, { target: { value: '创建并打开任务' } })

		const platform = inferShortcutPlatform()
		const shortcutTokens = getLauncherShortcutTokens('createAndOpen', platform)
		expect(screen.getByLabelText(getShortcutAccessibilityLabel(shortcutTokens))).toBeInTheDocument()
		fireEvent.keyDown(input, {
			key: 'Enter',
			...(platform === 'mac' ? { metaKey: true } : { ctrlKey: true }),
		})

		await waitFor(() =>
			expect(mockedCreateAndOpen).toHaveBeenCalledWith(
				expect.objectContaining({ title: '创建并打开任务' }),
			),
		)
	})

	it('Escape 依次关闭弹层、清空输入并关闭窗口', async () => {
		mockedSearch.mockResolvedValueOnce({
			tasks: [createTaskResult({ id: 'task-recent', title: '搜索中的最近任务' })],
			projects: [],
		})
		render(<LauncherPage />)
		await screen.findByTestId('launcher-recent-tasks-section')
		const input = screen.getByLabelText('Launcher 输入')

		fireEvent.change(input, { target: { value: 'Stone' } })
		const searchResult = await screen.findByRole('button', { name: '打开任务 搜索中的最近任务' })
		fireEvent.keyDown(input, { key: 'ArrowDown' })
		await waitFor(() => expect(searchResult).toHaveFocus())
		fireEvent.pointerDown(screen.getByRole('button', { name: '优先级' }), {
			button: 0,
			ctrlKey: false,
		})
		expect(await screen.findByRole('menuitem', { name: '无优先级' })).toBeInTheDocument()

		fireEvent.keyDown(document, { key: 'Escape' })
		await waitFor(() =>
			expect(screen.queryByRole('menuitem', { name: '无优先级' })).not.toBeInTheDocument(),
		)
		expect(input).toHaveValue('Stone')
		await waitFor(() => expect(input).toHaveFocus())
		expect(mockedCloseSession).not.toHaveBeenCalled()

		fireEvent.keyDown(document, { key: 'Escape' })
		await waitFor(() => expect(input).toHaveValue(''))
		expect(mockedCloseSession).not.toHaveBeenCalled()
		fireEvent.keyDown(input, { key: 'Enter' })
		expect(mockedOpenTarget).not.toHaveBeenCalled()

		fireEvent.keyDown(document, { key: 'Escape' })
		await waitFor(() =>
			expect(mockedCloseSession).toHaveBeenCalledWith({
				reason: 'escape',
				sessionId: DEFAULT_SESSION_ID,
			}),
		)
	})

	it('连续创建成功后静默刷新最近任务', async () => {
		mockedGetRecentData.mockResolvedValueOnce(createRecentData()).mockResolvedValueOnce({
			recentTasks: [createTaskResult({ id: 'task-new', title: '新建后最近任务' })],
			recentProjects: [createProjectResult({ id: 'project-recent', name: '最近项目 A' })],
		})
		render(<LauncherPage />)
		await screen.findByText('最近任务 A')
		const input = screen.getByLabelText('Launcher 输入')

		fireEvent.change(input, { target: { value: '刚创建的任务' } })
		fireEvent.keyDown(input, { key: 'Enter', shiftKey: true })

		await waitFor(() => expect(mockedGetRecentData).toHaveBeenCalledTimes(2))
		expect(await screen.findByText('新建后最近任务')).toBeInTheDocument()
	})

	it('新会话不会覆盖当前已编辑草稿', async () => {
		let preparedHandler: PreparedSessionHandler = unregisteredPreparedHandler
		listenMock.mockImplementation(async (event, handler) => {
			if (event === 'launcher:session-prepared') {
				preparedHandler = handler as PreparedSessionHandler
				queueMicrotask(() => preparedHandler({ payload: createOpenSessionResponse() }))
			}
			return () => undefined
		})
		render(<LauncherPage />)
		await screen.findByTestId('launcher-recent-tasks-section')
		const input = screen.getByLabelText('Launcher 输入')
		fireEvent.change(input, { target: { value: '用户已编辑草稿' } })

		await act(async () => {
			preparedHandler({
				payload: createOpenSessionResponse({
					sessionId: 'session-2',
					currentScope: { type: 'space', spaceId: 'space-2' },
					defaultSpaceId: 'space-2',
				}),
			})
		})

		await waitFor(() => expect(input).toHaveValue('用户已编辑草稿'))
		expect(screen.getByLabelText('空间选择')).toHaveTextContent('产品研发')
	})

	it('已关闭 session 的迟到 presented 事件不会重新显示面板', async () => {
		let preparedHandler: PreparedSessionHandler = unregisteredPreparedHandler
		let presentedHandler: PresentedSessionHandler = unregisteredPresentedHandler
		listenMock.mockImplementation(async (event, handler) => {
			if (event === 'launcher:session-prepared') {
				preparedHandler = handler as PreparedSessionHandler
				queueMicrotask(() => preparedHandler({ payload: createOpenSessionResponse() }))
			}
			if (event === 'launcher:session-presented') {
				presentedHandler = handler as PresentedSessionHandler
				queueMicrotask(() => presentedHandler({ payload: { sessionId: DEFAULT_SESSION_ID } }))
			}
			return () => undefined
		})
		render(<LauncherPage />)
		await screen.findByTestId('launcher-recent-tasks-section')

		fireEvent.keyDown(document, { key: 'Escape' })
		await waitFor(() =>
			expect(mockedCloseSession).toHaveBeenCalledWith({
				reason: 'escape',
				sessionId: DEFAULT_SESSION_ID,
			}),
		)
		await waitFor(() =>
			expect(screen.getByLabelText('StoneFlow Launcher')).toHaveClass('opacity-0'),
		)

		await act(async () => {
			presentedHandler({ payload: { sessionId: DEFAULT_SESSION_ID } })
		})
		await waitFor(() =>
			expect(screen.getByLabelText('StoneFlow Launcher')).toHaveClass('opacity-0'),
		)
	})
})

function createOpenContext(): LauncherOpenContext {
	return {
		currentScope: { type: 'space', spaceId: 'space-1' },
		defaultSpaceId: 'space-1',
		defaultPlacement: { kind: 'standalone', projectId: null },
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
	const openContext = { ...createOpenContext(), ...overrides }
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
		Pick<LauncherProjectOption, 'kind' | 'name'> & { id?: string | null; spaceId?: string },
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

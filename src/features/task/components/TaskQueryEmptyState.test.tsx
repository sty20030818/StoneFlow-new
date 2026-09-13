import { Suspense, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider, type InfiniteData } from '@tanstack/react-query'
import {
	createMemoryHistory,
	createRootRoute,
	createRoute,
	createRouter,
	Outlet,
	RouterProvider,
	useMatch,
} from '@tanstack/react-router'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'

import { parseShellRoute, ShellRouteProvider } from '@/app/navigation'
import { BulkActionProvider } from '@/features/bulk-action'
import { DangerConfirmProvider } from '@/features/danger-confirm'
import {
	createTaskDisplayViewPageKey,
	updateTaskDisplayPreference,
} from '@/features/display-options'
import { encodeFilterQueryToSearchParam } from '@/features/filter'
import { ProjectPage } from '@/features/project'
import { CommandSelectionProvider } from '@/features/selection'
import { useShellPreferenceStore } from '@/features/shell-dialogs'
import { SavedViewPage } from '@/features/view'
import type {
	FilterQuery,
	RunTaskQueryInput,
	RunTaskQueryResult,
	TaskQueryGroupSummary,
	TaskQueryItem,
	View,
} from '@/shared/types'
import { TestInteractionProviders } from '@/test/TestInteractionProviders'

import { TaskPreviewProvider, useTaskPreviewContext } from '../detail/model/TaskPreviewProvider'
import { TaskPreview } from '../detail/components/TaskPreview'
import { useTaskPreviewController } from '../detail/model/useTaskPreviewController'
import { TaskListSceneView } from './TaskListSceneView'

const { invokeMock } = vi.hoisted(() => ({ invokeMock: vi.fn() }))
vi.mock('@tauri-apps/api/core', () => ({ invoke: invokeMock, isTauri: () => false }))
vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn(async () => vi.fn()) }))

const TIME = '2026-09-13T00:00:00Z'
const FILTER: FilterQuery = {
	clauses: [{ id: 'status', field: 'status', op: 'is', values: ['waiting'] }],
}
const PROJECT_PATH = '/space-1/projects/project-1'
const SAVED_PATH = '/space-1/views/saved'
const SOURCES = [
	{ name: '所有任务', path: '/all/tasks', draft: true },
	{ name: '独立事项', path: '/space-1/standalone', draft: true },
	{ name: '项目', path: PROJECT_PATH, draft: true },
	{ name: '干净 Saved View', path: SAVED_PATH, draft: false },
]

beforeEach(() => {
	invokeMock.mockReset()
	localStorage.clear()
	// jsdom 仅补真实虚拟列表所需 viewport 几何，不替换页面、scene 或 TaskBoard。
	vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(
		function (this: HTMLElement) {
			return this.dataset.scrollContainer === 'true' ? 960 : 0
		},
	)
	vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(
		function (this: HTMLElement) {
			return this.dataset.scrollContainer === 'true' ? 1200 : 0
		},
	)
	vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(
		function (this: HTMLElement) {
			return this.dataset.scrollContainer === 'true' ? 960 : 0
		},
	)
	useShellPreferenceStore.setState({
		taskBoardCollapsedGroups: {},
	})
})

it.each(SOURCES)('$name 无匹配时可键盘打开真实筛选菜单，检查与关闭不改变查询', async (source) => {
	const backend = installBackend()
	const entry = source.draft
		? `${source.path}?f=${encodeURIComponent(encodeFilterQueryToSearchParam(FILTER)!)}`
		: source.path
	const { router } = await renderWorkspace(entry)
	expect(await screen.findByText('当前视图无匹配任务')).toBeVisible()
	expect(screen.queryByText('当前项目没有任务')).not.toBeInTheDocument()
	const search = router.state.location.searchStr
	const reads = backend.requests.length
	const adjust = screen.getByRole('button', { name: '调整筛选' })
	act(() => adjust.focus())
	pressEnter(adjust)
	expect(await screen.findByRole('menu', { name: '筛选' })).toBeVisible()
	expect(router.state.location.searchStr).toBe(search)
	fireEvent.keyDown(screen.getByRole('menu', { name: '筛选' }), { key: 'Escape' })
	await waitFor(() => expect(screen.queryByRole('menu', { name: '筛选' })).not.toBeInTheDocument())
	expect(router.state.location.searchStr).toBe(search)
	expect(backend.requests).toHaveLength(reads)
	expect(screen.getByText('当前视图无匹配任务')).toBeVisible()
})

it('项目未完成为零不能宣称项目为空，切换全部显示已有完成任务', async () => {
	const backend = installBackend()
	backend.items = [task('completed', '项目已有完成任务', 'done')]
	const { router } = await renderWorkspace(PROJECT_PATH)
	expect(await screen.findByText('当前视图无匹配任务')).toBeVisible()
	expect(screen.queryByText('当前项目没有任务')).not.toBeInTheDocument()
	fireEvent.click(screen.getByRole('radio', { name: '全部' }))
	expect(await screen.findByText('项目已有完成任务')).toBeVisible()
	expect(router.state.location.search).toEqual({ v: 'all' })
	expect(backend.requests.map(({ query }) => query.baseViewKey)).toEqual(['active', 'all'])
})

it.each([
	{ path: `${PROJECT_PATH}?v=all`, title: '当前项目没有任务' },
	{ path: '/all/tasks?v=all', title: '当前没有任务' },
	{ path: '/space-1/standalone?v=all', title: '当前没有独立事项' },
])('完整无筛选查询确认为零才展示 $title 的创建引导', async ({ path, title }) => {
	const backend = installBackend()
	backend.items = []
	await renderWorkspace(path)
	expect(await screen.findByText(title)).toBeVisible()
	expect(screen.getAllByRole('button', { name: '创建任务' }).length).toBeGreaterThan(0)
	expect(screen.queryByRole('button', { name: '调整筛选' })).not.toBeInTheDocument()
	expect(backend.requests).toHaveLength(1)
	expect(backend.requests[0]?.query).toMatchObject({ baseViewKey: 'all', filters: { clauses: [] } })
})

it.each([PROJECT_PATH, SAVED_PATH])(
	'%s 首屏未返回和失败不显示空态，实际重试成功后才显示结果',
	async (path) => {
		const backend = installBackend()
		const first = deferred<RunTaskQueryResult>()
		const retry = deferred<RunTaskQueryResult>()
		backend.read = async () => (backend.requests.length === 1 ? first.promise : retry.promise)
		await renderWorkspace(path)
		expect(await screen.findByRole('region', { name: '正在读取任务' })).toHaveAttribute(
			'aria-busy',
			'true',
		)
		expect(screen.queryByText('当前项目没有任务')).not.toBeInTheDocument()
		expect(screen.queryByText('当前视图无匹配任务')).not.toBeInTheDocument()
		await waitFor(() => expect(backend.requests).toHaveLength(1))
		await act(async () => first.reject(new Error('首屏读取中断')))
		expect(await screen.findByRole('alert')).toHaveTextContent('读取任务失败')
		expect(screen.queryByRole('button', { name: '调整筛选' })).not.toBeInTheDocument()
		pressEnter(screen.getByRole('button', { name: '重试' }))
		await waitFor(() => expect(backend.requests).toHaveLength(2))
		expect(screen.queryByText('当前项目没有任务')).not.toBeInTheDocument()
		expect(screen.queryByText('当前视图无匹配任务')).not.toBeInTheDocument()
		await act(async () => retry.resolve(page([task('recovered', '重试读取到的任务')], null, 1)))
		expect(await screen.findByText('重试读取到的任务')).toBeVisible()
		expect(screen.queryByRole('alert')).not.toBeInTheDocument()
		expect(backend.requests.map(({ cursor }) => cursor)).toEqual([null, null])
	},
)

it.each([PROJECT_PATH, SAVED_PATH])(
	'%s 续页失败保留已加载任务，原位重试同一 cursor 后接入新页',
	async (path) => {
		const backend = installBackend()
		backend.read = async (_query, cursor) => {
			if (cursor === null)
				return page([task('first', '首屏已有任务')], 'next', 2, [
					task('first', '首屏已有任务'),
					task('second', '续页恢复的任务'),
				])
			if (backend.requests.length === 2) throw new Error('续页读取中断')
			return page([task('second', '续页恢复的任务')], null, null)
		}
		await renderWorkspace(path)
		expect(await screen.findByText('首屏已有任务')).toBeVisible()
		expect(await screen.findByText('续页读取中断')).toBeVisible()
		expect(screen.getByRole('status')).toHaveTextContent('加载更多任务失败')
		expect(screen.queryByRole('alert')).not.toBeInTheDocument()
		expect(screen.queryByText('当前视图无匹配任务')).not.toBeInTheDocument()
		expect(backend.requests).toHaveLength(2)
		pressEnter(screen.getByRole('button', { name: '重试' }))
		expect(await screen.findByText('续页恢复的任务')).toBeVisible()
		expect(screen.getByText('首屏已有任务')).toBeVisible()
		expect(screen.queryByText('续页读取中断')).not.toBeInTheDocument()
		expect(backend.requests.map(({ cursor }) => cursor)).toEqual([null, 'next', 'next'])
	},
)

it.each([`${PROJECT_PATH}?v=all`, SAVED_PATH])(
	'%s 首屏缺少精确计数属于读取失败，不能推断为零任务',
	async (path) => {
		const backend = installBackend()
		backend.read = async () => page([], null, null)
		await renderWorkspace(path)
		expect(await screen.findByRole('alert')).toHaveTextContent('读取任务失败')
		expect(screen.queryByText('当前项目没有任务')).not.toBeInTheDocument()
		expect(screen.queryByText('当前视图无匹配任务')).not.toBeInTheDocument()
		expect(backend.requests).toHaveLength(1)
	},
)

it.each([PROJECT_PATH, SAVED_PATH])(
	'%s 排序面板改变全部匹配任务的首屏，重新进入恢复本机偏好',
	async (path) => {
		const backend = installBackend()
		backend.items = Array.from({ length: 152 }, (_, index) => ({
			...task(`task-${index}`, index === 151 ? '第 152 条最高优先级任务' : `普通任务 ${index}`),
			priority: index === 151 ? (4 as const) : (0 as const),
		}))
		backend.read = async (query, cursor) => {
			if (cursor) throw new Error('本测试仅验证排序首屏')
			const items =
				query.order.orderBy === 'priority'
					? backend.items.toSorted((a, b) =>
							query.order.orderDirection === 'desc'
								? b.priority - a.priority
								: a.priority - b.priority,
						)
					: backend.items
			return page(items.slice(0, 150), 'next', items.length, items)
		}
		const first = await renderWorkspace(path)
		expect(await screen.findByText('普通任务 0')).toBeVisible()
		expect(screen.queryByText('第 152 条最高优先级任务')).not.toBeInTheDocument()
		fireEvent.click(screen.getByRole('button', { name: '显示选项' }))
		const panel = await screen.findByRole('dialog', { name: '显示选项' })
		fireEvent.click(within(panel).getByRole('button', { name: /排序$/ }))
		fireEvent.click(await screen.findByRole('option', { name: '优先级' }))
		// project manual 的固定方向被归一为 asc；Saved smart 的本机 desc 在选数值排序时继续有效。
		const toDesc = screen.queryByRole('button', { name: '切换为降序' })
		if (toDesc) fireEvent.click(toDesc)
		await waitFor(() =>
			expect(backend.requests.at(-1)?.query.order).toEqual({
				groupBy: 'status',
				subGroupBy: 'none',
				orderBy: 'priority',
				orderDirection: 'desc',
				completedOrder: 'recency',
			}),
		)
		fireEvent.keyDown(panel, { key: 'Escape' })
		expect(await screen.findByText('第 152 条最高优先级任务')).toBeVisible()
		const lastRead = backend.requests.length
		first.unmount()
		await renderWorkspace(path)
		expect(await screen.findByText('第 152 条最高优先级任务')).toBeVisible()
		expect(backend.requests.slice(lastRead)).toHaveLength(1)
		expect(backend.requests.at(-1)?.query.order).toMatchObject({
			orderBy: 'priority',
			orderDirection: 'desc',
		})
		expect(backend.requests.every(({ cursor }) => cursor === null)).toBe(true)
	},
)

it.each([PROJECT_PATH, SAVED_PATH])(
	'%s 旧 cursor 失败可以从首屏恢复，不重试旧游标',
	async (path) => {
		const backend = installBackend()
		backend.read = async (_query, cursor) => {
			if (cursor) throw new Error('分页游标版本不受支持，请从首屏重新加载')
			return backend.requests.length === 1
				? page([task('old-first', '旧窗口首屏')], 'legacy-cursor', 2, [
						task('old-first', '旧窗口首屏'),
						task('old-next', '旧窗口未加载任务'),
					])
				: page([task('new-first', '重新读取的新首屏')], null, 1)
		}
		await renderWorkspace(path)
		expect(await screen.findByText('旧窗口首屏')).toBeVisible()
		expect(await screen.findByText('分页游标版本不受支持，请从首屏重新加载')).toBeVisible()
		pressEnter(screen.getByRole('button', { name: '从头加载' }))
		expect(await screen.findByText('重新读取的新首屏')).toBeVisible()
		expect(screen.queryByText('旧窗口首屏')).not.toBeInTheDocument()
		expect(backend.requests.map(({ cursor }) => cursor)).toEqual([null, 'legacy-cursor', null])
	},
)

it.each([
	{ groupBy: 'status' as const, label: '进行中' },
	{ groupBy: 'priority' as const, label: '紧急' },
])(
	'$groupBy 分组跨页合并、折叠后选择与续页重试共用真实页面，偏好按来源和分组隔离',
	async ({ groupBy, label }) => {
		const backend = installBackend()
		const next = deferred<RunTaskQueryResult>()
		const first = { ...task('group-a', '同组首屏任务', 'doing'), priority: 4 as const }
		const second = { ...task('group-b', '同组续页任务', 'doing'), priority: 4 as const }
		const other = task('other-group', '另一组任务', 'todo')
		backend.items = [first, second, other]
		let restarted = false
		let failed = false
		backend.read = async (query, cursor) => {
			const items = [first, second, other].map((item): TaskQueryItem => ({
				...item,
				group:
					query.order.groupBy === 'priority'
						? { kind: 'priority', priority: item.priority }
						: { kind: 'status', status: item.status },
			}))
			if (restarted || query.order.groupBy !== groupBy) return page(items, null, 3)
			if (!cursor) return page(items.slice(0, 1), 'same-group-next', 3, items)
			if (!failed) return next.promise
			return page(items.slice(1), null, null)
		}
		const workspace = await renderWorkspace(PROJECT_PATH, <WorkspacePreview />)
		await screen.findByText('同组首屏任务')
		if (groupBy === 'priority') await chooseGrouping('状态', '优先级')
		await waitFor(() => expect(backend.requests.at(-1)?.cursor).toBe('same-group-next'))
		const trigger = screen.getByRole('button', { name: `折叠 ${label}` })
		fireEvent.click(trigger)
		expect(screen.queryByRole('row', { name: '打开任务 同组首屏任务' })).not.toBeInTheDocument()
		fireEvent.contextMenu(trigger.closest('[data-board-section-header]')!)
		fireEvent.click(await screen.findByRole('menuitem', { name: '选中已加载任务' }))
		await waitFor(() => expect(trigger).toHaveFocus())
		failed = true
		await act(async () => next.reject(new Error('分组续页读取中断')))
		expect(await screen.findByText('分组续页读取中断')).toBeVisible()
		pressEnter(screen.getByRole('button', { name: '重试' }))
		expect(await screen.findByRole('row', { name: '打开任务 另一组任务' })).toHaveAttribute(
			'aria-selected',
			'false',
		)
		expect(screen.queryByRole('row', { name: '打开任务 同组续页任务' })).not.toBeInTheDocument()
		expect(screen.getAllByRole('button', { name: `展开 ${label}` })).toHaveLength(1)
		fireEvent.click(screen.getByRole('button', { name: `展开 ${label}` }))
		expect(screen.getByRole('row', { name: '打开任务 同组首屏任务' })).toHaveAttribute(
			'aria-selected',
			'true',
		)
		expect(screen.getByRole('row', { name: '打开任务 同组续页任务' })).toHaveAttribute(
			'aria-selected',
			'false',
		)
		fireEvent.contextMenu(
			screen.getByRole('button', { name: `折叠 ${label}` }).closest('[data-board-section-header]')!,
		)
		fireEvent.click(await screen.findByRole('menuitem', { name: '选中全部' }))
		expect(screen.getByRole('row', { name: '打开任务 同组续页任务' })).toHaveAttribute(
			'aria-selected',
			'true',
		)
		const grid = screen.getByRole('grid')
		act(() => grid.focus())
		fireEvent.keyDown(grid, { key: 'Home' })
		const focusedRow = screen.getByRole('row', { name: '打开任务 同组首屏任务' })
		await waitFor(() => expect(focusedRow).toHaveFocus())
		fireEvent.click(screen.getByRole('button', { name: '键盘预览当前任务' }))
		expect(await screen.findByLabelText('任务预览')).toHaveTextContent('同组首屏任务')
		expect(focusedRow).toHaveAttribute('data-focus-suppressed', 'true')
		fireEvent.click(screen.getByRole('button', { name: '关闭预览' }))
		expect(screen.queryByLabelText('任务预览')).not.toBeInTheDocument()
		expect(focusedRow).not.toHaveAttribute('data-focus-suppressed')
		expect(focusedRow).toHaveFocus()
		expect(focusedRow).toHaveAttribute('aria-selected', 'true')
		fireEvent.click(screen.getByRole('button', { name: `折叠 ${label}` }))
		expect(
			backend.requests
				.filter(({ query }) => query.order.groupBy === groupBy)
				.map(({ cursor }) => cursor),
		).toEqual([null, 'same-group-next', 'same-group-next'])

		restarted = true
		// 同项目的全部/未完成是两个工作台来源；切换分组也不复用旧组的折叠。
		fireEvent.click(screen.getByRole('radio', { name: '全部' }))
		expect(await screen.findByRole('row', { name: '打开任务 同组首屏任务' })).toBeVisible()
		fireEvent.click(screen.getByRole('radio', { name: '未完成' }))
		await screen.findByRole('button', { name: `展开 ${label}` })
		const currentGroupLabel = groupBy === 'status' ? '状态' : '优先级'
		const alternateGroupLabel = groupBy === 'status' ? '优先级' : '状态'
		await chooseGrouping(currentGroupLabel, alternateGroupLabel)
		expect(await screen.findByRole('row', { name: '打开任务 同组首屏任务' })).toBeVisible()
		await chooseGrouping(alternateGroupLabel, currentGroupLabel)
		await screen.findByRole('button', { name: `展开 ${label}` })
		workspace.unmount()
		await renderWorkspace(PROJECT_PATH)
		expect(await screen.findByRole('button', { name: `展开 ${label}` })).toHaveAttribute(
			'aria-expanded',
			'false',
		)
		expect(screen.queryByRole('row', { name: '打开任务 同组首屏任务' })).not.toBeInTheDocument()
	},
)

it('两级组在真实页面保持父子折叠、已加载选择、叶组键盘边界与跨页恢复', async () => {
	const backend = installBackend()
	backend.items = [
		{ ...task('urgent-doing-a', '紧急进行中 A', 'doing'), priority: 4 },
		{ ...task('urgent-doing-b', '紧急进行中 B', 'doing'), priority: 4 },
		{ ...task('urgent-todo', '紧急待执行', 'todo'), priority: 4 },
		{ ...task('urgent-done', '紧急已完成', 'done'), priority: 4 },
		{ ...task('low-doing', '低优先级进行中', 'doing'), priority: 1 },
		{ ...task('low-todo', '低优先级待执行', 'todo'), priority: 1 },
	]
	const next = deferred<RunTaskQueryResult>()
	let failed = false
	let exhausted = false
	backend.read = async (query, cursor) => {
		const items = backend.items.map((item): TaskQueryItem => ({
			...item,
			group:
				query.order.groupBy === 'priority'
					? { kind: 'priority', priority: item.priority }
					: { kind: 'status', status: item.status },
			subGroup:
				query.order.subGroupBy === 'status'
					? { kind: 'status', status: item.status }
					: { kind: 'none' },
		}))
		if (exhausted || query.order.subGroupBy !== 'status') return page(items, null, 6)
		if (!cursor) return page(items.slice(0, 1), 'child-next', 6, items)
		if (!failed) return next.promise
		return page(items.slice(1), null, null)
	}
	const workspace = await renderWorkspace(`${PROJECT_PATH}?v=all`, <WorkspacePreview />)
	await screen.findByText('紧急进行中 A')
	await chooseGrouping('状态', '优先级')
	await chooseGrouping('不分组', '状态', '子分组')
	await waitFor(() => expect(backend.requests.at(-1)?.cursor).toBe('child-next'))
	const child = await screen.findByRole('button', { name: '折叠 紧急 › 进行中' })
	fireEvent.click(child)
	fireEvent.contextMenu(child.closest('[data-board-section-header]')!)
	fireEvent.click(await screen.findByRole('menuitem', { name: '选中已加载任务' }))
	failed = true
	await act(async () => next.reject(new Error('子组续页失败')))
	expect(await screen.findByText('子组续页失败')).toBeVisible()
	pressEnter(screen.getByRole('button', { name: '重试' }))
	expect(await screen.findByRole('row', { name: '打开任务 低优先级进行中' })).toHaveAttribute(
		'aria-selected',
		'false',
	)
	expect(screen.getAllByRole('button', { name: '展开 紧急 › 进行中' })).toHaveLength(1)
	expect(screen.queryByRole('row', { name: '打开任务 紧急进行中 B' })).not.toBeInTheDocument()
	fireEvent.click(screen.getByRole('button', { name: '展开 紧急 › 进行中' }))
	expect(screen.getByRole('row', { name: '打开任务 紧急进行中 A' })).toHaveAttribute(
		'aria-selected',
		'true',
	)
	expect(screen.getByRole('row', { name: '打开任务 紧急进行中 B' })).toHaveAttribute(
		'aria-selected',
		'false',
	)
	fireEvent.contextMenu(
		screen.getByRole('button', { name: '折叠 紧急' }).closest('[data-board-section-header]')!,
	)
	fireEvent.click(await screen.findByRole('menuitem', { name: '选中全部' }))
	for (const title of ['紧急进行中 A', '紧急进行中 B', '紧急待执行', '紧急已完成']) {
		expect(screen.getByRole('row', { name: `打开任务 ${title}` })).toHaveAttribute(
			'aria-selected',
			'true',
		)
	}
	expect(screen.getByRole('row', { name: '打开任务 低优先级进行中' })).toHaveAttribute(
		'aria-selected',
		'false',
	)
	const grid = screen.getByRole('grid')
	act(() => grid.focus())
	fireEvent.keyDown(grid, { key: 'Home' })
	fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' })
	const anchor = screen.getByRole('row', { name: '打开任务 紧急进行中 B' })
	await waitFor(() => expect(anchor).toHaveFocus())
	fireEvent.keyDown(anchor, { key: 'ArrowDown', shiftKey: true })
	expect(anchor).toHaveFocus()
	fireEvent.click(screen.getByRole('button', { name: '键盘预览当前任务' }))
	expect(await screen.findByLabelText('任务预览')).toHaveTextContent('紧急进行中 B')
	fireEvent.click(screen.getByRole('button', { name: '关闭预览' }))
	expect(anchor).toHaveFocus()
	expect(anchor).not.toHaveAttribute('data-focus-suppressed')
	fireEvent.click(screen.getByRole('button', { name: '折叠 紧急 › 进行中' }))
	fireEvent.click(screen.getByRole('button', { name: '折叠 紧急' }))
	expect(screen.queryByRole('button', { name: '展开 紧急 › 进行中' })).not.toBeInTheDocument()
	expect(screen.getByRole('row', { name: '打开任务 低优先级进行中' })).toBeVisible()
	fireEvent.click(screen.getByRole('button', { name: '展开 紧急' }))
	expect(screen.getByRole('button', { name: '展开 紧急 › 进行中' })).toHaveAttribute(
		'aria-expanded',
		'false',
	)
	expect(screen.getByRole('row', { name: '打开任务 紧急待执行' })).toBeVisible()
	expect(
		backend.requests
			.filter(({ query }) => query.order.subGroupBy === 'status')
			.map(({ cursor }) => cursor),
	).toEqual([null, 'child-next', 'child-next'])

	exhausted = true
	await chooseGrouping('状态', '不分组', '子分组')
	expect(await screen.findByRole('row', { name: '打开任务 紧急进行中 A' })).toBeVisible()
	await chooseGrouping('不分组', '状态', '子分组')
	await screen.findByRole('button', { name: '展开 紧急 › 进行中' })
	workspace.unmount()
	// 清掉内存后从真实本机存储重建折叠偏好，不能仅由 Provider 重挂载证明持久化。
	const storageKey = useShellPreferenceStore.persist.getOptions().name
	if (!storageKey) throw new Error('折叠偏好缺少持久化存储键')
	const persisted = localStorage.getItem(storageKey)
	expect(persisted).not.toBeNull()
	act(() => useShellPreferenceStore.setState({ taskBoardCollapsedGroups: {} }))
	localStorage.setItem(storageKey, persisted!)
	await act(async () => useShellPreferenceStore.persist.rehydrate())
	await renderWorkspace(`${PROJECT_PATH}?v=all`)
	const restored = await screen.findByRole('button', { name: '展开 紧急 › 进行中' })
	expect(screen.queryByRole('row', { name: '打开任务 紧急进行中 A' })).not.toBeInTheDocument()
	// 尚未聚焦任何任务，从子菜单折叠全部也必须把焦点恢复到仍可见的父组。
	fireEvent.click(restored)
	fireEvent.contextMenu(restored.closest('[data-board-section-header]')!)
	fireEvent.click(await screen.findByRole('menuitem', { name: '折叠全部' }))
	await waitFor(() => expect(screen.getByRole('button', { name: '展开 紧急' })).toHaveFocus())
	expect(screen.queryAllByRole('row')).toHaveLength(0)
	fireEvent.contextMenu(
		screen.getByRole('button', { name: '展开 紧急' }).closest('[data-board-section-header]')!,
	)
	fireEvent.click(await screen.findByRole('menuitem', { name: '展开全部' }))
	expect(screen.getByRole('row', { name: '打开任务 紧急进行中 A' })).toBeVisible()
	expect(screen.getByRole('row', { name: '打开任务 低优先级待执行' })).toBeVisible()
})

it.each([`${PROJECT_PATH}?v=all`, SAVED_PATH])(
	'%s 精确空组不冒充未加载组，三页合并保持数量、选择与唯一 sentinel',
	async (path) => {
		const backend = installBackend()
		backend.view.filters = { clauses: [] }
		const allItems = [
			...Array.from({ length: 151 }, (_, index) => ({
				...task(`urgent-${index}`, `紧急进行中 ${index}`, 'doing'),
				priority: 4 as const,
			})),
			...Array.from({ length: 36 }, (_, index) => ({
				...task(`todo-${index}`, `紧急待执行 ${index}`, 'todo'),
				priority: 4 as const,
			})),
			...Array.from({ length: 150 }, (_, index) => ({
				...task(`low-${index}`, `低优先级 ${index}`, 'doing'),
				priority: 1 as const,
			})),
		].map((item): TaskQueryItem => ({
			...item,
			group: { kind: 'priority', priority: item.priority },
			subGroup: { kind: 'status', status: item.status },
		}))
		backend.items = allItems
		const groupSummary: TaskQueryGroupSummary[] = (
			[
				[4, 187, 151, 36],
				[3, 0, 0, 0],
				[2, 0, 0, 0],
				[1, 150, 150, 0],
				[0, 0, 0, 0],
			] as const
		).map(([priority, totalCount, doing, todo]) => ({
			group: { kind: 'priority', priority },
			totalCount,
			subGroups: [
				{ group: { kind: 'status', status: 'doing' }, totalCount: doing },
				{ group: { kind: 'status', status: 'todo' }, totalCount: todo },
				{ group: { kind: 'status', status: 'waiting' }, totalCount: 0 },
				{ group: { kind: 'status', status: 'done' }, totalCount: 0 },
				{ group: { kind: 'status', status: 'canceled' }, totalCount: 0 },
			],
		}))
		const second = deferred<RunTaskQueryResult>()
		const third = deferred<RunTaskQueryResult>()
		backend.read = async (_query, cursor) => {
			if (cursor === null)
				return {
					items: allItems.slice(0, 150),
					nextCursor: 'page-2',
					totalCount: 337,
					groupSummary,
				}
			if (cursor === 'page-2') return second.promise
			if (cursor === 'page-3') return third.promise
			throw new Error('不应出现其他游标')
		}
		await updateTaskDisplayPreference({
			pageKey: path === SAVED_PATH ? createTaskDisplayViewPageKey('saved') : 'task:project-detail',
			personal: { groupBy: 'priority', subGroupBy: 'status', showEmptyGroups: false },
		})
		const { queryClient } = await renderWorkspace(path)
		await screen.findByRole('row', { name: '打开任务 紧急进行中 0' })
		const windows = queryClient.getQueryCache().findAll({
			type: 'active',
			predicate: ({ state }) =>
				Boolean(state.data && typeof state.data === 'object' && 'pages' in state.data),
		})
		expect(windows).toHaveLength(1)
		const key = windows[0]!.queryKey
		const loadedIds = () =>
			queryClient
				.getQueryData<InfiniteData<RunTaskQueryResult>>(key)!
				.pages.flatMap(({ items }) => items.map(({ id }) => id))
		expect(loadedIds()).toEqual(allItems.slice(0, 150).map(({ id }) => id))
		expect(
			screen.getByRole('button', { name: '折叠 紧急' }).closest('[data-board-section-header]'),
		).toHaveTextContent('187 · 已加载 150')
		fireEvent.click(screen.getByRole('button', { name: '折叠 紧急 › 进行中' }))
		await waitFor(() =>
			expect(backend.requests.map(({ cursor }) => cursor)).toEqual([null, 'page-2']),
		)
		const reads = backend.requests.length
		await toggleEmptyGroups()
		expect(await screen.findByRole('button', { name: '折叠 高' })).toBeVisible()
		expect(screen.getByRole('button', { name: '折叠 紧急 › 等待中' })).toBeVisible()
		// 同一个父组的待执行和另一个非空父组尚未到达，都不能以零标题提前出现。
		expect(screen.queryByRole('button', { name: '折叠 紧急 › 待执行' })).not.toBeInTheDocument()
		expect(screen.queryByRole('button', { name: '折叠 低' })).not.toBeInTheDocument()
		expect(document.querySelectorAll('[data-scroll-container="true"]')).toHaveLength(1)
		expect(screen.getAllByRole('status')).toHaveLength(1)
		expect(backend.requests).toHaveLength(reads)
		expect(loadedIds()).toEqual(allItems.slice(0, 150).map(({ id }) => id))
		fireEvent.contextMenu(
			screen.getByRole('button', { name: '折叠 紧急' }).closest('[data-board-section-header]')!,
		)
		fireEvent.click(await screen.findByRole('menuitem', { name: '选中已加载任务' }))
		await toggleEmptyGroups()
		await waitFor(() =>
			expect(screen.queryByRole('button', { name: '折叠 高' })).not.toBeInTheDocument(),
		)
		expect(backend.requests).toHaveLength(reads)
		await act(async () =>
			second.resolve({
				items: allItems.slice(150, 300),
				nextCursor: 'page-3',
				totalCount: null,
				groupSummary: null,
			}),
		)
		expect(await screen.findByRole('row', { name: '打开任务 紧急待执行 0' })).toHaveAttribute(
			'aria-selected',
			'false',
		)
		expect(screen.getAllByRole('button', { name: '展开 紧急 › 进行中' })).toHaveLength(1)
		expect(loadedIds()).toEqual(allItems.slice(0, 300).map(({ id }) => id))
		fireEvent.contextMenu(
			screen.getByRole('button', { name: '折叠 紧急' }).closest('[data-board-section-header]')!,
		)
		fireEvent.click(await screen.findByRole('menuitem', { name: '折叠全部' }))
		await waitFor(() =>
			expect(backend.requests.map(({ cursor }) => cursor)).toEqual([null, 'page-2', 'page-3']),
		)
		await act(async () =>
			third.resolve({
				items: allItems.slice(300),
				nextCursor: null,
				totalCount: null,
				groupSummary: null,
			}),
		)
		expect(loadedIds()).toEqual(allItems.map(({ id }) => id))
		expect(new Set(loadedIds()).size).toBe(337)
		expect(
			screen.getByRole('button', { name: '展开 紧急' }).closest('[data-board-section-header]'),
		).not.toHaveTextContent('已加载')
		expect(
			screen.getByRole('button', { name: '展开 低' }).closest('[data-board-section-header]'),
		).toHaveTextContent('150')
		expect(
			queryClient
				.getQueryData<InfiniteData<RunTaskQueryResult>>(key)!
				.pages.map(({ totalCount }) => totalCount),
		).toEqual([337, null, null])
		expect(screen.queryByText('加载更多任务')).not.toBeInTheDocument()
		await toggleEmptyGroups()
		expect(await screen.findByRole('button', { name: '折叠 高' })).toBeVisible()
		expect(loadedIds()).toEqual(allItems.map(({ id }) => id))
		expect(backend.requests).toHaveLength(3)
	},
)

it.each([
	{ path: `${PROJECT_PATH}?v=all`, empty: '当前项目没有任务' },
	{ path: '/all/tasks?v=all', empty: '当前没有任务' },
	{ path: '/space-1/standalone?v=all', empty: '当前没有独立事项' },
	{ path: SAVED_PATH, empty: '当前视图无匹配任务' },
])('$path 零任务结果可显示真实空组，关闭后恢复正确整页空态', async ({ path, empty }) => {
	const backend = installBackend()
	backend.items = []
	backend.view.filters = { clauses: [] }
	backend.read = async () => ({
		items: [],
		nextCursor: null,
		totalCount: 0,
		groupSummary: (['doing', 'todo', 'waiting', 'done', 'canceled'] as const).map((status) => ({
			group: { kind: 'status', status },
			totalCount: 0,
			subGroups: [],
		})),
	})
	const workspace = await renderWorkspace(path)
	expect(await screen.findByText(empty)).toBeVisible()
	await toggleEmptyGroups()
	const zero = await screen.findByRole('button', { name: '折叠 进行中' })
	expect(screen.queryByText(empty)).not.toBeInTheDocument()
	expect(screen.queryAllByRole('row')).toHaveLength(0)
	expect(zero.closest('[data-board-section-header]')).toHaveTextContent('0')
	fireEvent.contextMenu(zero.closest('[data-board-section-header]')!)
	expect(await screen.findByRole('menuitem', { name: '选中全部' })).toHaveAttribute(
		'aria-disabled',
		'true',
	)
	fireEvent.keyDown(screen.getByRole('menu', { name: '进行中 0' }), { key: 'Escape' })
	await waitFor(() => expect(zero).toHaveFocus())
	expect(backend.requests).toHaveLength(1)
	// 重新创建 Router/QueryClient，证明空组开关来自本机偏好而非旧组件内存。
	workspace.unmount()
	await renderWorkspace(path)
	expect(await screen.findByRole('button', { name: '折叠 进行中' })).toBeVisible()
	await toggleEmptyGroups()
	expect(await screen.findByText(empty)).toBeVisible()
	expect(screen.queryByRole('button', { name: '折叠 进行中' })).not.toBeInTheDocument()
	expect(backend.requests).toHaveLength(2)
})

async function toggleEmptyGroups() {
	fireEvent.click(screen.getByRole('button', { name: '显示选项' }))
	const panel = await screen.findByRole('dialog', { name: '显示选项' })
	fireEvent.click(within(panel).getByRole('switch', { name: '显示空分组' }))
	fireEvent.keyDown(panel, { key: 'Escape' })
	await waitFor(() =>
		expect(screen.queryByRole('dialog', { name: '显示选项' })).not.toBeInTheDocument(),
	)
}

async function chooseGrouping(current: string, next: string, dimension = '分组') {
	fireEvent.click(screen.getByRole('button', { name: '显示选项' }))
	const panel = await screen.findByRole('dialog', { name: '显示选项' })
	fireEvent.click(within(panel).getByRole('button', { name: `${current} ${dimension}` }))
	fireEvent.click(await screen.findByRole('option', { name: next }))
	fireEvent.keyDown(panel, { key: 'Escape' })
	await waitFor(() =>
		expect(screen.queryByRole('dialog', { name: '显示选项' })).not.toBeInTheDocument(),
	)
}

function pressEnter(element: HTMLElement) {
	fireEvent.keyDown(element, { key: 'Enter' })
	fireEvent.keyUp(element, { key: 'Enter' })
}

function task(
	id: string,
	title: string,
	status: TaskQueryItem['status'] = 'waiting',
): TaskQueryItem {
	return {
		group: { kind: 'status', status },
		subGroup: { kind: 'none' },
		id,
		title,
		status,
		spaceId: 'space-1',
		spaceName: '工作空间',
		spaceSlug: 'work',
		projectId: 'project-1',
		projectName: '项目一',
		priority: 0,
		statusChangedAt: TIME,
		dueAt: null,
		plannedAt: null,
		remindAt: null,
		completedAt: status === 'done' ? TIME : null,
		canceledAt: null,
		archivedAt: null,
		createdAt: TIME,
		updatedAt: TIME,
	}
}

function page(
	items: TaskQueryItem[],
	nextCursor: string | null,
	totalCount: number | null,
	allItems: TaskQueryItem[] = items,
): RunTaskQueryResult {
	return {
		items,
		nextCursor,
		totalCount,
		groupSummary: totalCount === null ? null : summarize(allItems),
	}
}

/** 旧页面场景提供完整夹具成员；空候选场景另用显式摘要，不调用生产分组逻辑。 */
function summarize(items: TaskQueryItem[]): TaskQueryGroupSummary[] {
	const groups = new Map<string, TaskQueryGroupSummary>()
	for (const item of items) {
		const key = JSON.stringify(item.group)
		let summary = groups.get(key)
		if (!summary) {
			summary = { group: item.group, totalCount: 0, subGroups: [] }
			groups.set(key, summary)
		}
		summary.totalCount += 1
		if (item.subGroup.kind === 'none') continue
		let sub = summary.subGroups.find(
			({ group }) => JSON.stringify(group) === JSON.stringify(item.subGroup),
		)
		if (!sub) {
			sub = { group: item.subGroup, totalCount: 0 }
			summary.subGroups.push(sub)
		}
		sub.totalCount += 1
	}
	return [...groups.values()]
}

function installBackend() {
	const view: View = {
		id: 'saved',
		name: '保存的待执行条件',
		scope: { type: 'space', spaceId: 'space-1' },
		context: { kind: 'project', projectId: 'project-1' },
		baseViewKey: 'active',
		filters: FILTER,
		position: 1,
		createdAt: TIME,
		updatedAt: TIME,
	}
	const backend = {
		view,
		items: [
			task('other', '已有其他状态任务', 'doing'),
			{ ...task('standalone', '已有独立事项', 'doing'), projectId: null, projectName: null },
		],
		requests: [] as Array<{ query: RunTaskQueryInput; cursor: string | null }>,
		read: async (query: RunTaskQueryInput, _cursor: string | null): Promise<RunTaskQueryResult> => {
			const items = backend.items.filter((item) => {
				if (query.scope.type === 'space' && item.spaceId !== query.scope.spaceId) return false
				if (query.context.kind === 'project' && item.projectId !== query.context.projectId)
					return false
				if (query.context.kind === 'standalone' && item.projectId !== null) return false
				if (query.baseViewKey === 'active' && item.status === 'done') return false
				return query.filters.clauses.every((clause) => {
					if (clause.field !== 'status' || clause.op !== 'is')
						throw new Error('本夹具仅支持 status is')
					return clause.values.includes(item.status)
				})
			})
			return page(items, null, items.length)
		},
	}
	invokeMock.mockImplementation(
		async (command: string, args?: { input?: Record<string, unknown> }) => {
			const input = args?.input ?? {}
			switch (command) {
				case 'list_sidebar_projects':
					return [{ id: 'project-1', name: '项目一', spaceId: 'space-1' }]
				case 'list_visible_spaces':
					return []
				case 'get_project_detail':
					return { id: 'project-1', name: '项目一', spaceId: 'space-1', completedAt: null }
				case 'list_views':
					return [view]
				case 'list_task_links':
					return []
				case 'get_task_detail':
					return { ...backend.items.find((item) => item.id === input.taskId), note: '预览备注' }
				case 'run_task_query':
				case 'run_task_view': {
					const query =
						command === 'run_task_view'
							? {
									...view,
									filters: (input.filters as FilterQuery) ?? view.filters,
									order: input.order as RunTaskQueryInput['order'],
									dateBasis: input.dateBasis as string,
								}
							: (input as RunTaskQueryInput)
					const cursor = input.cursor as string | null
					backend.requests.push({ query, cursor })
					const result = await backend.read(query, cursor)
					return command === 'run_task_view' ? { ...result, view } : result
				}
				default:
					throw new Error(`不应额外执行的 IPC：${command}`)
			}
		},
	)
	return backend
}

async function renderWorkspace(initialEntry: string, shellContent?: ReactNode) {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } },
	})
	const root = createRootRoute({ component: () => <Outlet /> })
	const route = (path: string, node: ReactNode) =>
		createRoute({
			getParentRoute: () => root,
			path,
			component: () => (
				<WorkspaceProviders>
					{node}
					{shellContent}
				</WorkspaceProviders>
			),
		})
	const router = createRouter({
		routeTree: root.addChildren([
			route('/$scopeKey/tasks', <TaskListSceneView variant='all' />),
			route('/$scopeKey/standalone', <TaskListSceneView variant='standalone' />),
			route('/$scopeKey/projects/$projectId', <ProjectPage />),
			route('/$scopeKey/views/$viewId', <SavedViewPage />),
		]),
		history: createMemoryHistory({ initialEntries: [initialEntry] }),
	})
	const rendered = render(
		<QueryClientProvider client={queryClient}>
			<RouterProvider router={router} />
		</QueryClientProvider>,
	)
	await act(async () => {
		await router.load()
	})
	return { router, queryClient, unmount: rendered.unmount }
}

/** 壳的预览入口接真实 controller 和 Card；页面、集合和详情查询均保留生产实现。 */
function WorkspacePreview() {
	const context = useTaskPreviewContext()
	const preview = useTaskPreviewController()
	return (
		<>
			<button
				type='button'
				onClick={() => {
					const taskId = context.source?.focusedTaskId
					if (taskId) preview.openPreview(taskId, 'keyboard')
				}}
			>
				键盘预览当前任务
			</button>
			<button type='button' onClick={preview.closePreview}>
				关闭预览
			</button>
			{preview.previewState.open ? (
				<TaskPreview
					task={preview.targetTask}
					linkSummary={preview.linkSummary}
					onPointerEnter={() => preview.setPreviewPointerInside(true)}
					onPointerLeave={() => preview.setPreviewPointerInside(false)}
				/>
			) : null}
		</>
	)
}

function WorkspaceProviders({ children }: { children: ReactNode }) {
	const pathname = useMatch({ strict: false, select: (match) => match.pathname })
	return (
		<TestInteractionProviders>
			<ShellRouteProvider shellRoute={parseShellRoute(pathname)}>
				<CommandSelectionProvider>
					<TaskPreviewProvider>
						<DangerConfirmProvider>
							<BulkActionProvider actions={[]}>
								<Suspense fallback={<div>正在加载项目</div>}>{children}</Suspense>
							</BulkActionProvider>
						</DangerConfirmProvider>
					</TaskPreviewProvider>
				</CommandSelectionProvider>
			</ShellRouteProvider>
		</TestInteractionProviders>
	)
}

function deferred<T>() {
	let resolve!: (value: T) => void
	let reject!: (error: Error) => void
	const promise = new Promise<T>((nextResolve, nextReject) => {
		resolve = nextResolve
		reject = nextReject
	})
	return { promise, resolve, reject }
}

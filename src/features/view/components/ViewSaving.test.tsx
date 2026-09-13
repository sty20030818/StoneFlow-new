import { Suspense, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
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
import { decodeFilterQueryFromSearchParam, encodeFilterQueryToSearchParam } from '@/features/filter'
import { ProjectPage } from '@/features/project'
import { CommandSelectionProvider } from '@/features/selection'
import { useShellPreferenceStore } from '@/features/shell-dialogs'
import { TaskListSceneView, TaskPreviewProvider } from '@/features/task'
import type {
	CreateViewInput,
	FilterQuery,
	RunTaskViewInput,
	TaskListItem,
	RunTaskQueryInput,
	UpdateViewInput,
	View,
} from '@/shared/types'
import { TestInteractionProviders } from '@/test/TestInteractionProviders'

import { SavedViewPage } from './SavedViewPage'

const { invokeMock } = vi.hoisted(() => ({ invokeMock: vi.fn() }))
vi.mock('@tauri-apps/api/core', () => ({ invoke: invokeMock, isTauri: () => false }))
vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn(async () => vi.fn()) }))

const TODO_FILTER: FilterQuery = {
	clauses: [{ id: 'status-filter', field: 'status', op: 'is', values: ['todo'] }],
}
const DOING_FILTER: FilterQuery = {
	clauses: [{ id: 'status-filter', field: 'status', op: 'is', values: ['doing'] }],
}
const TIME = '2026-09-13T00:00:00Z'
const SOURCES = [
	{
		name: '所有任务',
		path: '/all/tasks',
		defaultPath: '/all/tasks',
		scope: { type: 'all' },
		context: { kind: 'all' },
		baseViewKey: 'active',
	},
	{
		name: '独立事项',
		path: '/space-1/standalone',
		defaultPath: '/space-1/standalone',
		scope: { type: 'space', spaceId: 'space-1' },
		context: { kind: 'standalone' },
		baseViewKey: 'active',
	},
	{
		name: '项目',
		path: '/space-1/projects/project-1',
		defaultPath: '/space-1/projects/project-1',
		scope: { type: 'space', spaceId: 'space-1' },
		context: { kind: 'project', projectId: 'project-1' },
		baseViewKey: 'active',
	},
	{
		name: 'Saved View',
		path: '/all/views/source-view',
		defaultPath: '/all/standalone',
		scope: { type: 'all' },
		context: { kind: 'standalone' },
		baseViewKey: 'all',
	},
] satisfies Array<
	{ name: string; path: string; defaultPath: string } & Omit<
		RunTaskQueryInput,
		'filters' | 'order' | 'dateBasis'
	>
>

const TASKS: TaskListItem[] = ['project-1', null].flatMap((projectId) =>
	(['todo', 'doing', 'waiting', 'done'] as const).map((status) => ({
		id: `${projectId ?? 'standalone'}-${status}`,
		title: `${projectId ? '项目' : '独立'}任务 ${status}`,
		spaceId: 'space-1',
		spaceName: '工作空间',
		spaceSlug: 'work',
		projectId,
		projectName: projectId ? '项目一' : null,
		status,
		statusChangedAt: TIME,
		priority: 0,
		dueAt: null,
		plannedAt: null,
		remindAt: null,
		completedAt: status === 'done' ? TIME : null,
		canceledAt: null,
		archivedAt: null,
		createdAt: TIME,
		updatedAt: TIME,
	})),
)

beforeEach(() => {
	invokeMock.mockReset()
	localStorage.clear()
	// jsdom 没有布局；为真实虚拟列表提供固定测试 viewport，不替换 TaskBoard。
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
	useShellPreferenceStore.setState({
		taskBoardCollapsedGroups: {},
	})
})

it.each([
	{ op: 'is', label: '是', statuses: ['todo'], name: '菜单创建的待执行' },
	{ op: 'is_not', label: '不是', statuses: ['doing', 'waiting'], name: '菜单创建的排除待执行' },
])('项目未完成从干净菜单编辑 $label 待执行，保存后返回默认视图不残留筛选', async (testCase) => {
	const backend = installBackend()
	const context = { kind: 'project', projectId: 'project-1' } as const
	const scope = { type: 'space', spaceId: 'space-1' } as const
	const { router } = await renderWorkspace('/space-1/projects/project-1')
	await expectTasks(context, ['todo', 'doing', 'waiting'])
	expect(screen.getByRole('radio', { name: '未完成' })).toBeChecked()
	expect(router.state.location.search).toEqual({})
	expect(backend.queries.at(-1)).toMatchObject({
		scope,
		context,
		baseViewKey: 'active',
		filters: { clauses: [] },
	})
	expect(screen.queryByRole('button', { name: '保存' })).not.toBeInTheDocument()

	fireEvent.click(screen.getByRole('button', { name: '筛选' }))
	expect(await screen.findByText('无附加筛选条件')).toBeVisible()
	fireEvent.keyDown(screen.getByRole('menuitem', { name: '状态' }), { key: 'ArrowRight' })
	fireEvent.click(await screen.findByRole('menuitemcheckbox', { name: '待执行' }))
	await expectTasks(context, ['todo'])
	expect(backend.queries.at(-1)?.filters).toEqual({
		clauses: [{ id: expect.any(String), field: 'status', op: 'is', values: ['todo'] }],
	})

	if (testCase.op === 'is_not') {
		fireEvent.click(screen.getByRole('button', { name: '筛选' }))
		const conditions = await screen.findByRole('region', { name: '当前筛选条件' })
		fireEvent.click(within(conditions).getByRole('button', { name: '筛选运算符' }))
		fireEvent.click(await screen.findByRole('menuitemradio', { name: '不是' }))
		fireEvent.keyDown(screen.getByRole('searchbox', { name: '筛选字段' }), { key: 'Escape' })
	}
	await expectTasks(context, testCase.statuses)
	const expectedFilters = {
		clauses: [{ id: expect.any(String), field: 'status', op: testCase.op, values: ['todo'] }],
	}
	expect(backend.queries.at(-1)).toMatchObject({
		scope,
		context,
		baseViewKey: 'active',
		filters: expectedFilters,
	})
	const draft = router.state.location.search as { f?: string }
	expect(decodeFilterQueryFromSearchParam(draft.f ?? null)).toEqual(expectedFilters)
	expect(screen.getByRole('radio', { name: '未完成' })).toBeChecked()
	expect(screen.getByRole('button', { name: '筛选运算符' })).toHaveTextContent(
		new RegExp(`^${testCase.label}$`),
	)
	expect(screen.getByRole('button', { name: '筛选值 待执行' })).toBeVisible()

	const name = await openSave(testCase.name)
	fireEvent.submit(name.closest('form')!)
	await waitFor(() => expect(router.state.location.pathname).toBe('/space-1/views/created-1'))
	expect(router.state.location.search).toEqual({})
	expect(await screen.findByRole('radio', { name: testCase.name })).toBeChecked()
	await expectTasks(context, testCase.statuses)
	expect(backend.creates).toEqual([
		{ name: testCase.name, scope, context, baseViewKey: 'active', filters: expectedFilters },
	])
	expect(backend.updates).toHaveLength(0)
	expect(backend.runs.at(-1)).toMatchObject({ scope, viewId: 'created-1' })
	expect(backend.runs.at(-1)?.filters).toBeUndefined()
	expect(screen.queryByRole('button', { name: '保存' })).not.toBeInTheDocument()
	fireEvent.click(screen.getByRole('button', { name: '筛选' }))
	const savedConditions = await screen.findByRole('region', { name: '当前筛选条件' })
	expect(within(savedConditions).getByRole('button', { name: '筛选运算符' })).toHaveTextContent(
		new RegExp(`^${testCase.label}$`),
	)
	expect(within(savedConditions).getByRole('button', { name: '筛选值 待执行' })).toBeVisible()
	fireEvent.keyDown(screen.getByRole('searchbox', { name: '筛选字段' }), { key: 'Escape' })
	await waitFor(() =>
		expect(screen.queryByRole('searchbox', { name: '筛选字段' })).not.toBeInTheDocument(),
	)

	for (const target of [
		{ label: '未完成', baseViewKey: 'active', statuses: ['todo', 'doing', 'waiting'], search: {} },
		{
			label: '全部',
			baseViewKey: 'all',
			statuses: ['todo', 'doing', 'waiting', 'done'],
			search: { v: 'all' },
		},
	]) {
		fireEvent.click(screen.getByRole('radio', { name: target.label }))
		await expectTasks(context, target.statuses)
		expect(router.state.location.pathname).toBe('/space-1/projects/project-1')
		expect(router.state.location.search).toEqual(target.search)
		expect(screen.getByRole('radio', { name: target.label })).toBeChecked()
		expect(backend.queries.at(-1)).toMatchObject({
			scope,
			context,
			baseViewKey: target.baseViewKey,
			filters: { clauses: [] },
		})
		expect(screen.queryByRole('button', { name: '恢复' })).not.toBeInTheDocument()
		fireEvent.click(screen.getByRole('button', { name: '筛选' }))
		expect(await screen.findByText('无附加筛选条件')).toBeVisible()
		fireEvent.keyDown(screen.getByRole('searchbox', { name: '筛选字段' }), { key: 'Escape' })
		await waitFor(() =>
			expect(screen.queryByRole('searchbox', { name: '筛选字段' })).not.toBeInTheDocument(),
		)
	}
	expect(backend.records.find((view) => view.id === 'created-1')?.filters).toEqual(expectedFilters)
	expect(backend.creates).toHaveLength(1)
	expect(backend.updates).toHaveLength(0)
})

it.each(SOURCES)(
	'$name 保存完整查询并打开返回 ID，回到未完成和全部恢复任务成员',
	async (source) => {
		const backend = installBackend()
		const { router } = await renderWorkspace(withDraft(source.path, TODO_FILTER))
		await expectTasks(source.context, ['todo'])
		const name = await openSave('我的待执行')
		expect(screen.queryAllByRole('button', { name: '覆盖当前' })).toHaveLength(
			source.name === 'Saved View' ? 1 : 0,
		)
		fireEvent.submit(name.closest('form')!)
		const target = `/${source.scope.type === 'all' ? 'all' : source.scope.spaceId}/views/created-1`
		await waitFor(() => expect(router.state.location.pathname).toBe(target))
		expect(router.state.location.search).toEqual({})
		expect(backend.creates).toEqual([
			{
				name: '我的待执行',
				scope: source.scope,
				context: source.context,
				baseViewKey: source.baseViewKey,
				filters: TODO_FILTER,
			},
		])
		expect(backend.updates).toHaveLength(0)
		expect(await screen.findByRole('radio', { name: '我的待执行' })).toBeChecked()
		await expectTasks(source.context, ['todo'])
		expect(backend.runs.at(-1)).toMatchObject({ viewId: 'created-1', scope: source.scope })
		expect(backend.runs.at(-1)?.filters).toBeUndefined()

		await act(async () => {
			router.history.back()
		})
		await waitFor(() => expect(router.state.location.pathname).toBe(source.path))
		expect(router.state.location.search).toEqual({ f: encodeFilterQueryToSearchParam(TODO_FILTER) })
		await expectTasks(source.context, ['todo'])
		await act(async () => {
			router.history.forward()
		})
		await waitFor(() => expect(router.state.location.pathname).toBe(target))
		expect(router.state.location.search).toEqual({})
		await expectTasks(source.context, ['todo'])

		fireEvent.click(screen.getByRole('radio', { name: '未完成' }))
		await waitFor(() => expect(router.state.location.pathname).toBe(source.defaultPath))
		expect(screen.getByRole('radio', { name: '未完成' })).toBeChecked()
		expect(screen.queryByRole('radio', { name: '我的待执行' })).not.toBeInTheDocument()
		expect(router.state.location.search).toEqual({})
		await expectTasks(source.context, ['todo', 'doing', 'waiting'])
		expect(backend.queries.at(-1)).toMatchObject({
			scope: source.scope,
			context: source.context,
			baseViewKey: 'active',
			filters: { clauses: [] },
		})

		fireEvent.click(screen.getByRole('radio', { name: '全部' }))
		await waitFor(() => expect(screen.getByRole('radio', { name: '全部' })).toBeChecked())
		expect(router.state.location.search).toEqual({ v: 'all' })
		await expectTasks(source.context, ['todo', 'doing', 'waiting', 'done'])
		expect(backend.queries.at(-1)).toMatchObject({ baseViewKey: 'all', filters: { clauses: [] } })
		expect(backend.creates).toHaveLength(1)
		expect(backend.records.find((view) => view.id === 'source-view')?.filters).toEqual(DOING_FILTER)
	},
)

it('真实创建失败保留名称、来源 Draft 和结果，重试成功才导航', async () => {
	const backend = installBackend()
	backend.beforeCreate = async () => {
		if (backend.creates.length === 1) throw new Error('同步写入失败，请重试')
	}
	const initialEntry = withDraft('/space-1/projects/project-1', TODO_FILTER)
	const { router } = await renderWorkspace(initialEntry)
	const name = await openSave('失败后保留的名称')
	fireEvent.submit(name.closest('form')!)
	expect(await screen.findByRole('alert')).toHaveTextContent('同步写入失败，请重试')
	expect(name).toHaveValue('失败后保留的名称')
	expect(router.state.location.href).toBe(initialEntry)
	expect(backend.records).toHaveLength(1)
	fireEvent.submit(name.closest('form')!)
	await waitFor(() => expect(router.state.location.pathname).toBe('/space-1/views/created-2'))
	expect(backend.creates).toHaveLength(2)
	expect(backend.creates[1]).toEqual(backend.creates[0])
	expect(router.state.location.search).toEqual({})
	await expectTasks({ kind: 'project', projectId: 'project-1' }, ['todo'])
})

it('保存中关闭后切换来源，迟到成功不导航、不清新 Draft、不关闭新会话', async () => {
	const pending = Promise.withResolvers<void>()
	const backend = installBackend()
	backend.beforeCreate = () => pending.promise
	const { router } = await renderWorkspace(withDraft('/all/tasks', TODO_FILTER))
	const oldName = await openSave('旧来源的名称')
	fireEvent.submit(oldName.closest('form')!)
	fireEvent.submit(oldName.closest('form')!)
	await waitFor(() => expect(backend.creates).toHaveLength(1))
	fireEvent.click(screen.getByRole('button', { name: '关闭保存视图' }))
	await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
	await act(async () => {
		await router.navigate({
			to: '/$scopeKey/standalone',
			params: { scopeKey: 'space-1' },
			search: { f: encodeFilterQueryToSearchParam(DOING_FILTER)! } as never,
		})
	})
	const nextHref = router.state.location.href
	const newName = await openSave('新会话名称')
	await act(async () => pending.resolve())
	await waitFor(() => expect(backend.records).toHaveLength(2))
	expect(router.state.location.href).toBe(nextHref)
	expect(newName).toHaveValue('新会话名称')
	expect(screen.getByRole('dialog')).toBeInTheDocument()
	expect(backend.creates[0]).toMatchObject({
		name: '旧来源的名称',
		scope: { type: 'all' },
		context: { kind: 'all' },
		filters: TODO_FILTER,
	})
	fireEvent.click(screen.getByRole('button', { name: '关闭保存视图' }))
	await expectTasks({ kind: 'standalone' }, ['doing'])
})

it('覆盖失败保留原 View，重试仅写 filters 并保留身份和固定边界', async () => {
	const backend = installBackend()
	backend.beforeUpdate = async () => {
		if (backend.updates.length === 1) throw new Error('覆盖写入失败')
	}
	const initialEntry = withDraft('/all/views/source-view', TODO_FILTER)
	const { router } = await renderWorkspace(initialEntry)
	await openSave('不会用于覆盖的名称')
	fireEvent.click(screen.getByRole('button', { name: '覆盖当前' }))
	expect(await screen.findByRole('alert')).toHaveTextContent('覆盖写入失败')
	expect(router.state.location.href).toBe(initialEntry)
	expect(backend.records[0]?.filters).toEqual(DOING_FILTER)
	fireEvent.click(screen.getByRole('button', { name: '重试覆盖' }))
	await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
	expect(router.state.location.pathname).toBe('/all/views/source-view')
	expect(router.state.location.search).toEqual({})
	expect(
		backend.updates.map((input) =>
			Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)),
		),
	).toEqual([
		{ viewId: 'source-view', filters: TODO_FILTER },
		{ viewId: 'source-view', filters: TODO_FILTER },
	])
	expect(backend.records[0]).toMatchObject({ ...sourceView(), filters: TODO_FILTER })
	expect(backend.creates).toHaveLength(0)
	await expectTasks({ kind: 'standalone' }, ['todo'])
})

it('直接载入 Saved View 的显式空 Draft 显示完整基线，恢复只删除 Draft', async () => {
	const backend = installBackend()
	const { router } = await renderWorkspace(withDraft('/all/views/source-view', { clauses: [] }))
	await expectTasks({ kind: 'standalone' }, ['todo', 'doing', 'waiting', 'done'])
	expect(backend.runs.at(-1)).toMatchObject({ viewId: 'source-view', filters: { clauses: [] } })
	expect(router.state.location.search).toEqual({
		f: encodeFilterQueryToSearchParam({ clauses: [] }),
	})
	fireEvent.click(screen.getByRole('button', { name: '恢复' }))
	await waitFor(() => expect(router.state.location.search).toEqual({}))
	await expectTasks({ kind: 'standalone' }, ['doing'])
	expect(backend.runs.at(-1)?.filters).toBeUndefined()
	expect(backend.records[0]).toEqual(sourceView())
	expect(backend.creates).toHaveLength(0)
	expect(backend.updates).toHaveLength(0)
})

it.each([
	{ action: '另存为', path: '/all/tasks', target: '/all/views/created-1', creates: 1, updates: 0 },
	{
		action: '覆盖当前',
		path: '/all/views/source-view',
		target: '/all/views/source-view',
		creates: 0,
		updates: 1,
	},
])('$action 遇真实 blocker 后保留来源，重试只打开已保存的 View', async (testCase) => {
	const backend = installBackend()
	const initialEntry = withDraft(testCase.path, TODO_FILTER)
	const { router } = await renderWorkspace(initialEntry)
	const unblock = router.history.block({ blockerFn: () => true })
	const name = await openSave('已经持久化的视图')
	fireEvent.click(screen.getByRole('button', { name: testCase.action }))
	expect(await screen.findByRole('alert')).toHaveTextContent('已保存，但未能打开')
	expect(router.state.location.href).toBe(initialEntry)
	expect(backend.creates).toHaveLength(testCase.creates)
	expect(backend.updates).toHaveLength(testCase.updates)
	expect(name).toHaveValue('已经持久化的视图')
	unblock()
	fireEvent.click(screen.getByRole('button', { name: '打开已保存视图' }))
	await waitFor(() => expect(router.state.location.pathname).toBe(testCase.target))
	expect(router.state.location.search).toEqual({})
	expect(backend.creates).toHaveLength(testCase.creates)
	expect(backend.updates).toHaveLength(testCase.updates)
	await expectTasks(testCase.creates ? { kind: 'all' } : { kind: 'standalone' }, ['todo'])
})

async function openSave(value: string) {
	fireEvent.click(await screen.findByRole('button', { name: '保存' }))
	const name = await screen.findByRole('textbox', { name: '视图名称' })
	fireEvent.change(name, { target: { value } })
	return name
}

async function expectTasks(context: RunTaskQueryInput['context'], statuses: string[]) {
	const visibleTasks = TASKS.filter((task) => {
		const inContext =
			context.kind === 'all' ||
			(context.kind === 'standalone'
				? task.projectId === null
				: task.projectId === context.projectId)
		return inContext && statuses.includes(task.status)
	})
	const hiddenTasks = TASKS.filter((task) => !visibleTasks.includes(task))
	await waitFor(() => {
		for (const task of visibleTasks) {
			expect(screen.queryByText(task.title, { exact: true })).toBeVisible()
		}
		for (const task of hiddenTasks) {
			expect(screen.queryByText(task.title, { exact: true })).not.toBeInTheDocument()
		}
	})
}

function withDraft(path: string, filters: FilterQuery) {
	return `${path}?f=${encodeFilterQueryToSearchParam(filters)}`
}

function sourceView(): View {
	return {
		id: 'source-view',
		name: '原始进行中',
		scope: { type: 'all' },
		context: { kind: 'standalone' },
		baseViewKey: 'all',
		filters: DOING_FILTER,
		position: 1,
		createdAt: TIME,
		updatedAt: TIME,
	}
}

function installBackend() {
	const backend = {
		records: [sourceView()],
		creates: [] as CreateViewInput[],
		updates: [] as UpdateViewInput[],
		queries: [] as RunTaskQueryInput[],
		runs: [] as RunTaskViewInput[],
		beforeCreate: async () => undefined as void,
		beforeUpdate: async () => undefined as void,
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
					return {
						id: 'project-1',
						name: '项目一',
						spaceId: 'space-1',
						spaceName: '工作空间',
						description: null,
						status: 'todo',
						priority: 0,
						plannedAt: null,
						dueAt: null,
						remindAt: null,
						statusChangedAt: TIME,
						position: 1,
						completedAt: null,
						archivedAt: null,
						deletedAt: null,
						createdAt: TIME,
						updatedAt: TIME,
						taskCount: 4,
						activeTaskCount: 3,
					}
				case 'list_views':
					return structuredClone(
						backend.records.filter(
							(view) => JSON.stringify(view.scope) === JSON.stringify(input.scope),
						),
					)
				case 'run_task_query': {
					const query = input as RunTaskQueryInput
					backend.queries.push(structuredClone(query))
					return queryTasks(query)
				}
				case 'run_task_view': {
					const run = input as RunTaskViewInput
					backend.runs.push(structuredClone(run))
					const view = backend.records.find((record) => record.id === run.viewId)!
					return {
						view: structuredClone(view),
						...queryTasks({
							...view,
							filters: run.filters ?? view.filters,
							order: run.order,
							dateBasis: run.dateBasis,
						}),
					}
				}
				case 'create_view': {
					const create = structuredClone(input) as CreateViewInput
					backend.creates.push(create)
					const id = `created-${backend.creates.length}`
					await backend.beforeCreate()
					const view = { ...create, id, position: 2, createdAt: TIME, updatedAt: TIME }
					backend.records.push(view)
					return structuredClone(view)
				}
				case 'update_view': {
					const update = structuredClone(input) as UpdateViewInput
					backend.updates.push(update)
					await backend.beforeUpdate()
					const view = backend.records.find((record) => record.id === update.viewId)!
					if (update.filters) view.filters = update.filters
					return structuredClone(view)
				}
				default:
					throw new Error(`未定义的测试 IPC：${command}`)
			}
		},
	)
	return backend
}

// 夹具仅解释本票使用的 status 条件；其他筛选须另加明确夹具，避免静默忽略。
function queryTasks(query: RunTaskQueryInput) {
	const items = TASKS.filter((task) => {
		if (query.scope.type === 'space' && task.spaceId !== query.scope.spaceId) return false
		if (query.context.kind === 'project' && task.projectId !== query.context.projectId) return false
		if (query.context.kind === 'standalone' && task.projectId !== null) return false
		if (query.baseViewKey === 'active' && task.status === 'done') return false
		return query.filters.clauses.every((clause) => {
			if (clause.field !== 'status') throw new Error('夹具只支持 status')
			const matches = clause.values.includes(task.status)
			return clause.op === 'is' ? matches : !matches
		})
	})
	return {
		items: structuredClone(items).map((task) => ({
			...task,
			group: { kind: 'status', status: task.status },
			subGroup: { kind: 'none' },
		})),
		totalCount: items.length,
		groupSummary: (['doing', 'todo', 'waiting', 'done', 'canceled'] as const).map((status) => ({
			group: { kind: 'status', status },
			totalCount: items.filter((item) => item.status === status).length,
			subGroups: [],
		})),
		nextCursor: null,
	}
}

async function renderWorkspace(initialEntry: string) {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } },
	})
	const root = createRootRoute({ component: () => <Outlet /> })
	function page(path: string, node: ReactNode) {
		return createRoute({
			getParentRoute: () => root,
			path,
			component: () => <WorkspaceProviders>{node}</WorkspaceProviders>,
		})
	}
	const router = createRouter({
		routeTree: root.addChildren([
			page('/$scopeKey/tasks', <TaskListSceneView variant='all' />),
			page('/$scopeKey/standalone', <TaskListSceneView variant='standalone' />),
			page('/$scopeKey/projects/$projectId', <ProjectPage />),
			page('/$scopeKey/views/$viewId', <SavedViewPage />),
		]),
		history: createMemoryHistory({ initialEntries: [initialEntry] }),
	})
	render(
		<QueryClientProvider client={queryClient}>
			<RouterProvider router={router} />
		</QueryClientProvider>,
	)
	await act(async () => {
		await router.load()
	})
	return { router, queryClient }
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

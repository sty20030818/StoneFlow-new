import type { ReactNode } from 'react'
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

import { parseShellRoute, resolveShellRouteScope, ShellRouteProvider } from '@/app/navigation'
import { BulkActionProvider } from '@/features/bulk-action'
import { DangerConfirmProvider } from '@/features/danger-confirm'
import { CommandSelectionProvider } from '@/features/selection'
import { TaskPreviewProvider } from '@/features/task'
import { useWorkspaceSync } from '@/features/workspace'
import { TASKS_CHANGED_EVENT, WORKSPACE_CHANGED_EVENT } from '@/shared/events'
import type { Scope, TaskListItem } from '@/shared/types'
import { TestInteractionProviders } from '@/test/TestInteractionProviders'

import { SavedViewPage } from './SavedViewPage'
import { ViewsPage } from './ViewsPage'

const { invokeMock, eventListeners } = vi.hoisted(() => ({
	invokeMock: vi.fn(),
	eventListeners: new Map<string, Set<(event: { payload: unknown }) => void>>(),
}))
vi.mock('@tauri-apps/api/core', () => ({ invoke: invokeMock, isTauri: () => false }))
vi.mock('@tauri-apps/api/event', () => ({
	listen: vi.fn(async (name: string, callback: (event: { payload: unknown }) => void) => {
		const listeners = eventListeners.get(name) ?? new Set()
		listeners.add(callback)
		eventListeners.set(name, listeners)
		return () => {
			listeners.delete(callback)
		}
	}),
}))

beforeEach(() => {
	invokeMock.mockReset()
	eventListeners.clear()
	localStorage.clear()
	// jsdom 无布局，仅为真实 TaskBoard 提供 viewport 几何。
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
})

it('混合坏记录按原范围隔离；范围未知只在所有空间可达且不能运行、重命名或覆盖', async () => {
	const backend = installBackend()
	const unknown = unavailableView('unknown', '范围未知的视图', null, '原范围无法识别')
	const unsupported = unavailableView(
		'unsupported',
		'旧筛选不可迁移',
		{ type: 'all' },
		'旧筛选不能无损升级',
	)
	const spaceOne = validView({
		id: 'space-one',
		name: '空间一正常视图',
		scope: { type: 'space', spaceId: 'space-1' },
	})
	const spaceTwo = validView({
		id: 'space-two',
		name: '空间二正常视图',
		scope: { type: 'space', spaceId: 'space-2' },
	})
	const knownBad = unavailableView(
		'known-bad',
		'空间一坏记录',
		{ type: 'space', spaceId: 'space-1' },
		'定义字段损坏',
	)
	const wireBad = validView({ id: 'wire-bad', name: '传输结构坏记录', scope: { type: 'invalid' } })
	backend.records = [validView(), unknown, unsupported, spaceOne, spaceTwo, knownBad, wireBad]
	backend.read = async (scope) =>
		scope.type === 'all'
			? [backend.records[0]!, unknown, unsupported, wireBad]
			: scope.spaceId === 'space-1'
				? [spaceOne, knownBad]
				: [spaceTwo]
	const { router } = await renderRecovery('/all/views')
	expect(await screen.findByRole('row', { name: /正常视图/ })).toBeVisible()
	const unknownRow = screen.getByRole('row', { name: /范围未知的视图/ })
	expect(unknownRow).toHaveTextContent('范围未知')
	expect(unknownRow).toHaveTextContent('原范围无法识别')
	expect(screen.getByRole('row', { name: /传输结构坏记录/ })).toHaveTextContent('范围未知')
	expect(
		screen.queryByRole('row', { name: /空间一正常视图|空间二正常视图/ }),
	).not.toBeInTheDocument()
	pressEnter(screen.getByRole('row', { name: /旧筛选不可迁移/ }))
	await waitFor(() => expect(router.state.location.pathname).toBe('/all/views/unsupported'))
	expect(await screen.findByText('保存视图暂不可用')).toBeVisible()
	expect(screen.getByText('旧筛选不能无损升级')).toBeVisible()
	expect(eventListeners.get(TASKS_CHANGED_EVENT)?.size).toBeGreaterThan(0)
	await act(async () => {
		for (const callback of eventListeners.get(TASKS_CHANGED_EVENT) ?? []) {
			callback({
				payload: {
					space_id: 'space-1',
					space_slug: 'work',
					task_id: 'project-task',
					source: 'launcher',
					space_fallback: false,
				},
			})
		}
	})
	expect(backend.runs).toEqual([])
	expect(screen.queryByRole('button', { name: '保存' })).not.toBeInTheDocument()
	expect(screen.queryByRole('button', { name: '覆盖当前' })).not.toBeInTheDocument()
	pressEnter(screen.getByRole('button', { name: '视图操作' }))
	expect(await screen.findByRole('menuitem', { name: '删除保存视图' })).toBeVisible()
	expect(screen.queryByRole('menuitem', { name: '编辑保存视图' })).not.toBeInTheDocument()
	fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' })
	fireEvent.click(screen.getByRole('button', { name: '返回保存视图' }))
	await waitFor(() => expect(router.state.location.pathname).toBe('/all/views'))
	await act(async () => {
		await router.navigate({ to: '/$scopeKey/views', params: { scopeKey: 'space-1' } })
	})
	expect(await screen.findByRole('row', { name: /空间一正常视图/ })).toBeVisible()
	expect(screen.getByRole('row', { name: /空间一坏记录/ })).toHaveTextContent('定义字段损坏')
	expect(
		screen.queryByRole('row', { name: /范围未知的视图|空间二正常视图/ }),
	).not.toBeInTheDocument()
	await act(async () => {
		await router.navigate({ to: '/$scopeKey/views', params: { scopeKey: 'space-2' } })
	})
	expect(await screen.findByRole('row', { name: /空间二正常视图/ })).toBeVisible()
	expect(screen.queryByRole('row', { name: /空间一|范围未知/ })).not.toBeInTheDocument()
	expect(backend.runs).toEqual([])
	expect(backend.deletes).toEqual([])
	expect(backend.writes).toEqual([])
	expect(backend.reads).toContainEqual({ type: 'space', spaceId: 'space-1' })
	expect(backend.reads).toContainEqual({ type: 'space', spaceId: 'space-2' })
})

it('未知 scope 坏行按 ID 删除；失败保留身份与错误，键盘重试后只移除该行', async () => {
	const backend = installBackend()
	backend.records.push(unavailableView('bad-id', '需要删除的坏记录', null, '范围无法识别'))
	backend.beforeDelete = async () => {
		if (backend.deletes.length === 1) throw new Error('暂时无法删除坏记录')
	}
	await renderRecovery('/all/views')
	const row = await screen.findByRole('row', { name: /需要删除的坏记录/ })
	fireEvent.click(within(row).getByRole('button', { name: '视图操作' }))
	expect(screen.queryByRole('menuitem', { name: '编辑保存视图' })).not.toBeInTheDocument()
	pressEnter(await screen.findByRole('menuitem', { name: '删除保存视图' }))
	expect(await screen.findByRole('alert')).toHaveTextContent('暂时无法删除坏记录')
	expect(row).toBeInTheDocument()
	const retry = screen.getByRole('menuitem', { name: '重试删除' })
	fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowUp' })
	await waitFor(() => expect(retry).toHaveFocus())
	pressEnter(retry)
	await waitFor(() =>
		expect(screen.queryByRole('row', { name: /需要删除的坏记录/ })).not.toBeInTheDocument(),
	)
	expect(screen.getByRole('row', { name: /正常视图/ })).toBeVisible()
	expect(backend.deletes).toEqual(['bad-id', 'bad-id'])
	expect(backend.runs).toEqual([])
	expect(backend.writes).toEqual([])
})

it('不可用详情返回 Library 后可选有效项目重新保存，原异常记录不被覆盖', async () => {
	const backend = installBackend()
	const bad = unavailableView('bad-project', '旧项目视图', { type: 'all' }, '原项目已不可用')
	backend.records = [bad]
	const { router } = await renderRecovery('/all/views/bad-project')
	expect(await screen.findByText('保存视图暂不可用')).toBeVisible()
	fireEvent.click(screen.getByRole('button', { name: '返回保存视图' }))
	expect(await screen.findByRole('row', { name: /旧项目视图/ })).toBeVisible()
	fireEvent.click(screen.getByRole('button', { name: '新建保存视图' }))
	const name = await screen.findByRole('textbox', { name: '名称' })
	fireEvent.change(name, { target: { value: '重新建立的项目视图' } })
	fireEvent.click(screen.getByRole('button', { name: /查询范围/ }))
	fireEvent.click(await screen.findByRole('option', { name: '指定项目' }))
	fireEvent.click(screen.getByRole('button', { name: /请选择项目/ }))
	fireEvent.click(await screen.findByRole('option', { name: '项目一' }))
	fireEvent.submit(name.closest('form')!)
	await waitFor(() => expect(router.state.location.pathname).toBe('/all/views/rebuilt'))
	expect(await screen.findByRole('radio', { name: '重新建立的项目视图' })).toBeChecked()
	expect(backend.records.find((view) => view.id === 'bad-project')).toEqual(bad)
	expect(backend.records.find((view) => view.id === 'rebuilt')).toMatchObject({
		name: '重新建立的项目视图',
		scope: { type: 'all' },
		context: { kind: 'project', projectId: 'project-1' },
	})
	expect(backend.writes).toEqual(['create_view'])
	expect(backend.deletes).toEqual([])
	expect(backend.runs).toEqual(['rebuilt'])
})

it('项目迁出同步事件重检 View；迁回后恢复原定义和新结果，不展示旧任务或扩范围', async () => {
	const backend = installBackend()
	const projectView = validView({
		id: 'project-view',
		name: '项目视图',
		scope: { type: 'space', spaceId: 'space-1' },
		context: { kind: 'project', projectId: 'project-1' },
	})
	backend.records = [projectView]
	backend.tasks = [projectTask('项目原有任务')]
	const { router } = await renderRecovery('/space-1/views/project-view')
	expect(await screen.findByText('项目原有任务')).toBeVisible()
	expect(backend.runs).toEqual(['project-view'])
	backend.projectSpaceId = 'space-2'
	backend.tasks = [{ ...projectTask('范围外的其他任务'), spaceId: 'space-2' }]
	backend.records = [
		unavailableView(
			'project-view',
			'项目视图',
			{ type: 'space', spaceId: 'space-1' },
			'项目已移出此范围',
		),
	]
	await emitProjectSync()
	expect(await screen.findByText('保存视图暂不可用')).toBeVisible()
	expect(screen.getByText('项目已移出此范围')).toBeVisible()
	expect(screen.queryByText('当前没有任务')).not.toBeInTheDocument()
	expect(screen.queryByText('项目原有任务')).not.toBeInTheDocument()
	expect(screen.queryByText('范围外的其他任务')).not.toBeInTheDocument()
	expect(screen.queryByRole('button', { name: '创建任务' })).not.toBeInTheDocument()
	backend.projectSpaceId = 'space-1'
	backend.records = [projectView]
	backend.tasks = [projectTask('迁回后的项目任务')]
	await emitProjectSync()
	expect(await screen.findByText('迁回后的项目任务')).toBeVisible()
	expect(screen.queryByText('项目原有任务')).not.toBeInTheDocument()
	expect(screen.getByRole('radio', { name: '项目视图' })).toBeChecked()
	expect(router.state.location.pathname).toBe('/space-1/views/project-view')
	expect(backend.records[0]).toEqual(projectView)
	expect(
		backend.runScopes.every((scope) => scope.type === 'space' && scope.spaceId === 'space-1'),
	).toBe(true)
	expect(backend.writes).toEqual([])
})

it('Library 读取失败不是空列表；键盘重试实际重新请求并显示记录', async () => {
	const retryRead = Promise.withResolvers<Record<string, unknown>[]>()
	const backend = installBackend()
	backend.read = async () => {
		if (backend.readCount === 1) throw new Error('视图库读取失败')
		return retryRead.promise
	}
	await renderRecovery('/all/views')
	expect(await screen.findByText('读取保存视图失败')).toBeVisible()
	expect(screen.queryByText('还没有保存视图')).not.toBeInTheDocument()
	expect(screen.queryByText('当前没有任务')).not.toBeInTheDocument()
	const retry = screen.getByRole('button', { name: /重试|重新加载/ })
	await act(async () => retry.focus())
	pressEnter(retry)
	await waitFor(() => expect(backend.readCount).toBe(2))
	expect(retry).toBeInTheDocument()
	expect(retry).toHaveFocus()
	expect(retry).toHaveAttribute('aria-disabled', 'true')
	await act(async () => retryRead.resolve(backend.records))
	expect(await screen.findByRole('row', { name: /正常视图/ })).toBeVisible()
	expect(backend.readCount).toBe(2)
	expect(backend.runs).toEqual([])
})

it('定义未加载、读取错误和真实零任务分开呈现，详情重试后仍能返回 Library', async () => {
	const firstRead = Promise.withResolvers<Record<string, unknown>[]>()
	const backend = installBackend()
	backend.read = () =>
		backend.readCount === 1 ? firstRead.promise : Promise.resolve(backend.records)
	const { router } = await renderRecovery('/all/views/valid')
	expect(screen.getByLabelText('正在加载保存视图')).toHaveAttribute('aria-busy', 'true')
	expect(screen.queryByText('当前没有任务')).not.toBeInTheDocument()
	expect(screen.queryByText('找不到保存视图')).not.toBeInTheDocument()
	await act(async () => firstRead.reject(new Error('定义读取失败')))
	expect(await screen.findByText('读取保存视图失败')).toBeVisible()
	expect(screen.getByRole('button', { name: '返回保存视图' })).toBeEnabled()
	expect(backend.runs).toEqual([])
	pressEnter(screen.getByRole('button', { name: /重试|重新加载/ }))
	expect(await screen.findByText('当前没有任务')).toBeVisible()
	expect(screen.queryByText('读取保存视图失败')).not.toBeInTheDocument()
	expect(backend.readCount).toBe(2)
	expect(backend.runs).toEqual(['valid'])
	await act(async () => {
		await router.navigate({ to: '/$scopeKey/views', params: { scopeKey: 'all' } })
	})
	expect(await screen.findByRole('row', { name: /正常视图/ })).toBeVisible()
})

function pressEnter(element: HTMLElement) {
	fireEvent.keyDown(element, { key: 'Enter' })
	fireEvent.keyUp(element, { key: 'Enter' })
}

function validView(overrides: Record<string, unknown> = {}): Record<string, unknown> {
	return {
		id: 'valid',
		name: '正常视图',
		scope: { type: 'all' },
		context: { kind: 'all' },
		baseViewKey: 'active',
		filters: { clauses: [] },
		position: 1,
		createdAt: '2026-09-13T00:00:00Z',
		updatedAt: '2026-09-13T00:00:00Z',
		...overrides,
	}
}

function unavailableView(id: string, name: string, scope: Scope | null, definitionError: string) {
	return {
		id,
		name,
		scope,
		definitionError,
		position: 1,
		createdAt: '2026-09-13T00:00:00Z',
		updatedAt: '2026-09-13T00:00:00Z',
	}
}

function projectTask(title: string): TaskListItem {
	return {
		id: 'project-task',
		title,
		spaceId: 'space-1',
		spaceName: '工作空间',
		spaceSlug: 'work',
		projectId: 'project-1',
		projectName: '项目一',
		status: 'todo',
		priority: 0,
		statusChangedAt: '2026-09-13T00:00:00Z',
		plannedAt: null,
		dueAt: null,
		remindAt: null,
		completedAt: null,
		canceledAt: null,
		archivedAt: null,
		createdAt: '2026-09-13T00:00:00Z',
		updatedAt: '2026-09-13T00:00:00Z',
	}
}

async function emitProjectSync() {
	await act(async () => {
		for (const callback of eventListeners.get(WORKSPACE_CHANGED_EVENT) ?? []) {
			callback({
				payload: { source: 'sync', reason: 'project moved', changedDomains: ['projects'] },
			})
		}
	})
}

function installBackend() {
	const backend = {
		records: [validView()],
		readCount: 0,
		reads: [] as Scope[],
		runs: [] as string[],
		runScopes: [] as Scope[],
		tasks: [] as TaskListItem[],
		deletes: [] as string[],
		writes: [] as string[],
		projectSpaceId: 'space-1',
		beforeDelete: async (): Promise<void> => undefined,
		read: async (_scope: Scope): Promise<Record<string, unknown>[]> => backend.records,
	}
	invokeMock.mockImplementation(
		async (
			command: string,
			args?: {
				input?: { viewId?: string; scope?: Scope } & Record<string, unknown>
				viewId?: string
			},
		) => {
			switch (command) {
				case 'list_views':
					backend.readCount += 1
					backend.reads.push(args!.input!.scope!)
					return structuredClone(await backend.read(args!.input!.scope!))
				case 'list_sidebar_projects':
					return [{ id: 'project-1', name: '项目一', spaceId: backend.projectSpaceId }]
				case 'list_visible_spaces':
					return []
				case 'run_task_view': {
					const viewId = args!.input!.viewId!
					backend.runs.push(viewId)
					backend.runScopes.push(args!.input!.scope!)
					const view = backend.records.find((view) => view.id === viewId)
					if (!view || view.definitionError) throw new Error('该视图当前不可执行')
					return {
						view,
						items: backend.tasks,
						totalCount: backend.tasks.length,
						nextCursor: null,
					}
				}
				case 'get_project_detail':
					return {
						id: 'project-1',
						name: '项目一',
						spaceId: backend.projectSpaceId,
						completedAt: null,
					}
				case 'delete_view':
					backend.deletes.push(args!.viewId!)
					await backend.beforeDelete()
					backend.records = backend.records.filter((view) => view.id !== args!.viewId)
					return undefined
				case 'create_view':
					backend.writes.push(command)
					backend.records.push(validView({ ...args!.input, id: 'rebuilt' }))
					return backend.records.at(-1)
				case 'update_view':
					backend.writes.push(command)
					throw new Error(`不可用记录不应发出 ${command}`)
				default:
					throw new Error(`未定义的测试 IPC：${command}`)
			}
		},
	)
	return backend
}

async function renderRecovery(initialEntry: string) {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } },
	})
	const root = createRootRoute({ component: () => <Outlet /> })
	function page(path: string, node: ReactNode) {
		return createRoute({
			getParentRoute: () => root,
			path,
			component: () => <RecoveryProviders>{node}</RecoveryProviders>,
		})
	}
	const router = createRouter({
		routeTree: root.addChildren([
			page('/$scopeKey/views', <ViewsPage />),
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

function RecoveryProviders({ children }: { children: ReactNode }) {
	const pathname = useMatch({ strict: false, select: (match) => match.pathname })
	const shellRoute = parseShellRoute(pathname)
	useWorkspaceSync(resolveShellRouteScope(shellRoute))
	return (
		<TestInteractionProviders>
			<ShellRouteProvider shellRoute={shellRoute}>
				<CommandSelectionProvider>
					<TaskPreviewProvider>
						<DangerConfirmProvider>
							<BulkActionProvider actions={[]}>{children}</BulkActionProvider>
						</DangerConfirmProvider>
					</TaskPreviewProvider>
				</CommandSelectionProvider>
			</ShellRouteProvider>
		</TestInteractionProviders>
	)
}

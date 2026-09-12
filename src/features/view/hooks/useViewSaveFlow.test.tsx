import { useLayoutEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
	Outlet,
	RouterProvider,
	createLazyRoute,
	createMemoryHistory,
	createRootRoute,
	createRoute,
	createRouter,
} from '@tanstack/react-router'
import { act, render, waitFor } from '@testing-library/react'

import { encodeFilterQueryToSearchParam } from '@/features/filter'
import type { View } from '@/shared/types'

import { useViewSaveFlow, type ViewSaveCommand, type ViewSaveFlow } from './useViewSaveFlow'

const { createViewMock, updateViewMock } = vi.hoisted(() => ({
	createViewMock: vi.fn(),
	updateViewMock: vi.fn(),
}))

vi.mock('../api/views', () => ({
	createView: createViewMock,
	updateView: updateViewMock,
}))

beforeEach(() => {
	createViewMock.mockReset().mockResolvedValue(savedView())
	updateViewMock.mockReset().mockResolvedValue(savedView())
})

afterEach(() => vi.restoreAllMocks())

describe('useViewSaveFlow', () => {
	it('真实 blocker 拒绝后退出 pending，保留来源 Draft 和保存 ID，重试只打开', async () => {
		const page = await renderFlow()
		const blocker = vi.fn(() => true)
		const unblock = page.router.history.block({ blockerFn: blocker })
		act(() => {
			page.flow.begin()
		})
		act(() => {
			void page.flow.submit(createCommand())
		})

		await waitFor(() => expect(page.flow.error?.kind).toBe('open'))
		expect(page.router.state.location.href).toBe(SOURCE_URL)
		expect(page.flow).toMatchObject({ open: true, pending: null, savedView: { id: 'saved-1' } })
		expect(blocker).toHaveBeenCalledOnce()
		expect(blocker).toHaveBeenLastCalledWith(
			expect.objectContaining({
				action: 'PUSH',
				currentLocation: expect.objectContaining({ href: SOURCE_URL }),
				nextLocation: expect.objectContaining({ href: '/all/views/saved-1', search: '' }),
			}),
		)
		blocker.mockReturnValue(false)
		await act(async () => {
			await page.flow.retryOpen()
		})
		expect(page.router.state.location.href).toBe('/all/views/saved-1')
		expect(createViewMock).toHaveBeenCalledOnce()
		expect(blocker).toHaveBeenCalledTimes(2)
		unblock()
	})

	it.each(['beforeLoad', 'lazy'] as const)(
		'目标 %s 失败在修改 URL 前报告，重试不再次创建',
		async (failure) => {
			vi.spyOn(console, 'error').mockImplementation(() => undefined)
			vi.spyOn(console, 'warn').mockImplementation(() => undefined)
			let fail = true
			const prepare = vi.fn(async () => {
				if (fail) throw new Error('目标页面加载失败')
			})
			const page = await renderFlow({ [failure]: prepare })
			act(() => {
				page.flow.begin()
			})
			act(() => {
				void page.flow.submit(createCommand())
			})
			await waitFor(() => expect(prepare).toHaveBeenCalled())
			await waitFor(() => expect(page.flow.error?.kind).toBe('open'))
			expect(page.router.state.location.href).toBe(SOURCE_URL)
			expect(page.flow).toMatchObject({ open: true, pending: null, savedView: { id: 'saved-1' } })

			fail = false
			await act(async () => {
				await page.flow.retryOpen()
			})
			expect(page.router.state.location.href).toBe('/all/views/saved-1')
			expect(createViewMock).toHaveBeenCalledOnce()
		},
	)

	it('重复提交只写一次，提交后的对象修改不改变快照，打开实际返回 ID', async () => {
		const pending = Promise.withResolvers<View>()
		createViewMock.mockReturnValue(pending.promise)
		const page = await renderFlow()
		const command = createCommand()
		const expected = structuredClone(command.input)
		act(() => {
			page.flow.begin()
		})
		act(() => {
			void page.flow.submit(command)
			void page.flow.submit(command)
		})
		command.input.name = '后来修改的名称'
		command.input.filters.clauses[0]!.values = ['doing']
		await waitFor(() => expect(createViewMock).toHaveBeenCalledOnce())
		expect(createViewMock.mock.calls[0]![0]).toEqual(expected)
		await act(async () => {
			pending.resolve(savedView('returned-id'))
		})
		await waitFor(() => expect(page.router.state.location.href).toBe('/all/views/returned-id'))
	})

	it('关闭并开始新会话后，旧结果不能导航或结束新提交', async () => {
		const first = Promise.withResolvers<View>()
		const second = Promise.withResolvers<View>()
		createViewMock.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
		const page = await renderFlow()
		act(() => {
			page.flow.begin()
		})
		act(() => {
			void page.flow.submit(createCommand())
		})
		await waitFor(() => expect(createViewMock).toHaveBeenCalledOnce())
		act(() => {
			page.flow.close()
			page.flow.begin()
		})
		act(() => {
			void page.flow.submit(createCommand())
		})
		await waitFor(() => expect(createViewMock).toHaveBeenCalledTimes(2))
		const currentSession = page.flow.sessionKey
		await act(async () => {
			first.resolve(savedView('old-result'))
		})
		expect(page.router.state.location.href).toBe(SOURCE_URL)
		expect(page.flow).toMatchObject({ open: true, pending: 'create', sessionKey: currentSession })
		await act(async () => {
			second.resolve(savedView('new-result'))
		})
		await waitFor(() => expect(page.router.state.location.href).toBe('/all/views/new-result'))
	})

	it('同来源 f 改变使旧保存失效，仍执行 mutation 缓存失效', async () => {
		const pending = Promise.withResolvers<View>()
		createViewMock.mockReturnValueOnce(pending.promise)
		const page = await renderFlow()
		const invalidate = vi.spyOn(page.queryClient, 'invalidateQueries')
		act(() => {
			page.flow.begin()
		})
		act(() => {
			void page.flow.submit(createCommand())
		})
		await waitFor(() => expect(createViewMock).toHaveBeenCalledOnce())
		await act(async () => {
			await page.router.navigate({ to: '/all/tasks' as never, search: { f: 'new-draft' } as never })
		})
		act(() => {
			page.flow.begin()
		})
		const currentSession = page.flow.sessionKey
		await act(async () => {
			pending.resolve(savedView())
		})
		expect(page.router.state.location.search).toEqual({ f: 'new-draft' })
		expect(page.flow).toMatchObject({
			open: true,
			pending: null,
			sessionKey: currentSession,
			savedView: null,
		})
		expect(invalidate).toHaveBeenCalledWith({ queryKey: ['views'] })
	})

	it.each(['preload', 'blocker'] as const)('%s 等待时关闭会话后不再导航', async (phase) => {
		const gate = Promise.withResolvers<void>()
		const wait = vi.fn(async () => {
			await gate.promise
		})
		const page = await renderFlow(phase === 'preload' ? { beforeLoad: wait } : {})
		const unblock =
			phase === 'blocker'
				? page.router.history.block({
						blockerFn: async () => {
							await wait()
							return false
						},
					})
				: () => undefined
		act(() => {
			page.flow.begin()
		})
		act(() => {
			void page.flow.submit(createCommand())
		})
		await waitFor(() => expect(wait).toHaveBeenCalledOnce())
		act(() => {
			page.flow.close()
		})
		await act(async () => {
			gate.resolve()
		})
		expect(page.router.state.location.href).toBe(SOURCE_URL)
		expect(page.flow.open).toBe(false)
		unblock()
	})
})

const SOURCE_FILTER = encodeFilterQueryToSearchParam({
	clauses: [{ id: 'status', field: 'status', op: 'is', values: ['todo'] }],
})!
const SOURCE_URL = `/all/tasks?f=${SOURCE_FILTER}`

async function renderFlow(
	options: { beforeLoad?: () => Promise<void>; lazy?: () => Promise<void> } = {},
) {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	})
	let flow!: ViewSaveFlow
	function Source() {
		const value = useViewSaveFlow({ scope: { type: 'all' }, spaceId: null })
		useLayoutEffect(() => {
			flow = value
		})
		return <div>来源页面</div>
	}
	const root = createRootRoute({ component: Outlet })
	const source = createRoute({ getParentRoute: () => root, path: '/all/tasks', component: Source })
	const target = createRoute({
		getParentRoute: () => root,
		path: '/all/views/$viewId',
		beforeLoad: options.beforeLoad,
		component: () => <div>目标页面</div>,
		errorComponent: () => <div>目标错误页面</div>,
	})
	if (options.lazy) {
		target.lazy(async () => {
			await options.lazy!()
			return createLazyRoute('/all/views/$viewId' as never)({
				component: () => <div>目标页面</div>,
			})
		})
	}
	const router = createRouter({
		routeTree: root.addChildren([source, target]),
		history: createMemoryHistory({ initialEntries: [SOURCE_URL] }),
		defaultPendingMs: 10000,
	})
	render(
		<QueryClientProvider client={queryClient}>
			<RouterProvider router={router} />
		</QueryClientProvider>,
	)
	await act(async () => {
		await router.load()
	})
	return {
		router,
		queryClient,
		get flow() {
			return flow
		},
	}
}

function createCommand(): Extract<ViewSaveCommand, { mode: 'create' }> {
	return {
		mode: 'create',
		input: {
			name: '我的视图',
			scope: { type: 'all' },
			context: { kind: 'standalone' },
			baseViewKey: 'active',
			filters: { clauses: [{ id: 'status', field: 'status', op: 'is', values: ['todo'] }] },
		},
	}
}

function savedView(id = 'saved-1'): View {
	return {
		...createCommand().input,
		id,
		position: 1024,
		createdAt: '2026-09-13T00:00:00Z',
		updatedAt: '2026-09-13T00:00:00Z',
	}
}

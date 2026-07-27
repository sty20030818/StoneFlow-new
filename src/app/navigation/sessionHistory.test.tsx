import { QueryClient } from '@tanstack/react-query'
import {
	Outlet,
	RouterProvider,
	createMemoryHistory,
	createRootRouteWithContext,
	createRoute,
	createRouter,
	useNavigate,
} from '@tanstack/react-router'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { useShellSessionRouteHistory } from './sessionHistory'

const spaces = [
	{ id: 'space-a', name: '工作' },
	{ id: 'space-b', name: '生活' },
] as never

const projects = [
	{ id: 'project-a', label: '项目 A', spaceId: 'space-a', spaceName: '工作' },
] as never

describe('useShellSessionRouteHistory', () => {
	it('基于 ShellRoute 生成 canonical label 并剥离 drawer query', async () => {
		await renderHistoryProbe('/space-a/standalone?task=task-a')

		await waitFor(() => {
			expect(screen.getByTestId('current-entry')).toHaveTextContent(
				'/space-a/standalone|独立事项|space-a|工作',
			)
		})
	})

	it('识别 all views 和 space project route', async () => {
		await renderHistoryProbe('/all/views/focus')

		fireEvent.click(screen.getByRole('button', { name: 'go project' }))

		await waitFor(() => {
			expect(screen.getByTestId('current-entry')).toHaveTextContent(
				'/space-a/projects/project-a|项目 A|space-a|工作',
			)
		})
		expect(screen.getByTestId('history-entries')).toHaveTextContent(
			'/all/views/focus|视图|null|所有空间',
		)
	})

	it('canonical detail 进入历史记录', async () => {
		await renderHistoryProbe('/space-a/tasks/task-a')

		fireEvent.click(screen.getByRole('button', { name: 'go project detail' }))

		await waitFor(() => {
			expect(screen.getByTestId('current-entry')).toHaveTextContent(
				'/space-a/projects/project-a|项目 A|space-a|工作',
			)
		})
		expect(screen.getByTestId('history-entries')).toHaveTextContent(
			'/space-a/tasks/task-a|任务详情|space-a|工作',
		)
	})

	it('非 shell 路径不作为历史 entry', async () => {
		await renderHistoryProbe('/debug/activity')

		fireEvent.click(screen.getByRole('button', { name: 'go task detail' }))

		await waitFor(() => {
			expect(screen.getByTestId('current-entry')).toHaveTextContent(
				'/space-a/tasks/task-a|任务详情|space-a|工作',
			)
		})
		expect(screen.getByTestId('history-entries')).toHaveTextContent('empty')
	})

	it('REPLACE 会替换当前 history entry', async () => {
		await renderHistoryProbe('/space-a/standalone')

		fireEvent.click(screen.getByRole('button', { name: 'replace views' }))

		await waitFor(() => {
			expect(screen.getByTestId('current-entry')).toHaveTextContent(
				'/space-a/views/today|视图|space-a|工作',
			)
		})
		expect(screen.getByTestId('history-entries')).toHaveTextContent('empty')
	})

	it('back/forward 走 router history，entries 只是最近浏览列表', async () => {
		await renderHistoryProbe('/space-a/standalone')

		fireEvent.click(screen.getByRole('button', { name: 'go task detail' }))
		await waitFor(() => {
			expect(screen.getByTestId('current-entry')).toHaveTextContent(
				'/space-a/tasks/task-a|任务详情|space-a|工作',
			)
		})

		fireEvent.click(screen.getByRole('button', { name: 'go project detail' }))
		await waitFor(() => {
			expect(screen.getByTestId('current-entry')).toHaveTextContent(
				'/space-a/projects/project-a|项目 A|space-a|工作',
			)
		})

		expect(screen.getByTestId('history-state')).toHaveTextContent('back:true|forward:false')
		expect(screen.getByTestId('history-entries')).toHaveTextContent(
			'/space-a/tasks/task-a|任务详情|space-a|工作',
		)

		fireEvent.click(screen.getByRole('button', { name: 'history back' }))
		await waitFor(() => {
			expect(screen.getByTestId('current-entry')).toHaveTextContent(
				'/space-a/tasks/task-a|任务详情|space-a|工作',
			)
		})

		expect(screen.getByTestId('history-state')).toHaveTextContent('back:true|forward:true')

		fireEvent.click(screen.getByRole('button', { name: 'history forward' }))
		await waitFor(() => {
			expect(screen.getByTestId('current-entry')).toHaveTextContent(
				'/space-a/projects/project-a|项目 A|space-a|工作',
			)
		})
	})
})

async function renderHistoryProbe(initialEntry: string) {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false },
		},
	})
	const rootRoute = createRootRouteWithContext<{ queryClient: QueryClient }>()({
		component: HistoryProbeLayout,
	})
	const allRoute = createRoute({
		getParentRoute: () => rootRoute,
		path: 'all',
		component: () => <Outlet />,
	})
	const allViewsRoute = createRoute({
		getParentRoute: () => allRoute,
		path: 'views',
		component: () => <Outlet />,
	})
	const allViewDetailRoute = createRoute({
		getParentRoute: () => allViewsRoute,
		path: '$',
		component: () => null,
	})
	const spacesRoute = createRoute({
		getParentRoute: () => rootRoute,
		path: 'spaces',
		component: () => <Outlet />,
	})
	const spaceRoute = createRoute({
		getParentRoute: () => spacesRoute,
		path: '$spaceId',
		component: () => <Outlet />,
	})
	const standaloneRoute = createRoute({
		getParentRoute: () => spaceRoute,
		path: 'standalone',
		component: () => null,
	})
	const spaceViewsRoute = createRoute({
		getParentRoute: () => spaceRoute,
		path: 'views',
		component: () => <Outlet />,
	})
	const spaceViewDetailRoute = createRoute({
		getParentRoute: () => spaceViewsRoute,
		path: '$',
		component: () => null,
	})
	const tasksRoute = createRoute({
		getParentRoute: () => spaceRoute,
		path: 'tasks',
		component: () => <Outlet />,
	})
	const taskDetailRoute = createRoute({
		getParentRoute: () => tasksRoute,
		path: '$taskId',
		component: () => null,
	})
	const projectsRoute = createRoute({
		getParentRoute: () => spaceRoute,
		path: 'projects',
		component: () => <Outlet />,
	})
	const projectDetailRoute = createRoute({
		getParentRoute: () => projectsRoute,
		path: '$projectId',
		component: () => null,
	})
	const routeTree = rootRoute.addChildren([
		allRoute.addChildren([allViewsRoute.addChildren([allViewDetailRoute])]),
		spacesRoute.addChildren([
			spaceRoute.addChildren([
				standaloneRoute,
				spaceViewsRoute.addChildren([spaceViewDetailRoute]),
				tasksRoute.addChildren([taskDetailRoute]),
				projectsRoute.addChildren([projectDetailRoute]),
			]),
		]),
	])
	const router = createRouter({
		routeTree,
		history: createMemoryHistory({
			initialEntries: [initialEntry],
		}),
		context: {
			queryClient,
		},
		defaultNotFoundComponent: () => null,
	})
	const rendered = render(<RouterProvider context={{ queryClient }} router={router} />)

	await act(async () => {
		await router.load()
	})

	return {
		router,
		queryClient,
		...rendered,
	}
}

function HistoryProbeLayout() {
	const navigate = useNavigate({ from: '/' })
	const history = useShellSessionRouteHistory({
		currentScope: { type: 'space', spaceId: 'space-a' },
		currentSpaceId: 'space-a',
		spaces,
		projects,
	})

	return (
		<div>
			<div data-testid='current-entry'>{formatEntry(history.currentEntry)}</div>
			<div data-testid='history-state'>
				back:{String(history.canGoBack)}|forward:{String(history.canGoForward)}
			</div>
			<div data-testid='history-entries'>
				{history.entries.length > 0 ? history.entries.map(formatEntry).join('\n') : 'empty'}
			</div>
			<button
				onClick={() => void navigate({ to: '/space-a/projects/project-a' as never })}
				type='button'
			>
				go project
			</button>
			<button onClick={() => void navigate({ to: '/space-a/tasks/task-a' as never })} type='button'>
				go task detail
			</button>
			<button
				onClick={() => void navigate({ to: '/space-a/projects/project-a' as never })}
				type='button'
			>
				go project detail
			</button>
			<button
				onClick={() => void navigate({ to: '/space-a/views/today' as never, replace: true })}
				type='button'
			>
				replace views
			</button>
			<button onClick={history.goBack} type='button'>
				history back
			</button>
			<button onClick={history.goForward} type='button'>
				history forward
			</button>
			<Outlet />
		</div>
	)
}

function formatEntry(entry: {
	path: string
	label: string
	spaceId: string | null
	spaceName: string
}) {
	return `${entry.path}|${entry.label}|${entry.spaceId ?? 'null'}|${entry.spaceName}`
}

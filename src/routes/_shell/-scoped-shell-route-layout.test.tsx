import { type ComponentProps, useLayoutEffect } from 'react'
import {
	Outlet,
	RouterProvider,
	createMemoryHistory,
	createRootRoute,
	createRoute,
	createRouter,
	useParams,
} from '@tanstack/react-router'
import { act, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ShellRouteProvider, useCurrentShellRoute } from '@/app/navigation/ShellRouteContext'
import { resolveBreadcrumb } from '@/app/navigation/breadcrumb'
import { rememberShellRoute } from '@/app/navigation/memoryStore'
import { useRememberCurrentShellRoute } from '@/app/navigation/useRememberCurrentShellRoute'
import type { Scope } from '@/shared/types'
import { ScopedShellRouteLayout } from './-scoped-shell-route-layout'

vi.mock('@/layout/ShellRouteLayout', () => ({
	ShellRouteLayout: ({ children, shellRoute }: ComponentProps<typeof ShellRouteProvider>) => (
		<ShellRouteProvider shellRoute={shellRoute}>{children}</ShellRouteProvider>
	),
}))

vi.mock('@/app/navigation/memoryStore', async (importOriginal) => ({
	...(await importOriginal<typeof import('@/app/navigation/memoryStore')>()),
	rememberShellRoute: vi.fn(async () => undefined),
}))

describe('ScopedShellRouteLayout', () => {
	it.each([
		['跨页面', '/space-a/tasks', '/space-a/projects/project-b'],
		['切换项目', '/space-a/projects/project-a', '/space-a/projects/project-b'],
		['同页 search/hash', '/space-a/projects/project-a', '/space-a/projects/project-a'],
		['切换空间', '/space-a/tasks', '/space-b/projects/project-b'],
	])('%s 时面包屑、参数和完整路径随页面共同提交', async (_case, from, to) => {
		vi.mocked(rememberShellRoute).mockClear()
		let release!: () => void
		const pending = new Promise<void>((resolve) => {
			release = resolve
		})
		const targetLoader = vi.fn(() => pending)
		const commits: string[] = []
		function Page() {
			const params = useParams({ strict: false }) as { projectId?: string }
			const route = useCurrentShellRoute()
			const breadcrumb = resolveBreadcrumb({ route })
				.map((item) => item.label)
				.join(' > ')
			const snapshot = JSON.stringify({
				scope: route.scope,
				pageProjectId: params.projectId ?? null,
				projectId: route.projectId,
				fullPath: route.fullPath,
				breadcrumb,
			})
			useLayoutEffect(() => {
				commits.push(snapshot)
			})
			return <output data-testid='route'>{snapshot}</output>
		}
		const root = createRootRoute({ component: Outlet })
		const scope = createRoute({
			getParentRoute: () => root,
			path: '$scopeKey',
			beforeLoad: ({ location, params }) => ({
				shellScope: { type: 'space', spaceId: params.scopeKey } as Scope,
				shellLocation: location,
			}),
			component: () => {
				const { shellScope, shellLocation } = scope.useRouteContext()
				useRememberCurrentShellRoute(shellScope, shellLocation)
				return <ScopedShellRouteLayout scope={shellScope} location={shellLocation} />
			},
		})
		const tasks = createRoute({
			getParentRoute: () => scope,
			path: 'tasks',
			component: Page,
		})
		const project = createRoute({
			getParentRoute: () => scope,
			path: 'projects/$projectId',
			validateSearch: (search: Record<string, unknown>) => ({ v: String(search.v ?? '') }),
			loaderDeps: ({ search }) => ({ v: search.v }),
			loader: ({ deps }) => (deps.v === 'new' ? targetLoader() : undefined),
			component: Page,
		})
		const router = createRouter({
			routeTree: root.addChildren([scope.addChildren([tasks, project])]),
			history: createMemoryHistory({ initialEntries: [`${from}?v=old#before`] }),
			defaultPendingMs: 1000,
		})
		render(<RouterProvider router={router} />)
		await act(async () => {
			await router.load()
		})
		const before = screen.getByTestId('route').textContent!
		expect(JSON.parse(before)).toMatchObject({ fullPath: `${from}?v=old#before` })
		let navigation!: Promise<void>
		act(() => {
			navigation = router.navigate({
				to: to as never,
				search: { v: 'new' } as never,
				hash: 'after',
			})
		})
		try {
			await waitFor(() => expect(targetLoader).toHaveBeenCalledOnce())
			expect(screen.getByTestId('route')).toHaveTextContent(before)
			expect(rememberShellRoute).toHaveBeenLastCalledWith(
				{ type: 'space', spaceId: from.split('/')[1] },
				`${from}?v=old#before`,
			)
		} finally {
			await act(async () => {
				release()
				await navigation
			})
		}
		const after = screen.getByTestId('route').textContent!
		expect(JSON.parse(after)).toEqual({
			scope: { type: 'space', spaceId: to.split('/')[1] },
			pageProjectId: to.split('/').at(-1),
			projectId: to.split('/').at(-1),
			fullPath: `${to}?v=new#after`,
			breadcrumb: '项目总览 > 项目详情',
		})
		expect(commits.every((snapshot) => snapshot === before || snapshot === after)).toBe(true)
		expect(rememberShellRoute).toHaveBeenLastCalledWith(
			{ type: 'space', spaceId: to.split('/')[1] },
			`${to}?v=new#after`,
		)
		await act(async () => {
			await router.navigate({ to: to as never, search: { v: 'new' } as never, hash: 'final' })
		})
		expect(JSON.parse(screen.getByTestId('route').textContent!)).toMatchObject({
			fullPath: `${to}?v=new#final`,
		})
	})
})

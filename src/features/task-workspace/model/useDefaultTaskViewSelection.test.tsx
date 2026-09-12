import { useLayoutEffect } from 'react'
import {
	Outlet,
	RouterProvider,
	createMemoryHistory,
	createRootRoute,
	createRoute,
	createRouter,
	useLocation,
} from '@tanstack/react-router'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { encodeFilterQueryToSearchParam, useListFilterSession } from '@/features/filter'
import type { FilterQuery } from '@/shared/types'
import { renderWithMatchedRoute } from '@/test/renderWithRouter'

import type { DefaultTaskView } from './defaultTaskViews'
import { useDefaultTaskViewSelection } from './useDefaultTaskViewSelection'

const OPTIONS: DefaultTaskView[] = [
	{ key: 'incomplete', label: '未完成', baseViewKey: 'active' },
	{ key: 'all', label: '全部', baseViewKey: 'all' },
]

describe('useDefaultTaskViewSelection', () => {
	it('同一交互切换选中项并清除 Draft，不提交混合查询', async () => {
		const draft = encodeFilterQueryToSearchParam(statusQuery('todo'))
		const commits: string[] = []
		await renderWithMatchedRoute(<SelectionProbe commits={commits} />, {
			initialEntry: `/tasks?f=${draft}`,
			path: '/tasks',
		})
		commits.length = 0

		fireEvent.click(screen.getByRole('button', { name: '全部' }))

		expect(screen.getByTestId('selected')).toHaveTextContent('all')
		expect(screen.getByTestId('filter-count')).toHaveTextContent('0')
		expect(screen.getByTestId('location')).not.toHaveTextContent('f=')
		expect(commits.every((snapshot) => snapshot === 'all:0')).toBe(true)
	})

	it.each(['default-options', 'saved-base'] as const)(
		'目标 loader 等待时，旧 %s 不得清除目标 v/f',
		async (cause) => {
			let release!: () => void
			const pending = new Promise<void>((resolve) => {
				release = resolve
			})
			const loader = vi.fn(() => pending)
			const draft = encodeFilterQueryToSearchParam(statusQuery('todo'))!
			const sourceDraft = encodeFilterQueryToSearchParam(statusQuery('doing'))!
			const targetSearch = { f: draft, ...(cause === 'default-options' ? { v: 'completed' } : {}) }
			const root = createRootRoute({ component: Outlet })
			const source = createRoute({
				getParentRoute: () => root,
				path: '/source',
				component: () => (
					<SelectionProbe base={cause === 'saved-base' ? statusQuery('todo') : undefined} />
				),
			})
			const target = createRoute({
				getParentRoute: () => root,
				path: '/target',
				loader,
				component: () => (
					<SelectionProbe
						base={statusQuery('doing')}
						options={[...OPTIONS, { key: 'completed', label: '已完成', baseViewKey: 'completed' }]}
					/>
				),
			})
			const router = createRouter({
				routeTree: root.addChildren([source, target]),
				history: createMemoryHistory({ initialEntries: [`/source?f=${sourceDraft}`] }),
				defaultPendingMs: 10000,
			})
			render(<RouterProvider router={router} />)
			await act(async () => {
				await router.load()
			})
			let navigation!: Promise<void>
			act(() => {
				navigation = router.navigate({
					to: '/target' as never,
					search: targetSearch as never,
				})
			})
			try {
				await waitFor(() => expect(loader).toHaveBeenCalled())
				expect(router.state.location.search).toEqual(targetSearch)
				expect(screen.getByTestId('selected')).toHaveTextContent('incomplete')
				expect(screen.getByTestId('filter-values')).toHaveTextContent('doing')
				fireEvent.click(screen.getByRole('button', { name: '恢复' }))
				expect(router.state.location.search).toEqual(targetSearch)
			} finally {
				await act(async () => {
					release()
					await navigation
				})
			}
			expect(router.state.location.pathname).toBe('/target')
			expect(router.state.location.search).toMatchObject({ f: draft })
			expect(screen.getByTestId('filter-count')).toHaveTextContent('1')
			expect(screen.getByTestId('filter-values')).toHaveTextContent('todo')
		},
	)

	it('当前页面矩阵不支持 URL v 时回到默认视图并删除 v 与 f', async () => {
		const draft = encodeFilterQueryToSearchParam({ clauses: [] })
		await renderWithMatchedRoute(<SelectionProbe />, {
			initialEntry: `/tasks?v=completed&f=${draft}`,
			path: '/tasks',
		})

		expect(screen.getByTestId('selected')).toHaveTextContent('incomplete')
		await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/tasks'))
		expect(screen.getByTestId('location')).not.toHaveTextContent('v=')
		expect(screen.getByTestId('location')).not.toHaveTextContent('f=')
	})
})

function SelectionProbe({
	base,
	options = OPTIONS,
	commits,
}: { base?: FilterQuery; options?: DefaultTaskView[]; commits?: string[] } = {}) {
	const location = useLocation()
	const selection = useDefaultTaskViewSelection({ options, defaultKey: 'incomplete' })
	const session = useListFilterSession({ base })
	useLayoutEffect(() => {
		commits?.push(`${selection.selectedKey}:${session.effective.clauses.length}`)
	})

	return (
		<>
			<output data-testid='selected'>{selection.selectedKey}</output>
			<output data-testid='filter-count'>{session.effective.clauses.length}</output>
			<output data-testid='filter-values'>
				{session.effective.clauses.flatMap((clause) => clause.values).join(',')}
			</output>
			<button type='button' onClick={() => session.clearTemp()}>
				恢复
			</button>
			<button
				type='button'
				onClick={() => {
					void selection.select('all')
				}}
			>
				全部
			</button>
			<output data-testid='location'>
				{location.pathname}
				{location.searchStr}
			</output>
		</>
	)
}

function statusQuery(status: string): FilterQuery {
	return { clauses: [{ id: 'status', field: 'status', op: 'is', values: [status] }] }
}

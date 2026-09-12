import { describe, expect, it } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import {
	Outlet,
	RouterProvider,
	createMemoryHistory,
	createRootRoute,
	createRoute,
	createRouter,
} from '@tanstack/react-router'
import { useDefaultTaskViewSelection } from '../../src/features/task-workspace/model/useDefaultTaskViewSelection'
import { parseTaskWorkspaceSearch } from '../../src/features/task-workspace/model/taskWorkspaceSearch'
import { useListFilterSession } from '../../src/features/filter/model/useListFilterSession'
import { createFilterClause } from '../../src/features/filter/core'
import { PageFrame } from '../../src/shared/components/page-frame'

const OPTIONS = [
	{ key: 'incomplete', label: '未完成', baseViewKey: 'active' },
	{ key: 'completed', label: '已完成', baseViewKey: 'completed' },
	{ key: 'all', label: '全部', baseViewKey: 'all' },
] as const
function Probe() {
	const selection = useDefaultTaskViewSelection({ options: [...OPTIONS], defaultKey: 'incomplete' })
	const session = useListFilterSession()
	return (
		<>
			<PageFrame.Toolbar
				pills={[...OPTIONS]}
				selectedKey={selection.selectedKey}
				onSelectionChange={selection.select}
			/>
			<output data-testid='selected'>{selection.selectedKey}</output>
			<output data-testid='filters'>{JSON.stringify(session.effective)}</output>
			<button
				onClick={() =>
					session.setTemp({
						clauses: [createFilterClause('status', 'is', ['todo'], 'audit-status')],
					})
				}
			>
				筛待执行
			</button>
			<button onClick={session.clearTemp}>保存后清除</button>
		</>
	)
}
async function setup() {
	const root = createRootRoute({ component: () => <Outlet /> })
	const scoped = createRoute({
		getParentRoute: () => root,
		path: '$scopeKey',
		component: () => <Outlet />,
	})
	const project = createRoute({
		getParentRoute: () => scoped,
		path: 'projects/$projectId',
		validateSearch: parseTaskWorkspaceSearch,
		component: Probe,
	})
	const router = createRouter({
		routeTree: root.addChildren([scoped.addChildren([project])]),
		history: createMemoryHistory({ initialEntries: ['/space-a/projects/project-a'] }),
	})
	render(<RouterProvider router={router} />)
	await act(() => router.load())
	return router
}
describe('Views 实际路由会话审计', () => {
	it('追加待执行后切换全部，应清除 f 并更换查询基线', async () => {
		const router = await setup()
		fireEvent.click(screen.getByRole('button', { name: '筛待执行' }))
		await waitFor(() => expect(screen.getByTestId('filters')).toHaveTextContent('todo'))
		fireEvent.click(screen.getByRole('radio', { name: '全部', exact: true }))
		await waitFor(() => expect(screen.getByTestId('selected')).toHaveTextContent('all'))
		expect(screen.getByTestId('filters')).not.toHaveTextContent('todo')
		expect(router.state.location.search).not.toHaveProperty('f')
	})
	it('保存成功后的 clearTemp 应恢复未完成原始查询', async () => {
		const router = await setup()
		fireEvent.click(screen.getByRole('button', { name: '筛待执行' }))
		await waitFor(() => expect(screen.getByTestId('filters')).toHaveTextContent('todo'))
		fireEvent.click(screen.getByRole('button', { name: '保存后清除' }))
		await waitFor(() => expect(screen.getByTestId('filters')).not.toHaveTextContent('todo'))
		expect(screen.getByTestId('selected')).toHaveTextContent('incomplete')
		expect(router.state.location.search).not.toHaveProperty('f')
	})
})

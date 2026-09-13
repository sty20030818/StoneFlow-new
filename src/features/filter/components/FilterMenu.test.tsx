import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'

import {
	createFilterClause,
	decodeFilterQueryFromSearchParam,
	encodeFilterQueryToSearchParam,
	type FilterQuery,
} from '@/features/filter/core'
import { ListFilterUiProvider } from '@/features/filter/model/ListFilterUiContext'
import { useListFilterSession } from '@/features/filter/model/useListFilterSession'
import { renderWithMatchedRoute } from '@/test/renderWithRouter'
import { TestInteractionProviders } from '@/test/TestInteractionProviders'

import { FilterBar } from './FilterBar'
import { PageFilterButton } from './PageFilterButton'

const EXCLUDED_STATUS = createFilterClause('status', 'is_not', ['waiting'], 'excluded-status')
const BOUNDARY = {
	scope: { type: 'space', spaceId: 'space-1' },
	context: { kind: 'project', projectId: 'project-1' },
	baseViewKey: 'active',
	spaceName: '工作空间',
	projectName: '项目甲',
} as const

describe('FilterMenu 的真实筛选会话', () => {
	it('clean 时检查完整边界与负向条件，Escape 关闭不创建 URL Draft', async () => {
		const base = { clauses: [EXCLUDED_STATUS] }
		const { router } = await renderFilterSession(base)
		const initialHref = router.state.location.href
		expect(screen.getByTestId('filter-dirty')).toHaveTextContent('false')
		expect(screen.queryByRole('button', { name: '恢复' })).not.toBeInTheDocument()

		const trigger = screen.getByRole('button', { name: '筛选' })
		fireEvent.click(trigger)
		await screen.findByRole('searchbox', { name: '筛选字段' })
		for (const [label, value] of [
			['范围', '工作空间'],
			['任务归属', '项目甲'],
			['默认视图', '未完成'],
		]) {
			const term = screen.getByText(label, { selector: 'dt' })
			expect(term.nextElementSibling).toHaveTextContent(value)
			expect(term.parentElement?.querySelector('button, input, select')).toBeNull()
		}
		const clause = screen.getByRole('group', { name: '状态筛选条件' })
		expect(within(clause).getByRole('button', { name: '筛选运算符' })).toHaveTextContent('不是')
		expect(within(clause).getByRole('button', { name: '筛选值 等待中' })).toBeInTheDocument()
		expect(router.state.location.href).toBe(initialHref)
		expect(readEffective()).toEqual(base)

		fireEvent.keyDown(screen.getByRole('searchbox', { name: '筛选字段' }), { key: 'Escape' })
		await waitFor(() => {
			expect(screen.queryByRole('searchbox', { name: '筛选字段' })).not.toBeInTheDocument()
			expect(trigger).toHaveFocus()
		})
		expect(router.state.location.href).toBe(initialHref)
		expect(readEffective()).toEqual(base)
		expect(screen.getByTestId('filter-dirty')).toHaveTextContent('false')
	})

	it('修改 is_not 的值即时写入 URL，不能取消唯一值，Escape 不回滚已应用修改', async () => {
		const { router } = await renderFilterSession({ clauses: [EXCLUDED_STATUS] })
		fireEvent.click(screen.getByRole('button', { name: '筛选' }))
		const clause = await screen.findByRole('group', { name: '状态筛选条件' })
		fireEvent.click(within(clause).getByRole('button', { name: '筛选值 等待中' }))
		const selected = await screen.findByRole('menuitemcheckbox', { name: '等待中' })
		const initialHref = router.state.location.href
		fireEvent.click(selected)
		expect(selected).toHaveAttribute('aria-checked', 'true')
		expect(router.state.location.href).toBe(initialHref)
		expect(readEffective()).toEqual({ clauses: [EXCLUDED_STATUS] })

		const option = screen.getByRole('menuitemcheckbox', { name: '进行中' })
		act(() => option.focus())
		fireEvent.keyDown(option, { key: 'Enter', code: 'Enter' })
		fireEvent.keyUp(option, { key: 'Enter', code: 'Enter' })
		const expected = { clauses: [{ ...EXCLUDED_STATUS, values: ['doing', 'waiting'] }] }
		await waitFor(() => expect(readRouterDraft(router)).toEqual(expected))
		expect(readEffective()).toEqual(expected)
		expect(screen.getByTestId('filter-dirty')).toHaveTextContent('true')
		expect(router.state.location.search).toMatchObject({ v: 'active', keep: 'yes' })
		const appliedHref = router.state.location.href

		fireEvent.keyDown(screen.getByRole('menu', { name: /^筛选值/ }), { key: 'Escape' })
		await waitFor(() =>
			expect(screen.queryByRole('menuitemcheckbox', { name: '进行中' })).not.toBeInTheDocument(),
		)
		fireEvent.keyDown(screen.getByRole('searchbox', { name: '筛选字段' }), { key: 'Escape' })
		await waitFor(() =>
			expect(screen.queryByRole('searchbox', { name: '筛选字段' })).not.toBeInTheDocument(),
		)
		expect(router.state.location.href).toBe(appliedHref)
		expect(readEffective()).toEqual(expected)
	})

	it('同字段的包含和排除条件按 ID 独立编辑，普通值选择保留另一条条件', async () => {
		const included = createFilterClause('status', 'is', ['todo', 'doing'], 'included-status')
		const { router } = await renderFilterSession({ clauses: [included, EXCLUDED_STATUS] })
		fireEvent.click(screen.getByRole('button', { name: '筛选' }))
		const clauses = await screen.findAllByRole('group', { name: '状态筛选条件' })
		expect(clauses).toHaveLength(2)
		const excluded = clauses.find((group) =>
			within(group).queryByRole('button', { name: '筛选值 等待中' }),
		)!
		fireEvent.click(within(excluded).getByRole('button', { name: '筛选值 等待中' }))
		fireEvent.click(await screen.findByRole('menuitemcheckbox', { name: '已取消' }))

		await waitFor(() => {
			const draft = readRouterDraft(router)
			expect(draft?.clauses).toHaveLength(2)
			expect(draft?.clauses.find((clause) => clause.id === included.id)).toEqual(included)
			expect(draft?.clauses.find((clause) => clause.id === EXCLUDED_STATUS.id)).toEqual({
				...EXCLUDED_STATUS,
				values: ['waiting', 'canceled'],
			})
		})
		expect(readEffective()).toEqual(readRouterDraft(router))
	})

	it('同字段同操作符的不同条件按 ID 独立编辑，不把两条条件合并', async () => {
		const first = createFilterClause('status', 'is', ['todo'], 'first-status')
		const second = createFilterClause('status', 'is', ['todo', 'doing'], 'second-status')
		const { router } = await renderFilterSession({ clauses: [first, second] })
		fireEvent.click(screen.getByRole('button', { name: '筛选' }))
		const clauses = await screen.findAllByRole('group', { name: '状态筛选条件' })
		expect(clauses).toHaveLength(2)
		const firstGroup = clauses.find((group) =>
			within(group).queryByRole('button', { name: '筛选值 待执行' }),
		)!
		fireEvent.click(within(firstGroup).getByRole('button', { name: '筛选值 待执行' }))
		fireEvent.click(await screen.findByRole('menuitemcheckbox', { name: '等待中' }))

		await waitFor(() => {
			const draft = readRouterDraft(router)
			expect(draft?.clauses).toHaveLength(2)
			expect(draft?.clauses.find((clause) => clause.id === first.id)).toEqual({
				...first,
				values: ['todo', 'waiting'],
			})
			expect(draft?.clauses.find((clause) => clause.id === second.id)).toEqual(second)
		})
		expect(readEffective()).toEqual(readRouterDraft(router))
	})

	it('添加菜单点击已有相同条件不绑定其 ID，继续选择只新增独立的 AND 条件', async () => {
		const original = createFilterClause('status', 'is', ['todo'], 'original-status')
		const base = { clauses: [original] }
		const { router } = await renderFilterSession(base)
		const initialHref = router.state.location.href
		fireEvent.click(screen.getByRole('button', { name: '筛选' }))
		const statusField = await screen.findByRole('menuitem', { name: '状态' })
		fireEvent.keyDown(statusField, { key: 'ArrowRight' })
		await toggleMenuCheckbox('待执行')
		expect(router.state.location.href).toBe(initialHref)
		expect(readEffective()).toEqual(base)
		await toggleMenuCheckbox('进行中')
		await waitFor(() => {
			const draft = readRouterDraft(router)
			expect(draft?.clauses).toHaveLength(2)
			expect(draft?.clauses.find((clause) => clause.id === original.id)).toEqual(original)
			expect(draft?.clauses.find((clause) => clause.id !== original.id)).toEqual({
				id: expect.any(String),
				field: 'status',
				op: 'is',
				values: ['doing'],
			})
		})
		expect(readEffective()).toEqual(readRouterDraft(router))
		const addedId = readRouterDraft(router)!.clauses.find((clause) => clause.id !== original.id)!.id
		await toggleMenuCheckbox('等待中')
		await waitFor(() => {
			const draft = readRouterDraft(router)
			expect(draft?.clauses).toHaveLength(2)
			expect(draft?.clauses.find((clause) => clause.id === original.id)).toEqual(original)
			expect(draft?.clauses.find((clause) => clause.id === addedId)).toEqual({
				id: addedId,
				field: 'status',
				op: 'is',
				values: ['doing', 'waiting'],
			})
		})
		const appliedHref = router.state.location.href
		const applied = readEffective()
		fireEvent.keyDown(screen.getByRole('menu', { name: '状态' }), { key: 'Escape' })
		await waitFor(() =>
			expect(screen.queryByRole('menuitemcheckbox', { name: '等待中' })).not.toBeInTheDocument(),
		)
		fireEvent.keyDown(screen.getByRole('searchbox', { name: '筛选字段' }), { key: 'Escape' })
		await waitFor(() =>
			expect(screen.queryByRole('searchbox', { name: '筛选字段' })).not.toBeInTheDocument(),
		)
		expect(router.state.location.href).toBe(appliedHref)
		expect(readEffective()).toEqual(applied)
	})

	it('从公式条菜单改回默认条件时卸载公式条，并把焦点还给稳定的页面入口', async () => {
		const base = { clauses: [EXCLUDED_STATUS] }
		const draft = { clauses: [{ ...EXCLUDED_STATUS, values: ['doing', 'waiting'] }] }
		const { router } = await renderFilterSession(base, draft)
		const stableTrigger = screen.getByRole('button', { name: '筛选' })
		const barTrigger = screen.getByRole('button', { name: '添加筛选' })
		fireEvent.click(barTrigger)
		const conditions = await screen.findByRole('region', { name: '当前筛选条件' })
		fireEvent.click(within(conditions).getByRole('button', { name: '筛选值 2 个状态' }))
		const option = await screen.findByRole('menuitemcheckbox', { name: '进行中' })
		act(() => option.focus())
		fireEvent.keyDown(option, { key: 'Enter', code: 'Enter' })
		fireEvent.keyUp(option, { key: 'Enter', code: 'Enter' })

		await waitFor(() => {
			expect(readRouterDraft(router)).toBeNull()
			expect(readEffective()).toEqual(base)
			expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
			expect(barTrigger).not.toBeInTheDocument()
			expect(screen.queryByRole('button', { name: '恢复' })).not.toBeInTheDocument()
			expect(stableTrigger).toHaveFocus()
		})
		expect(router.state.location.search).toEqual({ v: 'active', keep: 'yes' })
		expect(screen.getByTestId('filter-dirty')).toHaveTextContent('false')
	})

	it('公式条编辑后与另一条条件去重时，当前条件卸载但 Draft 保留且焦点回到页面入口', async () => {
		const retained = createFilterClause('status', 'is', ['doing'], 'retained-status')
		const edited = createFilterClause('status', 'is', ['todo', 'doing'], 'edited-status')
		const { router } = await renderFilterSession({ clauses: [] }, { clauses: [retained, edited] })
		const stableTrigger = screen.getByRole('button', { name: '筛选' })
		const editedGroup = screen
			.getAllByRole('group', { name: '状态筛选条件' })
			.find((group) => within(group).queryByRole('button', { name: '筛选值 2 个状态' }))!
		fireEvent.click(within(editedGroup).getByRole('button', { name: '筛选值 2 个状态' }))
		const option = await screen.findByRole('menuitemcheckbox', { name: '待执行' })
		act(() => option.focus())
		fireEvent.keyDown(option, { key: 'Enter', code: 'Enter' })
		fireEvent.keyUp(option, { key: 'Enter', code: 'Enter' })

		await waitFor(() => {
			expect(readRouterDraft(router)).toEqual({ clauses: [retained] })
			expect(readEffective()).toEqual({ clauses: [retained] })
			expect(editedGroup).not.toBeInTheDocument()
			expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
			expect(stableTrigger).toHaveFocus()
		})
		expect(screen.getByTestId('filter-dirty')).toHaveTextContent('true')
		expect(screen.getByRole('button', { name: '恢复' })).toBeInTheDocument()
	})

	it('两级搜索框的 ArrowDown 把焦点交给可见菜单项，检查过程不改变查询', async () => {
		const base = { clauses: [EXCLUDED_STATUS] }
		const { router } = await renderFilterSession(base)
		const initialHref = router.state.location.href
		fireEvent.click(screen.getByRole('button', { name: '筛选' }))
		const fieldSearch = await screen.findByRole('searchbox', { name: '筛选字段' })
		fireEvent.change(fieldSearch, { target: { value: '状态' } })
		act(() => fieldSearch.focus())
		fireEvent.keyDown(fieldSearch, { key: 'ArrowDown' })
		const statusField = screen.getByRole('menuitem', { name: '状态' })
		await waitFor(() => expect(statusField).toHaveFocus())

		fireEvent.keyDown(statusField, { key: 'ArrowRight' })
		const valueSearch = await screen.findByRole('searchbox', { name: '状态 筛选' })
		fireEvent.change(valueSearch, { target: { value: '进行中' } })
		act(() => valueSearch.focus())
		fireEvent.keyDown(valueSearch, { key: 'ArrowDown' })
		await waitFor(() =>
			expect(screen.getByRole('menuitemcheckbox', { name: '进行中' })).toHaveFocus(),
		)
		expect(router.state.location.href).toBe(initialHref)
		expect(readEffective()).toEqual(base)
	})
})

// 菜单测试停在真实 Router 与 session.effective；任务成员由 SQLite 查询测试验证。
function renderFilterSession(base: FilterQuery, draft?: FilterQuery) {
	function Fixture() {
		const session = useListFilterSession({ base })
		const value = { session, boundary: BOUNDARY }
		return (
			<ListFilterUiProvider value={value}>
				<PageFilterButton />
				<FilterBar />
				<output data-testid='filter-dirty'>{String(session.dirty)}</output>
				<output data-testid='filter-effective'>{JSON.stringify(session.effective)}</output>
			</ListFilterUiProvider>
		)
	}
	const search = new URLSearchParams({ v: 'active', keep: 'yes' })
	if (draft) search.set('f', encodeFilterQueryToSearchParam(draft)!)
	return renderWithMatchedRoute(<Fixture />, {
		initialEntry: `/tasks?${search}`,
		path: '/tasks',
		wrap: (children) => <TestInteractionProviders>{children}</TestInteractionProviders>,
	})
}

function readEffective(): FilterQuery {
	return JSON.parse(screen.getByTestId('filter-effective').textContent!) as FilterQuery
}

async function toggleMenuCheckbox(label: string) {
	const option = await screen.findByRole('menuitemcheckbox', { name: label })
	const checkbox = option.querySelector('[data-slot="checkbox"]')!
	fireEvent.pointerDown(checkbox, { pointerType: 'mouse', button: 0 })
	fireEvent.click(checkbox)
}

function readRouterDraft(router: Awaited<ReturnType<typeof renderFilterSession>>['router']) {
	const search = router.state.location.search as Record<string, unknown>
	return decodeFilterQueryFromSearchParam(typeof search.f === 'string' ? search.f : null)
}

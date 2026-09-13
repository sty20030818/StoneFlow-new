import { useState } from 'react'
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'

import { createFilterClause, EMPTY_FILTER_QUERY, type FilterQuery } from '@/features/filter/core'
import { ListFilterUiProvider } from '@/features/filter/model/ListFilterUiContext'
import { renderWithInteractionProviders } from '@/test/TestInteractionProviders'

import { FilterBar } from './FilterBar'
import { PageFilterButton } from './PageFilterButton'

describe('FilterBar', () => {
	it('保存入口调用外部打开动作并保留当前 Draft', () => {
		const onSave = vi.fn()
		const { clearTemp, replaceEffective } = renderFilterBar({ onSave })
		fireEvent.click(screen.getByRole('button', { name: '保存' }))

		expect(onSave).toHaveBeenCalledOnce()
		expect(clearTemp).not.toHaveBeenCalled()
		expect(replaceEffective).not.toHaveBeenCalled()
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
	})

	it('每个条件独立分组，字段只读，运算符、值和删除各自可操作', () => {
		renderFilterBar()

		for (const name of ['状态', '优先级']) {
			const group = screen.getByRole('group', { name: `${name}筛选条件` })
			const field = within(group).getByText(name, { exact: true })
			const operator = within(group).getByRole('button', { name: '筛选运算符' })

			expect(field.closest('button, [role="button"]')).toBeNull()
			expect(field.tabIndex).toBe(-1)
			act(() => operator.focus())
			act(() => field.focus())
			expect(operator).toHaveFocus()
			expect(within(group).getByRole('button', { name: /^筛选值 / })).toBeEnabled()
			expect(within(group).getByRole('button', { name: '删除筛选条件' })).toBeEnabled()
		}
	})

	it('分段编辑即时更新当前条件，保留其他条件，恢复只清除临时筛选', async () => {
		const { replaceEffective, clearTemp, status, priority } = renderFilterBar()
		const statusGroup = () => screen.getByRole('group', { name: '状态筛选条件' })

		fireEvent.click(within(statusGroup()).getByRole('button', { name: '筛选运算符' }))
		fireEvent.click(await screen.findByRole('menuitemradio', { name: '不是' }))
		expect(replaceEffective).toHaveBeenLastCalledWith({
			clauses: [{ ...status, op: 'is_not' }, priority],
		})

		const valuesTrigger = within(statusGroup()).getByRole('button', { name: '筛选值 待执行' })
		fireEvent.click(valuesTrigger)
		const selectedOption = await screen.findByRole('menuitemcheckbox', { name: '待执行' })
		const selectedCheckbox = selectedOption.querySelector('[data-slot="checkbox"]')!
		fireEvent.pointerDown(selectedCheckbox)
		fireEvent.click(selectedCheckbox)
		expect(replaceEffective).toHaveBeenCalledOnce()
		expect(selectedOption).toHaveAttribute('aria-checked', 'true')

		fireEvent.click(await screen.findByRole('menuitemcheckbox', { name: '进行中' }))
		expect(replaceEffective).toHaveBeenCalledTimes(2)
		expect(replaceEffective).toHaveBeenLastCalledWith({
			clauses: [{ ...status, op: 'is_not', values: ['todo', 'doing'] }, priority],
		})
		expect(valuesTrigger).toHaveAccessibleName('筛选值 2 个状态')
		expect(valuesTrigger).toHaveTextContent(/^2 个状态$/)
		const valuesMenu = screen.getByRole('menu', { name: '筛选值 2 个状态' })
		expect(valuesMenu).toBeInTheDocument()
		for (const name of ['待执行', '进行中']) {
			expect(within(valuesMenu).getByRole('menuitemcheckbox', { name })).toHaveAttribute(
				'aria-checked',
				'true',
			)
		}

		fireEvent.click(within(valuesMenu).getByRole('menuitemcheckbox', { name: '进行中' }))
		expect(replaceEffective).toHaveBeenCalledTimes(3)
		expect(replaceEffective).toHaveBeenLastCalledWith({
			clauses: [{ ...status, op: 'is_not' }, priority],
		})
		expect(valuesTrigger).toHaveAccessibleName('筛选值 待执行')
		expect(valuesTrigger).toHaveTextContent('待执行')

		fireEvent.keyDown(valuesMenu, { key: 'Escape' })
		await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument())
		fireEvent.click(within(statusGroup()).getByRole('button', { name: '删除筛选条件' }))
		expect(replaceEffective).toHaveBeenLastCalledWith({ clauses: [priority] })
		expect(screen.queryByRole('group', { name: '状态筛选条件' })).not.toBeInTheDocument()
		expect(screen.getByRole('button', { name: '筛选' })).toHaveFocus()
		expect(screen.getByRole('group', { name: '优先级筛选条件' })).toBeInTheDocument()

		fireEvent.click(screen.getByRole('button', { name: '恢复' }))
		expect(clearTemp).toHaveBeenCalledOnce()
		expect(screen.queryByRole('group', { name: '优先级筛选条件' })).not.toBeInTheDocument()
		expect(screen.queryByRole('button', { name: '恢复' })).not.toBeInTheDocument()
		expect(screen.getByRole('button', { name: '筛选' })).toHaveFocus()
	})
})

function renderFilterBar({ onSave }: { onSave?: () => void } = {}) {
	const status = createFilterClause('status', 'is', ['todo'], 'status-filter')
	const priority = createFilterClause('priority', 'is', ['3'], 'priority-filter')
	const replaceEffective = vi.fn()
	const clearTemp = vi.fn()

	function Fixture() {
		const [query, setQuery] = useState<FilterQuery>({ clauses: [status, priority] })

		return (
			<ListFilterUiProvider
				value={{
					boundary: { scope: { type: 'all' }, context: { kind: 'all' }, baseViewKey: 'all' },
					onSave,
					session: {
						base: EMPTY_FILTER_QUERY,
						temp: query,
						effective: query,
						dirty: query.clauses.length > 0,
						isEmpty: query.clauses.length === 0,
						setTemp: setQuery,
						replaceEffective: (next) => {
							replaceEffective(next)
							setQuery(next)
						},
						clearTemp: () => {
							clearTemp()
							setQuery(EMPTY_FILTER_QUERY)
						},
					},
				}}
			>
				<PageFilterButton />
				<FilterBar />
			</ListFilterUiProvider>
		)
	}

	renderWithInteractionProviders(<Fixture />)
	return { replaceEffective, clearTemp, status, priority }
}

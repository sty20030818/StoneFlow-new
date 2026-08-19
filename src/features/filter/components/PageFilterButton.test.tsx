import { act, fireEvent, screen, waitFor } from '@testing-library/react'

import { createFilterClause, normalizeFilterQuery } from '@/features/filter/core'
import {
	ListFilterUiProvider,
	type ListFilterUiValue,
} from '@/features/filter/model/ListFilterUiContext'
import { renderWithInteractionProviders } from '@/test/TestInteractionProviders'

import { FilterBar } from './FilterBar'
import { PageFilterButton } from './PageFilterButton'

describe('filter entry points', () => {
	it('缺少 ListFilterUiProvider 时立即暴露装配错误', () => {
		expect(() => renderWithInteractionProviders(<PageFilterButton />)).toThrow(
			'useListFilterUi 必须在 ListFilterUiProvider 内使用',
		)
	})

	it('页面入口保留稳定操作名与快捷键', async () => {
		renderFilterEntry(<PageFilterButton />)

		const trigger = screen.getByRole('button', { name: '筛选' })
		fireEvent.keyDown(document, { key: 'Tab' })
		act(() => trigger.focus())

		const tooltip = await screen.findByRole('tooltip')
		expect(tooltip).toHaveTextContent('筛选F')
		expect(tooltip).not.toHaveTextContent('已启用')
	})

	it('公式条打开筛选菜单时关闭 trigger 提示', async () => {
		renderFilterEntry(<FilterBar />)

		const trigger = screen.getByRole('button', { name: '添加筛选' })
		fireEvent.keyDown(document, { key: 'Tab' })
		act(() => trigger.focus())
		expect(await screen.findByRole('tooltip')).toHaveTextContent('添加筛选')

		fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false })
		expect(await screen.findByRole('textbox', { name: '筛选字段' })).toBeInTheDocument()
		await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument())
	})
})

function renderFilterEntry(ui: React.ReactNode) {
	const query = normalizeFilterQuery({
		clauses: [createFilterClause('status', 'is', ['todo'], 'status-filter')],
	})
	const value: ListFilterUiValue = {
		session: {
			base: query,
			temp: query,
			effective: query,
			dirty: true,
			isEmpty: false,
			setTemp: vi.fn(),
			clearTemp: vi.fn(),
			replaceEffective: vi.fn(),
		},
	}

	return renderWithInteractionProviders(
		<ListFilterUiProvider value={value}>{ui}</ListFilterUiProvider>,
	)
}

import { fireEvent, screen, waitFor } from '@testing-library/react'

import { createFilterClause, normalizeFilterQuery } from '@/features/filter/core'
import {
	ListFilterUiProvider,
	type ListFilterUiValue,
} from '@/features/filter/model/ListFilterUiContext'
import type { ListFilterSession } from '@/features/filter/model/useListFilterSession'
import { renderWithInteractionProviders } from '@/test/TestInteractionProviders'

import { FilterBar } from './FilterBar'

describe('FilterBar', () => {
	it('打开筛选菜单时关闭添加筛选提示', async () => {
		const query = normalizeFilterQuery({
			clauses: [createFilterClause('status', 'is', ['todo'], 'status-filter')],
		})
		const session: ListFilterSession = {
			base: query,
			temp: query,
			effective: query,
			dirty: true,
			isEmpty: false,
			setTemp: vi.fn(),
			clearTemp: vi.fn(),
			replaceEffective: vi.fn(),
		}
		const value: ListFilterUiValue = { session }

		renderWithInteractionProviders(
			<ListFilterUiProvider value={value}>
				<FilterBar />
			</ListFilterUiProvider>,
		)

		const trigger = screen.getByRole('button', { name: '添加筛选' })
		fireEvent.keyDown(document, { key: 'Tab' })
		trigger.focus()
		expect(await screen.findByRole('tooltip')).toHaveTextContent('添加筛选')

		fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false })
		expect(await screen.findByRole('textbox', { name: '筛选字段' })).toBeInTheDocument()
		await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument())
	})
})

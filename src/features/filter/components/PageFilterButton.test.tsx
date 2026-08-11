/** @vitest-environment jsdom */
import { fireEvent, screen } from '@testing-library/react'

import { createFilterClause, normalizeFilterQuery } from '@/features/filter/core'
import {
	ListFilterUiProvider,
	type ListFilterUiValue,
} from '@/features/filter/model/ListFilterUiContext'
import type { ListFilterSession } from '@/features/filter/model/useListFilterSession'
import { renderWithInteractionProviders } from '@/test/TestInteractionProviders'

import { PageFilterButton } from './PageFilterButton'

describe('PageFilterButton', () => {
	it('缺少 ListFilterUiProvider 时立即暴露装配错误', () => {
		expect(() => renderWithInteractionProviders(<PageFilterButton />)).toThrow(
			'useListFilterUi 必须在 ListFilterUiProvider 内使用',
		)
	})

	it('已有筛选时仍显示稳定的操作名称和快捷键', async () => {
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
				<PageFilterButton />
			</ListFilterUiProvider>,
		)

		const trigger = screen.getByRole('button', { name: '筛选' })
		fireEvent.focus(trigger)

		const tooltip = await screen.findByRole('tooltip')
		expect(tooltip).toHaveTextContent('筛选F')
		expect(tooltip).not.toHaveTextContent('已启用')
	})
})

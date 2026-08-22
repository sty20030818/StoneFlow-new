import { useLocation } from '@tanstack/react-router'
import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { encodeFilterQueryToSearchParam } from '@/features/filter'
import { renderWithMatchedRoute } from '@/test/renderWithRouter'

import type { DefaultTaskView } from './defaultTaskViews'
import { useDefaultTaskViewSelection } from './useDefaultTaskViewSelection'

const OPTIONS: DefaultTaskView[] = [
	{ key: 'incomplete', label: '未完成', baseViewKey: 'active' },
	{ key: 'all', label: '全部', baseViewKey: 'all' },
]

describe('useDefaultTaskViewSelection', () => {
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

function SelectionProbe() {
	const location = useLocation()
	const selection = useDefaultTaskViewSelection({ options: OPTIONS, defaultKey: 'incomplete' })

	return (
		<>
			<output data-testid='selected'>{selection.selectedKey}</output>
			<output data-testid='location'>
				{location.pathname}
				{location.searchStr}
			</output>
		</>
	)
}

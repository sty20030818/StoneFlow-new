import { useState } from 'react'
import { fireEvent, screen } from '@testing-library/react'

import { createFilterClause } from '@/features/filter/core'
import { renderWithInteractionProviders } from '@/test/TestInteractionProviders'

import { FilterClauseEditor } from './FilterClauseEditor'

it('普通项目值编辑保留目录缺失的已选项目，并提供明确取消入口', async () => {
	const original = createFilterClause('project', 'is_not', ['missing-project'], 'project-clause')
	const onUpdate = vi.fn()
	function Fixture() {
		const [clause, setClause] = useState(original)
		return (
			<FilterClauseEditor
				clause={clause}
				onRemove={vi.fn()}
				onUpdate={(next) => {
					onUpdate(next)
					setClause(next)
				}}
				projects={[{ id: 'known-project', name: '项目甲' }]}
			/>
		)
	}
	renderWithInteractionProviders(<Fixture />)
	fireEvent.click(screen.getByRole('button', { name: '筛选值 missing-project' }))
	const missing = await screen.findByRole('menuitemcheckbox', { name: 'missing-project' })
	expect(missing).toHaveAttribute('aria-checked', 'true')
	fireEvent.click(screen.getByRole('menuitemcheckbox', { name: '项目甲' }))
	expect(onUpdate).toHaveBeenLastCalledWith({
		...original,
		values: ['known-project', 'missing-project'],
	})
	fireEvent.click(missing)
	expect(onUpdate).toHaveBeenLastCalledWith({ ...original, values: ['known-project'] })
})

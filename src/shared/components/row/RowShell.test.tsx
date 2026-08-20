import { render, screen } from '@testing-library/react'

import { RowShell } from '@/shared/components/row'

describe('RowShell', () => {
	it('interactive 行提供可由 roving focus 管理的按钮语义', () => {
		render(<RowShell interactive>interactive row</RowShell>)

		expect(screen.getByRole('button', { name: 'interactive row' })).toHaveAttribute(
			'tabindex',
			'-1',
		)
	})
})

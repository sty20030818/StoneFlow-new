import { render } from '@testing-library/react'

import { PriorityIcon } from './PriorityIcon'

describe('PriorityIcon', () => {
	it('紧急优先级使用实心 danger 语义色', () => {
		const { container } = render(<PriorityIcon priority={4} />)

		expect(container.querySelector('svg')).toHaveClass('text-danger')
	})
})

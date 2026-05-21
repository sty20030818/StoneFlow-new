import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { TaskLabelsSection } from './TaskLabelsSection'

describe('TaskLabelsSection', () => {
	it('只渲染标签预留入口', () => {
		render(<TaskLabelsSection />)

		expect(screen.getByRole('heading', { name: '标签' })).toBeInTheDocument()
		expect(screen.getByRole('button', { name: '添加标签' })).toBeDisabled()
		expect(screen.getByRole('button', { name: '添加标签' })).toHaveAttribute(
			'data-variant',
			'outline',
		)
	})
})

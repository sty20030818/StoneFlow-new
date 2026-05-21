import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { TaskLinksSection } from './TaskLinksSection'

describe('TaskLinksSection', () => {
	it('只渲染链接占位入口', () => {
		render(<TaskLinksSection />)

		expect(screen.getByRole('heading', { name: '链接' })).toBeInTheDocument()
		expect(screen.getByRole('button', { name: '添加链接' })).toHaveAttribute(
			'data-variant',
			'outline',
		)
	})
})

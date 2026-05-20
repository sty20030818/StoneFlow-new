/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react'

import { DetailSaveStatus } from './DetailSaveStatus'

describe('DetailSaveStatus', () => {
	it('idle 不显示状态文案', () => {
		const { container } = render(<DetailSaveStatus status='idle' />)

		expect(container).toBeEmptyDOMElement()
	})

	it('dirty 显示 Edited', () => {
		render(<DetailSaveStatus status='dirty' />)

		expect(screen.getByText('Edited').closest('[data-detail-save-status]')).toHaveAttribute(
			'data-detail-save-status',
			'dirty',
		)
	})

	it('scheduled 与 saving 显示 Saving...', () => {
		const { rerender } = render(<DetailSaveStatus status='scheduled' />)

		expect(screen.getByText('Saving...').closest('[data-detail-save-status]')).toHaveAttribute(
			'data-detail-save-status',
			'scheduled',
		)

		rerender(<DetailSaveStatus status='saving' />)

		expect(screen.getByText('Saving...').closest('[data-detail-save-status]')).toHaveAttribute(
			'data-detail-save-status',
			'saving',
		)
	})

	it('saved 显示 Saved', () => {
		render(<DetailSaveStatus status='saved' />)

		expect(screen.getByText('Saved').closest('[data-detail-save-status]')).toHaveAttribute(
			'data-detail-save-status',
			'saved',
		)
	})

	it('failed 显示 Save failed 和错误信息', () => {
		render(<DetailSaveStatus error='network' status='failed' />)

		expect(screen.getByText('Save failed').closest('[data-detail-save-status]')).toHaveAttribute(
			'data-detail-save-status',
			'failed',
		)
		expect(screen.getByText('network')).toBeInTheDocument()
		expect(screen.queryByRole('button')).not.toBeInTheDocument()
	})
})

/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react'

import { DetailSaveStatus } from './DetailSaveStatus'

describe('DetailSaveStatus', () => {
	it('空闲状态不显示状态文案', () => {
		const { container } = render(<DetailSaveStatus status='idle' />)

		expect(container).toBeEmptyDOMElement()
	})

	it('已修改状态显示已编辑', () => {
		render(<DetailSaveStatus status='dirty' />)

		expect(screen.getByText('已编辑').closest('[data-detail-save-status]')).toHaveAttribute(
			'data-detail-save-status',
			'dirty',
		)
	})

	it('已排程与保存中状态显示保存中', () => {
		const { rerender } = render(<DetailSaveStatus status='scheduled' />)

		expect(screen.getByText('保存中...').closest('[data-detail-save-status]')).toHaveAttribute(
			'data-detail-save-status',
			'scheduled',
		)

		rerender(<DetailSaveStatus status='saving' />)

		expect(screen.getByText('保存中...').closest('[data-detail-save-status]')).toHaveAttribute(
			'data-detail-save-status',
			'saving',
		)
	})

	it('已保存状态显示已保存', () => {
		render(<DetailSaveStatus status='saved' />)

		expect(screen.getByText('已保存').closest('[data-detail-save-status]')).toHaveAttribute(
			'data-detail-save-status',
			'saved',
		)
	})

	it('失败状态显示保存失败和错误信息', () => {
		render(<DetailSaveStatus error='网络错误' status='failed' />)

		expect(screen.getByText('保存失败').closest('[data-detail-save-status]')).toHaveAttribute(
			'data-detail-save-status',
			'failed',
		)
		expect(screen.getByText('网络错误')).toBeInTheDocument()
		expect(screen.queryByRole('button')).not.toBeInTheDocument()
	})
})

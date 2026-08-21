import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { PageFrame } from './PageFrame'

describe('PageFrame', () => {
	it('统一页头、工具条操作和普通滚动主体', () => {
		const onPress = vi.fn()
		render(
			<PageFrame.Root>
				<PageFrame.Header actions={<button type='button'>页级操作</button>} title='页面标题' />
				<PageFrame.Toolbar pills={[{ label: '进行中', active: true, onPress }]} />
				<PageFrame.Body>页面主体</PageFrame.Body>
			</PageFrame.Root>,
		)

		expect(screen.getByRole('heading', { name: '页面标题' })).toBeInTheDocument()
		expect(screen.getByRole('button', { name: '页级操作' })).toBeInTheDocument()
		const pill = screen.getByRole('button', { name: '进行中' })
		expect(screen.getByRole('group', { name: '页面筛选' })).toContainElement(pill)
		expect(pill).toHaveAttribute('aria-pressed', 'true')
		expect(pill).not.toHaveAttribute('aria-current')
		fireEvent.click(pill)
		expect(onPress).toHaveBeenCalledOnce()
		expect(screen.getByText('页面主体').closest('[data-scroll-container="true"]')).not.toBeNull()
	})

	it('虚拟列表主体只提供一个真实滚动 viewport', () => {
		const { container } = render(
			<PageFrame.Root>
				<PageFrame.VirtualizedBody>虚拟列表</PageFrame.VirtualizedBody>
			</PageFrame.Root>,
		)

		const viewports = container.querySelectorAll('[data-scroll-container="true"]')
		expect(viewports).toHaveLength(1)
		expect(screen.getByText('虚拟列表')).toBeInTheDocument()
	})
})

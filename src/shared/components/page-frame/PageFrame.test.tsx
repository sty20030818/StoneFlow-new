import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { PageFrame } from './PageFrame'

function EmptyFilterBar() {
	return null
}

describe('PageFrame', () => {
	it('统一页头、工具条操作和普通滚动主体', () => {
		const onPress = vi.fn()
		render(
			<PageFrame.Root>
				<PageFrame.Header actions={<button type='button'>页级操作</button>} title='页面标题' />
				<PageFrame.Toolbar
					pills={[
						{ label: '进行中', active: true },
						{ label: '待执行', onPress },
					]}
				/>
				<PageFrame.Body>页面主体</PageFrame.Body>
			</PageFrame.Root>,
		)

		expect(screen.getByRole('heading', { name: '页面标题' })).toBeInTheDocument()
		const pageAction = screen.getByRole('button', { name: '页级操作' })
		expect(pageAction.closest('header')).toHaveClass('h-11', 'px-2')
		const pill = screen.getByRole('radio', { name: '进行中' })
		const inactivePill = screen.getByRole('radio', { name: '待执行' })
		const toolbarGroup = screen.getByRole('radiogroup', { name: '页面筛选' })
		expect(toolbarGroup.parentElement?.parentElement).toHaveClass('px-2', 'py-2')
		expect(toolbarGroup.parentElement).not.toHaveClass('min-h-8')
		expect(toolbarGroup).toContainElement(pill)
		expect(pill).toHaveClass('toggle-button--ghost')
		expect(inactivePill).toHaveClass('toggle-button--ghost')
		expect(pill).toHaveAttribute('data-page-toolbar-option', 'true')
		expect(pill).toHaveAttribute('data-selected', 'true')
		expect(toolbarGroup.closest('.surface')).toHaveClass('surface--default')
		expect(toolbarGroup.closest('.surface')).not.toHaveClass('surface--secondary')
		expect(pill).toHaveAttribute('aria-checked', 'true')
		expect(inactivePill).toHaveAttribute('aria-checked', 'false')
		expect(pill).not.toHaveAttribute('aria-current')
		fireEvent.click(inactivePill)
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

	it('空筛选条不占用工具条纵向间隔', () => {
		render(<PageFrame.Toolbar filterBar={<EmptyFilterBar />} pills={[{ label: '所有任务' }]} />)

		const toolbarGroup = screen.getByRole('radiogroup', { name: '页面筛选' })
		expect(screen.getByRole('radio', { name: '所有任务' })).toHaveAttribute('data-selected', 'true')
		const toolbarLayout = toolbarGroup.parentElement?.parentElement
		const emptyFilterBarSlot = toolbarLayout?.lastElementChild
		expect(emptyFilterBarSlot).toBeEmptyDOMElement()
		expect(emptyFilterBarSlot).toHaveClass('empty:hidden')
	})
})

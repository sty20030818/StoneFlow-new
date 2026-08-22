import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { PageFrame } from './PageFrame'

function EmptyFilterBar() {
	return null
}

describe('PageFrame', () => {
	it('统一页头、工具条操作和普通滚动主体', () => {
		render(
			<PageFrame.Root>
				<PageFrame.Header actions={<button type='button'>页级操作</button>} title='页面标题' />
				<PageFrame.Toolbar
					pills={[
						{ key: 'doing', label: '进行中' },
						{ key: 'todo', label: '待执行' },
					]}
					selectedKey='doing'
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
		expect(screen.getByText('页面主体').closest('[data-scroll-container="true"]')).not.toBeNull()
	})

	it('外部 canonical 选择延迟回写时仍立即反馈新选项', async () => {
		let finishNavigation: (() => void) | undefined
		const onSelectionChange = vi.fn(
			() =>
				new Promise<void>((resolve) => {
					finishNavigation = resolve
				}),
		)
		const pills = [
			{ key: 'doing', label: '进行中' },
			{ key: 'todo', label: '待执行' },
			{ key: 'waiting', label: '等待中' },
		]
		const { rerender } = render(
			<PageFrame.Toolbar onSelectionChange={onSelectionChange} pills={pills} selectedKey='doing' />,
		)

		const doing = screen.getByRole('radio', { name: '进行中' })
		const todo = screen.getByRole('radio', { name: '待执行' })
		act(() => todo.focus())
		fireEvent.click(todo)

		expect(onSelectionChange).toHaveBeenCalledOnce()
		expect(onSelectionChange).toHaveBeenCalledWith('todo')
		expect(todo).toHaveAttribute('data-selected', 'true')
		expect(todo).toHaveFocus()
		expect(doing).toHaveAttribute('aria-checked', 'false')

		rerender(
			<PageFrame.Toolbar
				onSelectionChange={onSelectionChange}
				pills={pills}
				selectedKey='waiting'
			/>,
		)
		expect(screen.getByRole('radio', { name: '等待中' })).toHaveAttribute('data-selected', 'true')
		expect(screen.getByRole('radio', { name: '待执行' })).toHaveAttribute('aria-checked', 'false')
		expect(todo).toHaveFocus()

		rerender(
			<PageFrame.Toolbar onSelectionChange={onSelectionChange} pills={pills} selectedKey='doing' />,
		)
		expect(screen.getByRole('radio', { name: '进行中' })).toHaveAttribute('data-selected', 'true')
		expect(screen.getByRole('radio', { name: '待执行' })).toHaveAttribute('aria-checked', 'false')
		await act(async () => {
			finishNavigation?.()
			await Promise.resolve()
		})
	})

	it('选择导航未回写 canonical 时回退且不丢焦点', async () => {
		let finishNavigation: (() => void) | undefined
		const onSelectionChange = vi.fn(
			() =>
				new Promise<void>((resolve) => {
					finishNavigation = resolve
				}),
		)
		const pills = [
			{ key: 'doing', label: '进行中' },
			{ key: 'todo', label: '待执行' },
		]
		render(
			<PageFrame.Toolbar onSelectionChange={onSelectionChange} pills={pills} selectedKey='doing' />,
		)

		const doing = screen.getByRole('radio', { name: '进行中' })
		const todo = screen.getByRole('radio', { name: '待执行' })
		act(() => todo.focus())
		fireEvent.click(todo)
		expect(todo).toHaveAttribute('data-selected', 'true')

		await act(async () => {
			finishNavigation?.()
			await Promise.resolve()
		})
		await waitFor(() => expect(doing).toHaveAttribute('data-selected', 'true'))
		expect(todo).toHaveFocus()
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
		render(
			<PageFrame.Toolbar
				filterBar={<EmptyFilterBar />}
				pills={[{ key: 'all', label: '所有任务' }]}
				selectedKey='all'
			/>,
		)

		const toolbarGroup = screen.getByRole('radiogroup', { name: '页面筛选' })
		expect(screen.getByRole('radio', { name: '所有任务' })).toHaveAttribute('data-selected', 'true')
		const toolbarLayout = toolbarGroup.parentElement?.parentElement
		const emptyFilterBarSlot = toolbarLayout?.lastElementChild
		expect(emptyFilterBarSlot).toBeEmptyDOMElement()
		expect(emptyFilterBarSlot).toHaveClass('empty:hidden')
	})
})

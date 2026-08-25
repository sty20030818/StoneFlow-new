import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Button } from '@heroui/react'
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
		const toolbar = screen.getByRole('toolbar', { name: '页面工具栏' })
		const toolbarGroup = screen.getByRole('radiogroup', { name: '页面筛选' })
		expect(toolbar.parentElement).toHaveClass('px-2', 'py-2')
		expect(toolbar).toHaveAttribute('aria-orientation', 'horizontal')
		expect(toolbar).toContainElement(toolbarGroup)
		expect(toolbarGroup).toContainElement(pill)
		expect(pill).toHaveAttribute('data-selected', 'true')
		expect(pill).toHaveAttribute('aria-checked', 'true')
		expect(inactivePill).toHaveAttribute('aria-checked', 'false')
		expect(pill).not.toHaveAttribute('aria-current')
		expect(screen.getByText('页面主体').closest('[data-scroll-container="true"]')).not.toBeNull()
	})

	it('水平工具条用方向键贯通默认视图、筛选和显示操作，并保留标准激活键', async () => {
		const onSelectionChange = vi.fn()
		const onFilter = vi.fn()
		const onDisplay = vi.fn()
		render(
			<PageFrame.Toolbar
				displayAction={<Button onPress={onDisplay}>显示</Button>}
				filterAction={<Button onPress={onFilter}>筛选</Button>}
				onSelectionChange={onSelectionChange}
				pills={[
					{ key: 'doing', label: '进行中' },
					{ key: 'todo', label: '待执行' },
				]}
				selectedKey='doing'
			/>,
		)

		const doing = screen.getByRole('radio', { name: '进行中' })
		const todo = screen.getByRole('radio', { name: '待执行' })
		const filter = screen.getByRole('button', { name: '筛选' })
		const display = screen.getByRole('button', { name: '显示' })

		act(() => doing.focus())
		fireEvent.keyDown(doing, { key: 'ArrowRight' })
		expect(todo).toHaveFocus()
		expect(doing).toHaveAttribute('aria-checked', 'true')

		await act(async () => {
			fireEvent.keyDown(todo, { key: 'Enter' })
			fireEvent.keyUp(todo, { key: 'Enter' })
			await Promise.resolve()
		})
		expect(onSelectionChange).toHaveBeenCalledWith('todo')

		fireEvent.keyDown(todo, { key: 'ArrowRight' })
		expect(filter).toHaveFocus()
		fireEvent.keyDown(filter, { key: 'Enter' })
		fireEvent.keyUp(filter, { key: 'Enter' })
		expect(onFilter).toHaveBeenCalledOnce()

		fireEvent.keyDown(filter, { key: 'ArrowRight' })
		expect(display).toHaveFocus()
		fireEvent.keyDown(display, { key: ' ' })
		fireEvent.keyUp(display, { key: ' ' })
		expect(onDisplay).toHaveBeenCalledOnce()

		fireEvent.keyDown(display, { key: 'ArrowLeft' })
		expect(filter).toHaveFocus()
	})

	it('默认视图始终保持一个受控选项，非法 canonical key 回退到首项', () => {
		const pills = [
			{ key: 'doing', label: '进行中' },
			{ key: 'todo', label: '待执行' },
		]
		const { rerender } = render(<PageFrame.Toolbar pills={pills} selectedKey='doing' />)

		fireEvent.click(screen.getByRole('radio', { name: '进行中' }))
		expect(screen.getAllByRole('radio', { checked: true })).toHaveLength(1)

		rerender(<PageFrame.Toolbar pills={pills} selectedKey='missing' />)
		expect(screen.getByRole('radio', { name: '进行中' })).toHaveAttribute('aria-checked', 'true')
		expect(screen.getAllByRole('radio', { checked: true })).toHaveLength(1)
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

	it('FilterBar 始终位于 Toolbar 外，空 Draft 不占用纵向间隔', () => {
		const { rerender } = render(
			<PageFrame.Toolbar
				filterBar={<EmptyFilterBar />}
				pills={[{ key: 'all', label: '所有任务' }]}
				selectedKey='all'
			/>,
		)

		const toolbar = screen.getByRole('toolbar', { name: '页面工具栏' })
		const toolbarGroup = screen.getByRole('radiogroup', { name: '页面筛选' })
		expect(screen.getByRole('radio', { name: '所有任务' })).toHaveAttribute('data-selected', 'true')
		const toolbarLayout = toolbar.parentElement
		const emptyFilterBarSlot = toolbarLayout?.lastElementChild
		expect(emptyFilterBarSlot).toBeEmptyDOMElement()
		expect(emptyFilterBarSlot).toHaveClass('empty:hidden')

		rerender(
			<PageFrame.Toolbar
				filterBar={<div data-testid='filter-bar'>筛选公式</div>}
				pills={[{ key: 'all', label: '所有任务' }]}
				selectedKey='all'
			/>,
		)
		const filterBar = screen.getByTestId('filter-bar')
		expect(screen.getByRole('toolbar', { name: '页面工具栏' })).not.toContainElement(filterBar)
		expect(toolbarGroup.compareDocumentPosition(filterBar) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
			Node.DOCUMENT_POSITION_FOLLOWING,
		)
	})
})

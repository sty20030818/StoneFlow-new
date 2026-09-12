import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'

import type { View } from '@/shared/types'
import { ViewActionsMenu } from './ViewActionsMenu'

const customView: View = {
	id: 'view-1',
	name: '重点任务',
	scope: { type: 'all' },
	context: { kind: 'all' },
	baseViewKey: 'active',
	filters: { clauses: [] },
	position: 100,
	createdAt: '2026-08-19T00:00:00Z',
	updatedAt: '2026-08-19T00:00:00Z',
}

it('删除中拒绝重复提交，关闭菜单后迟到失败不会重新打开或显示到新菜单', async () => {
	const pending = Promise.withResolvers<void>()
	const onDelete = vi.fn(() => pending.promise)
	render(<ViewActionsMenu activeView={customView} onDelete={onDelete} />)
	const trigger = screen.getByRole('button', { name: '视图操作' })
	fireEvent.click(trigger)
	fireEvent.click(await screen.findByRole('menuitem', { name: '删除保存视图' }))
	const deletingItem = screen.getByRole('menuitem', { name: '正在删除…' })
	expect(deletingItem).toHaveAttribute('aria-disabled', 'true')
	fireEvent.click(deletingItem)
	expect(onDelete).toHaveBeenCalledOnce()
	fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' })
	await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument())
	fireEvent.click(trigger)
	expect(await screen.findByRole('menuitem', { name: '正在删除…' })).toHaveAttribute(
		'aria-disabled',
		'true',
	)
	await act(async () => pending.reject(new Error('旧菜单请求失败')))
	expect(screen.queryByRole('alert')).not.toBeInTheDocument()
	expect(screen.getByRole('menuitem', { name: '删除保存视图' })).not.toHaveAttribute(
		'aria-disabled',
		'true',
	)
	expect(onDelete).toHaveBeenCalledOnce()
})

it('删除失败保留操作入口及错误，可原位重试并恢复焦点', async () => {
	const onDelete = vi
		.fn<(view: View) => Promise<void>>()
		.mockRejectedValueOnce(new Error('删除暂时不可用'))
		.mockResolvedValueOnce(undefined)
	render(<ViewActionsMenu activeView={customView} onDelete={onDelete} />)
	const trigger = screen.getByRole('button', { name: '视图操作' })
	fireEvent.click(trigger)
	fireEvent.click(await screen.findByRole('menuitem', { name: '删除保存视图' }))
	expect(await screen.findByRole('alert')).toHaveTextContent('删除暂时不可用')
	fireEvent.click(screen.getByRole('menuitem', { name: '重试删除' }))
	await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument())
	expect(onDelete).toHaveBeenCalledTimes(2)
	await waitFor(() => expect(trigger).toHaveFocus())
})

it('视图菜单只在调用方需要时提供创建入口', async () => {
	const onEdit = vi.fn()
	const onDelete = vi.fn()

	render(<ViewActionsMenu activeView={customView} onDelete={onDelete} onEdit={onEdit} />)

	const trigger = screen.getByRole('button', { name: '视图操作' })
	fireEvent.click(trigger)
	expect(screen.queryByRole('menuitem', { name: '新建保存视图' })).not.toBeInTheDocument()
	fireEvent.click(await screen.findByRole('menuitem', { name: '编辑保存视图' }))
	expect(onEdit).toHaveBeenCalledWith(customView)

	fireEvent.click(trigger)
	fireEvent.click(await screen.findByRole('menuitem', { name: '删除保存视图' }))
	expect(onDelete).toHaveBeenCalledWith(customView)
	await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument())
})

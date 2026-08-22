import { fireEvent, render, screen } from '@testing-library/react'

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
})

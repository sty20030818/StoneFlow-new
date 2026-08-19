import { fireEvent, render, screen } from '@testing-library/react'

import type { View } from '@/shared/types'
import { ViewActionsMenu } from './ViewActionsMenu'

const customView: View = {
	id: 'view-1',
	name: '重点任务',
	kind: 'custom',
	systemKey: null,
	scope: { type: 'all' },
	filters: { clauses: [] },
	position: 100,
	createdAt: '2026-08-19T00:00:00Z',
	updatedAt: '2026-08-19T00:00:00Z',
}

it('视图菜单通过 HeroUI action 调用唯一领域入口', async () => {
	const onCreate = vi.fn()
	const onEdit = vi.fn()
	const onDelete = vi.fn()

	render(
		<ViewActionsMenu
			activeView={customView}
			onCreate={onCreate}
			onDelete={onDelete}
			onEdit={onEdit}
		/>,
	)

	const trigger = screen.getByRole('button', { name: '视图操作' })
	fireEvent.click(trigger)
	fireEvent.click(await screen.findByRole('menuitem', { name: '新建自定义视图' }))
	expect(onCreate).toHaveBeenCalledOnce()

	fireEvent.click(trigger)
	fireEvent.click(await screen.findByRole('menuitem', { name: '编辑当前视图' }))
	expect(onEdit).toHaveBeenCalledWith(customView)

	fireEvent.click(trigger)
	fireEvent.click(await screen.findByRole('menuitem', { name: '删除当前视图' }))
	expect(onDelete).toHaveBeenCalledWith(customView)
})

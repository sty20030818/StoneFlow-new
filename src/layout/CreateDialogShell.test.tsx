/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react'

import type { Space } from '@/shared/types'
import { CreateDialogShell } from './CreateDialogShell'

describe('CreateDialogShell', () => {
	it('在 Header 显示当前 Space，并可选择其他 Space', async () => {
		const onSelectSpace = vi.fn()
		renderCreateDialogShell({
			onSelectSpace,
			selectedSpaceId: 'space-a',
		})

		expect(screen.getByText('工作')).toBeInTheDocument()
		expect(screen.getAllByText('新建任务')).toHaveLength(2)
		fireEvent.pointerDown(screen.getByRole('button', { name: '空间' }))

		expect(await screen.findByRole('menuitem', { name: /工作/ })).toBeInTheDocument()
		fireEvent.click(screen.getByRole('menuitem', { name: /生活/ }))

		expect(onSelectSpace).toHaveBeenCalledWith('space-b')
	})

	it('空选中态显示全部 Spaces，且菜单仍只选择具体 Space', async () => {
		const onSelectSpace = vi.fn()
		renderCreateDialogShell({
			onSelectSpace,
			selectedSpaceId: null,
		})

		expect(screen.getByText('全部 Spaces')).toBeInTheDocument()
		fireEvent.pointerDown(screen.getByRole('button', { name: '空间' }))

		expect(await screen.findByRole('menuitem', { name: /工作/ })).toBeInTheDocument()
		fireEvent.click(screen.getByRole('menuitem', { name: /生活/ }))

		expect(onSelectSpace).toHaveBeenCalledWith('space-b')
	})
})

function renderCreateDialogShell({
	onSelectSpace = vi.fn(),
	selectedSpaceId,
}: {
	onSelectSpace?: (spaceId: string | null) => void
	selectedSpaceId: string | null
}) {
	return render(
		<CreateDialogShell
			description='创建一个新任务'
			onClose={vi.fn()}
			onSelectSpace={onSelectSpace}
			open
			selectedSpaceId={selectedSpaceId}
			spaces={spaces}
			title='新建任务'
		>
			<div>表单内容</div>
		</CreateDialogShell>,
	)
}

const spaces: Space[] = [
	{
		id: 'space-a',
		name: '工作',
		iconKey: 'folder',
		colorKey: 'blue',
		isDefault: true,
		position: 0,
		archivedAt: null,
		deletedAt: null,
		createdAt: '2026-05-19T10:00:00.000Z',
		updatedAt: '2026-05-19T10:00:00.000Z',
	},
	{
		id: 'space-b',
		name: '生活',
		iconKey: 'home',
		colorKey: 'green',
		isDefault: false,
		position: 1,
		archivedAt: null,
		deletedAt: null,
		createdAt: '2026-05-19T10:00:00.000Z',
		updatedAt: '2026-05-19T10:00:00.000Z',
	},
]

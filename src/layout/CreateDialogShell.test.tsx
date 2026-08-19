import { fireEvent, render, screen } from '@testing-library/react'

import type { Space } from '@/shared/types'
import { CreateDialogShell } from './CreateDialogShell'

describe('CreateDialogShell', () => {
	it.each([
		{ selectedSpaceId: 'space-a', expectedLabel: '工作' },
		{ selectedSpaceId: null, expectedLabel: '选择空间' },
	])('从 $expectedLabel 状态选择具体 Space', async ({ selectedSpaceId, expectedLabel }) => {
		const onSelectSpace = vi.fn()
		renderCreateDialogShell({
			onSelectSpace,
			selectedSpaceId,
		})

		expect(screen.getByText(expectedLabel)).toBeInTheDocument()
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

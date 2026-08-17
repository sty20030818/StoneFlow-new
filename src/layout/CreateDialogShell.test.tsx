/** @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'

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

	it('空选中态显示选择空间，且菜单仍只选择具体 Space', async () => {
		const onSelectSpace = vi.fn()
		renderCreateDialogShell({
			onSelectSpace,
			selectedSpaceId: null,
		})

		expect(screen.getByText('选择空间')).toBeInTheDocument()
		fireEvent.pointerDown(screen.getByRole('button', { name: '空间' }))

		expect(await screen.findByRole('menuitem', { name: /工作/ })).toBeInTheDocument()
		fireEvent.click(screen.getByRole('menuitem', { name: /生活/ }))

		expect(onSelectSpace).toHaveBeenCalledWith('space-b')
	})

	it('Escape 关闭最高层并将焦点归还给普通 trigger', async () => {
		const onWindowKeyDown = vi.fn()
		window.addEventListener('keydown', onWindowKeyDown)
		render(<FocusRestoreHarness />)
		const trigger = screen.getByRole('button', { name: '打开创建窗口' })

		trigger.focus()
		fireEvent.click(trigger)
		const dialog = await screen.findByRole('dialog', { name: '新建任务' })

		fireEvent.keyDown(dialog, { key: 'w' })
		expect(onWindowKeyDown).not.toHaveBeenCalled()
		fireEvent.keyDown(dialog, { key: 'Escape' })

		await waitFor(() => {
			expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
			expect(trigger).toHaveFocus()
		})
		window.removeEventListener('keydown', onWindowKeyDown)
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

function FocusRestoreHarness() {
	const [open, setOpen] = useState(false)

	return (
		<>
			<button onClick={() => setOpen(true)} type='button'>
				打开创建窗口
			</button>
			{open ? (
				<CreateDialogShell
					description='创建一个新任务'
					onClose={() => setOpen(false)}
					onSelectSpace={vi.fn()}
					open
					selectedSpaceId='space-a'
					spaces={spaces}
					title='新建任务'
				>
					<div>表单内容</div>
				</CreateDialogShell>
			) : null}
		</>
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

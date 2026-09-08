import { act, fireEvent, render, screen } from '@testing-library/react'
import { Button } from '@heroui/react'

import { ActionTooltip } from '@/shared/components/tooltip'
import type { Space } from '@/shared/types'
import { CreateDialogHeader, CreateDialogShell } from './CreateDialogShell'

describe('CreateDialogShell', () => {
	it.each([
		{ selectedSpaceId: 'space-a', expectedLabel: '工作' },
		{ selectedSpaceId: '', expectedLabel: '选择空间' },
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

	it('提交时禁止修改 Space，保留关闭窗口入口', () => {
		renderCreateDialogShell({ selectedSpaceId: 'space-a', disabled: true })

		expect(screen.getByRole('button', { name: '空间' })).toBeDisabled()
		expect(screen.getByRole('button', { name: '关闭创建窗口' })).toBeEnabled()
		expect(screen.getByRole('dialog', { name: '新建任务' })).toHaveAccessibleDescription(
			'创建一个新任务',
		)
	})

	it.each([
		{ label: 'Tab 从提交回到空间', shiftKey: false },
		{ label: 'Shift+Tab 从空间回到提交', shiftKey: true },
	])('焦点在弹窗首尾回绕：$label', ({ shiftKey }) => {
		renderCreateDialogShell({ selectedSpaceId: 'space-a' })
		const first = screen.getByRole('button', { name: '空间' })
		const last = screen.getByRole('button', { name: '创建任务' })
		const source = shiftKey ? first : last
		const target = shiftKey ? last : first
		act(() => source.focus())
		expect(source).toHaveFocus()

		fireEvent.keyDown(source, { key: 'Tab', shiftKey })

		expect(target).toHaveFocus()
	})
})

function renderCreateDialogShell({
	onSelectSpace = vi.fn(),
	selectedSpaceId,
	disabled = false,
}: {
	onSelectSpace?: (spaceId: string) => void
	selectedSpaceId: string
	disabled?: boolean
}) {
	return render(
		<CreateDialogShell description='创建一个新任务' onClose={vi.fn()} open title='新建任务'>
			<CreateDialogHeader
				disabled={disabled}
				onClose={vi.fn()}
				onSelectSpace={onSelectSpace}
				selectedSpaceId={selectedSpaceId}
				spaces={spaces}
				title='新建任务'
			/>
			<div>表单内容</div>
			<ActionTooltip label='创建任务'>
				<Button type='submit'>创建任务</Button>
			</ActionTooltip>
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

import { fireEvent, render, screen } from '@testing-library/react'

import type { BulkAction, BulkActionConfirmationRequest } from '@/features/bulk-action/core'
import { createBulkSelectionSnapshot } from '@/features/bulk-action/core'

import { BulkActionConfirmDialog } from './BulkActionConfirmDialog'

describe('BulkActionConfirmDialog', () => {
	it('使用 metadata 提供的 title、description 和 confirmLabel', () => {
		render(
			<BulkActionConfirmDialog
				onCancel={vi.fn<() => void>()}
				onConfirm={vi.fn<() => void>()}
				onOpenChange={vi.fn<(open: boolean) => void>()}
				open
				request={createRequest()}
			/>,
		)

		expect(screen.getByText('删除选中任务？')).toBeInTheDocument()
		expect(screen.getByText('将删除 2 个任务。')).toBeInTheDocument()
		expect(screen.getByRole('button', { name: '确认删除' })).toBeInTheDocument()
	})

	it('destructive action 使用 destructive 视觉', () => {
		render(
			<BulkActionConfirmDialog
				onCancel={vi.fn<() => void>()}
				onConfirm={vi.fn<() => void>()}
				onOpenChange={vi.fn<(open: boolean) => void>()}
				open
				request={createRequest()}
			/>,
		)

		expect(screen.getByRole('button', { name: '确认删除' })).toHaveClass('text-destructive')
	})

	it('cancel 和 confirm 会触发对应回调', () => {
		const onCancel = vi.fn<() => void>()
		const onConfirm = vi.fn<() => void>()

		render(
			<BulkActionConfirmDialog
				onCancel={onCancel}
				onConfirm={onConfirm}
				onOpenChange={vi.fn<(open: boolean) => void>()}
				open
				request={createRequest()}
			/>,
		)

		fireEvent.click(screen.getByRole('button', { name: '取消' }))
		fireEvent.click(screen.getByRole('button', { name: '确认删除' }))

		expect(onCancel).toHaveBeenCalled()
		expect(onConfirm).toHaveBeenCalled()
	})

	it('Esc 显式触发取消按钮，同时通知外层关闭', () => {
		const onCancel = vi.fn<() => void>()
		const onOpenChange = vi.fn<(open: boolean) => void>()

		render(
			<BulkActionConfirmDialog
				onCancel={onCancel}
				onConfirm={vi.fn<() => void>()}
				onOpenChange={onOpenChange}
				open
				request={createRequest()}
			/>,
		)

		fireEvent.keyDown(screen.getByRole('alertdialog'), { key: 'Escape' })

		expect(onCancel).toHaveBeenCalledTimes(1)
		expect(onOpenChange).toHaveBeenCalledWith(false)
	})

	it('打开时无初始焦点，无焦点按 Enter 触发确认', () => {
		const onConfirm = vi.fn<() => void>()

		render(
			<BulkActionConfirmDialog
				onCancel={vi.fn<() => void>()}
				onConfirm={onConfirm}
				onOpenChange={vi.fn<(open: boolean) => void>()}
				open
				request={createRequest()}
			/>,
		)

		// 打开时焦点不应落在任何按钮上（无可见 focus ring）
		expect(screen.getByRole('button', { name: '确认删除' })).not.toHaveFocus()
		expect(screen.getByRole('button', { name: '取消' })).not.toHaveFocus()

		// 无焦点时 Enter 触发确认（默认行为）
		fireEvent.keyDown(screen.getByRole('alertdialog'), { key: 'Enter' })
		expect(onConfirm).toHaveBeenCalledTimes(1)
	})

	it('Tab 聚焦取消按钮后，Enter 触发取消', () => {
		const onCancel = vi.fn<() => void>()
		const onConfirm = vi.fn<() => void>()

		render(
			<BulkActionConfirmDialog
				onCancel={onCancel}
				onConfirm={onConfirm}
				onOpenChange={vi.fn<(open: boolean) => void>()}
				open
				request={createRequest()}
			/>,
		)

		screen.getByRole('button', { name: '取消' }).focus()
		fireEvent.keyDown(screen.getByRole('alertdialog'), { key: 'Enter' })

		expect(onCancel).toHaveBeenCalledTimes(1)
		expect(onConfirm).not.toHaveBeenCalled()
	})
})

function createRequest(): BulkActionConfirmationRequest {
	return {
		action: {
			id: 'task.deleteSelected',
			entity: 'task',
			label: '删除任务',
			intent: 'delete',
			tone: 'destructive',
			run: vi.fn<BulkAction['run']>(),
		},
		snapshot: createBulkSelectionSnapshot({
			entity: 'task',
			ids: ['task-a', 'task-b'],
			source: 'command-menu',
			createdAt: 1,
		}),
		copy: {
			title: '删除选中任务？',
			description: '将删除 2 个任务。',
			confirmLabel: '确认删除',
		},
	}
}

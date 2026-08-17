import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AutosaveController } from '@/shared/autosave'

import type { TaskDetailDraft } from '../model/taskDetailDraft'
import { TaskDetailHeader } from './TaskDetailHeader'

const openPage = vi.hoisted(() => vi.fn())

vi.mock('@/features/entity-detail', () => ({
	useEntityDetailController: () => ({ openPage }),
}))

describe('TaskDetailHeader', () => {
	const flushNow = vi.fn<() => Promise<boolean>>()

	beforeEach(() => {
		flushNow.mockReset().mockResolvedValue(true)
		openPage.mockReset()
	})

	it('详情头部不承载低频呈现方式设置', () => {
		const { container } = renderHeader()

		expect(screen.queryByRole('button', { name: '详情呈现方式' })).not.toBeInTheDocument()
		expect(container.firstElementChild).toHaveClass('h-12', 'border-sf-border-subtle', 'py-0')
		expect(container.firstElementChild).not.toHaveClass('min-h-12')
	})

	it('打开独立页面前先 flush 自动保存', async () => {
		renderHeader()

		fireEvent.click(screen.getByRole('button', { name: '打开' }))

		await waitFor(() => {
			expect(flushNow).toHaveBeenCalledOnce()
			expect(openPage).toHaveBeenCalledWith({ kind: 'task', id: 'task-a' })
		})
	})

	it('自动保存失败时不打开独立页面', async () => {
		flushNow.mockResolvedValue(false)
		renderHeader()

		fireEvent.click(screen.getByRole('button', { name: '打开' }))

		await waitFor(() => expect(flushNow).toHaveBeenCalledOnce())
		expect(openPage).not.toHaveBeenCalled()
	})

	it('Aside 关闭按钮使用与打开按钮同尺寸的 ghost 视觉', () => {
		const onClose = vi.fn()
		renderHeader(onClose)

		const openButton = screen.getByRole('button', { name: '打开' })
		const closeButton = screen.getByRole('button', { name: '关闭任务详情' })
		expect(openButton).toHaveClass('button--outline', 'button--sm')
		expect(closeButton).toHaveClass('button--ghost', 'button--sm')

		fireEvent.click(closeButton)
		expect(onClose).toHaveBeenCalledOnce()
	})

	function renderHeader(onClose?: () => void) {
		return render(
			<TaskDetailHeader
				autosave={
					{
						error: null,
						flushNow,
						savedAt: null,
						status: 'idle',
					} as unknown as AutosaveController<TaskDetailDraft>
				}
				onClose={onClose}
				taskId='task-a'
			/>,
		)
	}
})

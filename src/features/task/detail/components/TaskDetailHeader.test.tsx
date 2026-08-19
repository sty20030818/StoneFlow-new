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

	it('打开独立页面前 flush，并保留可访问的关闭入口', async () => {
		const onClose = vi.fn()
		renderHeader(onClose)

		fireEvent.click(screen.getByRole('button', { name: '打开' }))

		await waitFor(() => {
			expect(flushNow).toHaveBeenCalledOnce()
			expect(openPage).toHaveBeenCalledWith({ kind: 'task', id: 'task-a' })
		})

		fireEvent.click(screen.getByRole('button', { name: '关闭任务详情' }))
		expect(onClose).toHaveBeenCalledOnce()
	})

	it('自动保存失败时不打开独立页面', async () => {
		flushNow.mockResolvedValue(false)
		renderHeader()

		fireEvent.click(screen.getByRole('button', { name: '打开' }))

		await waitFor(() => expect(flushNow).toHaveBeenCalledOnce())
		expect(openPage).not.toHaveBeenCalled()
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

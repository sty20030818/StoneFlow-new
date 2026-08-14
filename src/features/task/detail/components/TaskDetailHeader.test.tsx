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
	const flushNow = vi.fn<() => Promise<void>>()

	beforeEach(() => {
		flushNow.mockReset().mockResolvedValue(undefined)
		openPage.mockReset()
	})

	it('详情头部不承载低频呈现方式设置', () => {
		renderHeader()

		expect(screen.queryByRole('button', { name: '详情呈现方式' })).not.toBeInTheDocument()
	})

	it('打开独立页面前先 flush 自动保存', async () => {
		renderHeader()

		fireEvent.click(screen.getByRole('button', { name: '打开' }))

		await waitFor(() => {
			expect(flushNow).toHaveBeenCalledOnce()
			expect(openPage).toHaveBeenCalledWith({ kind: 'task', id: 'task-a' })
		})
	})

	function renderHeader() {
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
				taskId='task-a'
			/>,
		)
	}
})

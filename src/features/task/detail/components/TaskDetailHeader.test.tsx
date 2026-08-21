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

		fireEvent.click(screen.getByRole('button', { name: '在完整页面中打开任务' }))

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

		fireEvent.click(screen.getByRole('button', { name: '在完整页面中打开任务' }))

		await waitFor(() => expect(flushNow).toHaveBeenCalledOnce())
		expect(openPage).not.toHaveBeenCalled()
	})

	it.each([
		['dirty', '已编辑'],
		['scheduled', '保存中…'],
		['saving', '保存中…'],
		['saved', '已保存'],
	] as const)('自动保存状态 %s 显示用户可见反馈', (status, label) => {
		renderHeader(undefined, { status })

		expect(screen.getByText(label)).toBeInTheDocument()
	})

	it('自动保存失败时显示失败原因', () => {
		renderHeader(undefined, { error: '网络错误', status: 'failed' })

		expect(screen.getByText('保存失败')).toBeInTheDocument()
		expect(screen.getByText('网络错误')).toBeInTheDocument()
	})

	it('空闲状态不显示保存反馈', () => {
		renderHeader()

		expect(screen.queryByText(/已编辑|保存中|已保存|保存失败/)).not.toBeInTheDocument()
	})

	function renderHeader(
		onClose?: () => void,
		autosaveOverrides: Partial<AutosaveController<TaskDetailDraft>> = {},
	) {
		return render(
			<TaskDetailHeader
				autosave={
					{
						error: null,
						flushNow,
						savedAt: null,
						status: 'idle',
						...autosaveOverrides,
					} as unknown as AutosaveController<TaskDetailDraft>
				}
				onClose={onClose}
				taskId='task-a'
			/>,
		)
	}
})

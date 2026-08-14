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
	const onPresentationPreferenceChange = vi.fn<(value: 'sheet' | 'aside') => void>()

	beforeEach(() => {
		flushNow.mockReset().mockResolvedValue(undefined)
		onPresentationPreferenceChange.mockReset()
		openPage.mockReset()
	})

	it('用 HeroUI 单选菜单切换 Sheet 与 Aside 偏好', async () => {
		renderHeader('sheet')

		fireEvent.click(screen.getByRole('button', { name: '详情呈现方式' }))
		fireEvent.click(await screen.findByRole('menuitemradio', { name: 'Aside' }))

		expect(onPresentationPreferenceChange).toHaveBeenCalledOnce()
		expect(onPresentationPreferenceChange).toHaveBeenCalledWith('aside')
	})

	it('打开独立页面前先 flush 自动保存', async () => {
		renderHeader('aside')

		fireEvent.click(screen.getByRole('button', { name: '打开' }))

		await waitFor(() => {
			expect(flushNow).toHaveBeenCalledOnce()
			expect(openPage).toHaveBeenCalledWith({ kind: 'task', id: 'task-a' })
		})
	})

	function renderHeader(presentationPreference: 'sheet' | 'aside') {
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
				onPresentationPreferenceChange={onPresentationPreferenceChange}
				presentationPreference={presentationPreference}
				taskId='task-a'
			/>,
		)
	}
})

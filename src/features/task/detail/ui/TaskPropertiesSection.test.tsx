import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { AutosaveController } from '@/shared/autosave'

import type { TaskDetailDraft } from '../model/taskDetailDraft'
import { TaskPropertiesSection } from './TaskPropertiesSection'

describe('TaskPropertiesSection', () => {
	it('渲染描边属性入口组', () => {
		const { container } = render(<TaskPropertiesSection autosave={createAutosaveController()} />)

		expect(container.querySelector('[data-task-properties="stack"]')).toBeInTheDocument()
		expect(screen.getByRole('button', { name: '状态' })).toHaveTextContent('待执行')
		expect(screen.getByRole('button', { name: '优先级' })).toHaveTextContent('中')
		expect(screen.getByRole('button', { name: '截止日期' })).toHaveAttribute(
			'data-variant',
			'outline',
		)
		expect(screen.getByRole('button', { name: '计划日期' })).toHaveAttribute(
			'data-variant',
			'outline',
		)
		expect(screen.getByRole('button', { name: '提醒' })).toHaveAttribute(
			'data-variant',
			'outline',
		)
	})

	it('状态和优先级按钮使用 outline contract', () => {
		render(<TaskPropertiesSection autosave={createAutosaveController()} />)

		expect(screen.getByRole('button', { name: '状态' })).toHaveAttribute('data-variant', 'outline')
		expect(screen.getByRole('button', { name: '优先级' })).toHaveAttribute('data-variant', 'outline')
	})
})

function createAutosaveController(): AutosaveController<TaskDetailDraft> {
	return {
		draft: {
			id: 'task-1',
			title: '任务 A',
			note: '',
			status: 'todo',
			priority: 2,
			spaceId: 'space-1',
			projectId: '',
			dueAt: '',
			scheduledAt: '',
			reminderAt: '',
		},
		status: 'idle',
		error: null,
		savedAt: null,
		isDirty: false,
		setField: vi.fn<AutosaveController<TaskDetailDraft>['setField']>(),
		setDraft: vi.fn<AutosaveController<TaskDetailDraft>['setDraft']>(),
		flushNow: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
		retry: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
		discard: vi.fn<() => void>(),
		reset: vi.fn<AutosaveController<TaskDetailDraft>['reset']>(),
	}
}

import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it, vi, type Mock } from 'vitest'

import type { ProjectOption } from '@/features/project'
import type { AutosaveController } from '@/shared/autosave'
import { renderWithInteractionProviders as render } from '@/test/TestInteractionProviders'

import type { TaskDetailDraft } from '../model/taskDetailDraft'
import { TaskPlacementSection } from './TaskPlacementSection'

describe('TaskPlacementSection', () => {
	it('跨 space 选择项目时立即提交归属变更', async () => {
		const autosave = createAutosaveController()

		render(
			<TaskPlacementSection
				autosave={autosave}
				projects={createProjects()}
				spaces={createSpaces()}
			/>,
		)

		fireEvent.click(screen.getByRole('button', { name: '归属' }))
		fireEvent.click(await screen.findByRole('menuitem', { name: /项目 B/ }))

		expect(autosave.setDraft).toHaveBeenCalledOnce()

		const [updater, options] = (autosave.setDraft as Mock).mock.calls[0]
		const nextDraft = updater(createDraft())

		expect(options).toEqual({ saveMode: 'immediate' })
		expect(nextDraft.spaceId).toBe('space-2')
		expect(nextDraft.projectId).toBe('project-2')
	})
})

function createAutosaveController(
	overrides: Partial<TaskDetailDraft> = {},
): AutosaveController<TaskDetailDraft> {
	return {
		draft: createDraft(overrides),
		status: 'idle',
		error: null,
		savedAt: null,
		isDirty: false,
		setField: vi.fn<AutosaveController<TaskDetailDraft>['setField']>(),
		setDraft: vi.fn<AutosaveController<TaskDetailDraft>['setDraft']>(),
		flushNow: vi.fn<() => Promise<boolean>>().mockResolvedValue(true),
		retry: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
		discard: vi.fn<() => void>(),
		reset: vi.fn<AutosaveController<TaskDetailDraft>['reset']>(),
	}
}

function createDraft(overrides: Partial<TaskDetailDraft> = {}): TaskDetailDraft {
	return {
		id: 'task-1',
		title: '任务 A',
		note: '',
		status: 'todo',
		priority: 2,
		spaceId: 'space-1',
		projectId: '',
		dueAt: '',
		plannedAt: '',
		remindAt: '',
		...overrides,
	}
}

function createSpaces() {
	return [
		{ id: 'space-1', name: '工作' },
		{ id: 'space-2', name: '生活' },
	]
}

function createProjects(): ProjectOption[] {
	return [
		{
			id: 'project-1',
			name: '项目 A',
			spaceId: 'space-1',
		},
		{
			id: 'project-2',
			name: '项目 B',
			spaceId: 'space-2',
		},
	] as ProjectOption[]
}

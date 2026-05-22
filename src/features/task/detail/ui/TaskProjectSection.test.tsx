import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { ProjectOption } from '@/features/project/model/types'
import type { AutosaveController } from '@/shared/autosave'

import type { TaskDetailDraft } from '../model/taskDetailDraft'
import { TaskProjectSection } from './TaskProjectSection'

describe('TaskProjectSection', () => {
	it('无项目时显示独立事项', () => {
		render(<TaskProjectSection autosave={createAutosaveController()} projects={createProjects()} />)

		expect(screen.getByRole('button', { name: '项目' })).toHaveTextContent('独立事项')
	})

	it('有项目时显示当前项目名', () => {
		render(
			<TaskProjectSection
				autosave={createAutosaveController({ projectId: 'project-1' })}
				projects={createProjects()}
			/>,
		)

		expect(screen.getByRole('button', { name: '项目' })).toHaveTextContent('项目 A')
	})

	it('仅展示当前 space 下可见项目，并带 drawer overlay 标记', async () => {
		render(<TaskProjectSection autosave={createAutosaveController()} projects={createProjects()} />)

		fireEvent.pointerDown(screen.getByRole('button', { name: '项目' }))

		const menu = await screen.findByRole('menu')
		expect(menu).toHaveAttribute('data-drawer-owned-overlay', 'true')
		expect(screen.getByRole('menuitem', { name: /独立事项/ })).toBeInTheDocument()
		expect(screen.getByRole('menuitem', { name: /项目 A/ })).toBeInTheDocument()
		expect(screen.queryByRole('menuitem', { name: /项目 B/ })).not.toBeInTheDocument()
		expect(getShortcutHintDigits()).toEqual(['0'])
	})

	it('选择独立事项时调用 autosave.setDraft', async () => {
		const autosave = createAutosaveController({ projectId: 'project-1' })

		render(<TaskProjectSection autosave={autosave} projects={createProjects()} />)

		fireEvent.pointerDown(screen.getByRole('button', { name: '项目' }))
		fireEvent.click(await screen.findByRole('menuitem', { name: /独立事项/ }))

		expect(autosave.setDraft).toHaveBeenCalledOnce()
	})

	it('选择项目时调用 autosave.setDraft', async () => {
		const autosave = createAutosaveController()

		render(<TaskProjectSection autosave={autosave} projects={createProjects()} />)

		fireEvent.pointerDown(screen.getByRole('button', { name: '项目' }))
		fireEvent.click(await screen.findByRole('menuitem', { name: /项目 A/ }))

		expect(autosave.setDraft).toHaveBeenCalledOnce()
	})
})

function createAutosaveController(
	overrides: Partial<TaskDetailDraft> = {},
): AutosaveController<TaskDetailDraft> {
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
			...overrides,
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

function getShortcutHintDigits() {
	return screen
		.queryAllByText(/^[0-9]$/)
		.map((element) => element.textContent ?? '')
		.filter(Boolean)
}

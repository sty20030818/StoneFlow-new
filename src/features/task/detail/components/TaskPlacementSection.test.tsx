import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi, type Mock } from 'vitest'

import type { ProjectOption } from '@/features/project'
import type { AutosaveController } from '@/shared/autosave'

import type { TaskDetailDraft } from '../model/taskDetailDraft'
import { TaskPlacementSection } from './TaskPlacementSection'

describe('TaskPlacementSection', () => {
	it('当前为独立事项时显示独立事项', () => {
		render(
			<TaskPlacementSection
				autosave={createAutosaveController()}
				projects={createProjects()}
				spaces={createSpaces()}
			/>,
		)

		expect(screen.getByRole('button', { name: '归属' })).toHaveTextContent('独立事项')
	})

	it('当前为项目时显示项目名', () => {
		render(
			<TaskPlacementSection
				autosave={createAutosaveController({ projectId: 'project-2', spaceId: 'space-2' })}
				projects={createProjects()}
				spaces={createSpaces()}
			/>,
		)

		expect(screen.getByRole('button', { name: '归属' })).toHaveTextContent('项目 B')
	})

	it('global 模式渲染多组 heading，且当前 space 在第一组', async () => {
		render(
			<TaskPlacementSection
				autosave={createAutosaveController()}
				projects={createProjects()}
				spaces={createSpaces()}
			/>,
		)

		fireEvent.pointerDown(screen.getByRole('button', { name: '归属' }))

		const menu = await screen.findByRole('menu')
		expect(menu).toHaveAttribute('data-drawer-owned-overlay', 'true')

		const labels = screen.getAllByText(/^(工作|生活)$/)
		expect(labels[0]).toHaveTextContent('工作')
		expect(labels[1]).toHaveTextContent('生活')
		expect(screen.getAllByRole('menuitem', { name: /独立事项/ })).toHaveLength(2)
		expect(screen.getByRole('menuitem', { name: /项目 A/ })).toBeInTheDocument()
		expect(screen.getByRole('menuitem', { name: /项目 B/ })).toBeInTheDocument()
	})

	it('跨 space 选择项目时把 draft 编排成目标 spaceId 和 projectId', async () => {
		const autosave = createAutosaveController()

		render(
			<TaskPlacementSection
				autosave={autosave}
				projects={createProjects()}
				spaces={createSpaces()}
			/>,
		)

		fireEvent.pointerDown(screen.getByRole('button', { name: '归属' }))
		fireEvent.click(await screen.findByRole('menuitem', { name: /项目 B/ }))

		expect(autosave.setDraft).toHaveBeenCalledOnce()

		const [updater, options] = (autosave.setDraft as Mock).mock.calls[0]
		const nextDraft = updater(createDraft())

		expect(options).toEqual({ saveMode: 'immediate' })
		expect(nextDraft.spaceId).toBe('space-2')
		expect(nextDraft.projectId).toBe('project-2')
	})

	it('选择独立事项时清空 projectId', async () => {
		const autosave = createAutosaveController({
			spaceId: 'space-2',
			projectId: 'project-2',
		})

		render(
			<TaskPlacementSection
				autosave={autosave}
				projects={createProjects()}
				spaces={createSpaces()}
			/>,
		)

		fireEvent.pointerDown(screen.getByRole('button', { name: '归属' }))
		fireEvent.click((await screen.findAllByRole('menuitem', { name: /独立事项/ }))[0])

		const [updater] = (autosave.setDraft as Mock).mock.calls[0]
		const nextDraft = updater(createDraft({ spaceId: 'space-2', projectId: 'project-2' }))

		expect(nextDraft.spaceId).toBe('space-2')
		expect(nextDraft.projectId).toBe('')
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
		flushNow: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
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
		inboxAt: '',
		dueAt: '',
		scheduledAt: '',
		reminderAt: '',
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

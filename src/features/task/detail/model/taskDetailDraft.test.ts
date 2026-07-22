import { describe, expect, it } from 'vitest'

import {
	applyTaskPlacementDraftChange,
	getTaskDetailPatch,
	type TaskDetailDraft,
} from './taskDetailDraft'

describe('taskDetailDraft', () => {
	it('选择项目归属时同步更新 spaceId 和 projectId', () => {
		const nextDraft = applyTaskPlacementDraftChange(createDraft(), {
			kind: 'project',
			spaceId: 'space-2',
			projectId: 'project-2',
		})

		expect(nextDraft.spaceId).toBe('space-2')
		expect(nextDraft.projectId).toBe('project-2')
	})

	it('选择独立事项时清空 projectId 并保留目标 spaceId', () => {
		const nextDraft = applyTaskPlacementDraftChange(
			createDraft({
				spaceId: 'space-1',
				projectId: 'project-1',
			}),
			{
				kind: 'no_project',
				spaceId: 'space-2',
			},
		)

		expect(nextDraft.spaceId).toBe('space-2')
		expect(nextDraft.projectId).toBe('')
	})

	it('跨 space 切项目后仍产出 spaceId 和 projectId patch', () => {
		const base = createDraft({
			spaceId: 'space-1',
			projectId: 'project-1',
		})
		const draft = applyTaskPlacementDraftChange(base, {
			kind: 'project',
			spaceId: 'space-2',
			projectId: 'project-2',
		})

		expect(getTaskDetailPatch(base, draft)).toEqual({
			taskId: 'task-1',
			placement: {
				kind: 'project',
				spaceId: 'space-2',
				projectId: 'project-2',
			},
		})
	})
})

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
		plannedAt: '',
		remindAt: '',
		...overrides,
	}
}

import type { ProjectOverviewItem, TaskListItem } from '@/shared/types'

import { buildProjectCommandSelection, buildTaskCommandSelection } from './commandSelection'

describe('buildTaskCommandSelection', () => {
	it('按 selectedIds 顺序构建纯数据 selection，并剔除不可见任务', () => {
		const selection = buildTaskCommandSelection({
			selectedIds: ['task-b', 'missing', 'task-a'],
			tasks: [
				createTask({ id: 'task-a', title: '任务 A', projectName: null }),
				createTask({ id: 'task-b', title: '任务 B', projectName: '项目 B' }),
			],
			fallbackSubtitle: 'Inbox',
			focusedTaskId: 'task-a',
		})

		expect(selection).toMatchObject({
			type: 'task',
			ids: ['task-b', 'task-a'],
			source: 'task-list',
			hasSelection: true,
			isSingleSelection: false,
			isMultiSelection: true,
		})
		expect(selection.entities).toMatchObject([
			{
				id: 'task-b',
				type: 'task',
				title: '任务 B',
				subtitle: '项目 B',
				status: 'todo',
				priority: '2',
			},
			{
				id: 'task-a',
				type: 'task',
				title: '任务 A',
				subtitle: 'Inbox',
				status: 'todo',
				priority: '2',
			},
		])
		expect(selection.primaryEntity).toEqual(selection.entities[0])
		expect(selection.focusedId).toBe('task-a')
		expect(selection.focusedType).toBe('task')
	})

	it('没有有效任务时返回空 selection', () => {
		const selection = buildTaskCommandSelection({
			selectedIds: ['missing'],
			tasks: [createTask({ id: 'task-a' })],
			fallbackSubtitle: 'Inbox',
			focusedTaskId: 'task-a',
		})

		expect(selection).toMatchObject({
			ids: [],
			entities: [],
			focusedId: 'task-a',
			focusedType: 'task',
			source: 'none',
			hasSelection: false,
			isSingleSelection: false,
			isMultiSelection: false,
		})
	})
})

describe('buildProjectCommandSelection', () => {
	it('按 selectedIds 顺序构建 project selection，并剔除不可见项目', () => {
		const selection = buildProjectCommandSelection({
			selectedIds: ['project-b', 'missing', 'project-a'],
			projects: [
				createProject({ id: 'project-a', name: '项目 A', completedAt: null }),
				createProject({
					id: 'project-b',
					name: '项目 B',
					completedAt: '2026-05-16T00:00:00Z',
				}),
			],
		})

		expect(selection).toMatchObject({
			type: 'project',
			ids: ['project-b', 'project-a'],
			source: 'project-list',
			hasSelection: true,
			isSingleSelection: false,
			isMultiSelection: true,
		})
		expect(selection.entities).toEqual([
			{
				id: 'project-b',
				type: 'project',
				title: '项目 B',
				subtitle: '已完成项目 · 工作',
				projectStatus: 'completed',
			},
			{
				id: 'project-a',
				type: 'project',
				title: '项目 A',
				subtitle: '进行中项目 · 工作',
				projectStatus: 'active',
			},
		])
		expect(selection.primaryEntity).toEqual(selection.entities[0])
	})

	it('没有有效项目时返回空 selection', () => {
		const selection = buildProjectCommandSelection({
			selectedIds: ['missing'],
			projects: [createProject({ id: 'project-a', name: '项目 A' })],
		})

		expect(selection).toMatchObject({
			ids: [],
			entities: [],
			source: 'none',
			hasSelection: false,
			isSingleSelection: false,
			isMultiSelection: false,
		})
	})
})

function createTask(overrides: Partial<TaskListItem> = {}): TaskListItem {
	return {
		id: 'task-a',
		spaceId: 'space-a',
		spaceName: '工作',
		spaceSlug: 'work',
		projectId: null,
		projectName: null,
		inboxAt: '2026-05-16T00:00:00Z',
		title: '任务 A',
		note: null,
		status: 'todo',
		statusChangedAt: '2026-05-16T00:00:00Z',
		priority: 2,
		dueAt: null,
		scheduledAt: null,
		reminderAt: null,
		completedAt: null,
		canceledAt: null,
		archivedAt: null,
		createdAt: '2026-05-16T00:00:00Z',
		updatedAt: '2026-05-16T00:00:00Z',
		...overrides,
	}
}

function createProject(
	overrides: Partial<ProjectOverviewItem> & Pick<ProjectOverviewItem, 'id' | 'name'>,
): ProjectOverviewItem {
	return {
		id: overrides.id,
		spaceId: overrides.spaceId ?? 'space-a',
		spaceName: overrides.spaceName ?? '工作',
		name: overrides.name,
		description: overrides.description ?? null,
		dueAt: overrides.dueAt ?? null,
		sortOrder: overrides.sortOrder ?? 1000,
		taskCount: overrides.taskCount ?? 3,
		activeTaskCount: overrides.activeTaskCount ?? 2,
		completedAt: overrides.completedAt ?? null,
		archivedAt: overrides.archivedAt ?? null,
		deletedAt: overrides.deletedAt ?? null,
		createdAt: overrides.createdAt ?? '2026-05-16T00:00:00Z',
		updatedAt: overrides.updatedAt ?? '2026-05-16T00:00:00Z',
	}
}

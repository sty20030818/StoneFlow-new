import type { ProjectOverviewItem } from '@/shared/types'

import { buildProjectCommandSelection } from './buildProjectCommandSelection'

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
			focusedProjectId: 'project-a',
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
		expect(selection.focusedId).toBe('project-a')
		expect(selection.focusedType).toBe('project')
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

function createProject(
	overrides: Partial<ProjectOverviewItem> & Pick<ProjectOverviewItem, 'id' | 'name'>,
): ProjectOverviewItem {
	return {
		id: overrides.id,
		spaceId: overrides.spaceId ?? 'space-a',
		spaceName: overrides.spaceName ?? '工作',
		name: overrides.name,
		description: overrides.description ?? null,
		status: overrides.status ?? 'todo',
		priority: overrides.priority ?? 0,
		plannedAt: overrides.plannedAt ?? null,
		dueAt: overrides.dueAt ?? null,
		remindAt: overrides.remindAt ?? null,
		statusChangedAt: overrides.statusChangedAt ?? '2026-05-01T00:00:00Z',
		position: overrides.position ?? 1000,
		taskCount: overrides.taskCount ?? 3,
		activeTaskCount: overrides.activeTaskCount ?? 2,
		completedAt: overrides.completedAt ?? null,
		archivedAt: overrides.archivedAt ?? null,
		deletedAt: overrides.deletedAt ?? null,
		createdAt: overrides.createdAt ?? '2026-05-16T00:00:00Z',
		updatedAt: overrides.updatedAt ?? '2026-05-16T00:00:00Z',
	}
}

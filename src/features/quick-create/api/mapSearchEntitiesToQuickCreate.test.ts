import { mapSearchEntitiesToQuickCreate } from '@/features/quick-create/api/mapSearchEntitiesToQuickCreate'
import type { SearchEntitiesResult } from '@/shared/types'

describe('mapSearchEntitiesToQuickCreate', () => {
	it('合并 active 与 completed 并按 limit 截断', () => {
		const result = mapSearchEntitiesToQuickCreate(createSearchResult(), 2)

		expect(result.tasks).toHaveLength(2)
		expect(result.tasks.map((task) => task.id)).toEqual(['task-a', 'task-b'])
		expect(result.projects).toHaveLength(2)
		expect(result.projects.map((project) => project.id)).toEqual(['project-a', 'project-b'])
	})

	it('映射字段与 QC 结果项对齐', () => {
		const result = mapSearchEntitiesToQuickCreate(createSearchResult(), 10)
		expect(result.tasks[0]).toMatchObject({
			id: 'task-a',
			spaceId: 'space-1',
			title: '活跃任务',
			projectName: '项目 A',
		})
		expect(result.projects[0]).toMatchObject({
			id: 'project-a',
			name: '活跃项目',
		})
	})
})

function createSearchResult(): SearchEntitiesResult {
	return {
		tasks: [
			{
				id: 'task-a',
				spaceId: 'space-1',
				spaceName: '工作',
				spaceSlug: 'work',
				projectId: 'project-a',
				projectName: '项目 A',
				inboxAt: null,
				title: '活跃任务',
				note: null,
				priority: 1,
				status: 'todo',
				updatedAt: '2026-01-01T00:00:00Z',
				completedAt: null,
			},
		],
		completedTasks: [
			{
				id: 'task-b',
				spaceId: 'space-1',
				spaceName: '工作',
				spaceSlug: 'work',
				projectId: null,
				projectName: null,
				inboxAt: null,
				title: '已完成任务',
				note: null,
				priority: 0,
				status: 'done',
				updatedAt: '2026-01-02T00:00:00Z',
				completedAt: '2026-01-02T00:00:00Z',
			},
			{
				id: 'task-c',
				spaceId: 'space-1',
				spaceName: '工作',
				spaceSlug: 'work',
				projectId: null,
				projectName: null,
				inboxAt: null,
				title: '多余',
				note: null,
				priority: 0,
				status: 'done',
				updatedAt: '2026-01-03T00:00:00Z',
				completedAt: '2026-01-03T00:00:00Z',
			},
		],
		projects: [
			{
				id: 'project-a',
				spaceId: 'space-1',
				spaceName: '工作',
				spaceSlug: 'work',
				name: '活跃项目',
				note: null,
				updatedAt: '2026-01-01T00:00:00Z',
				completedAt: null,
			},
		],
		completedProjects: [
			{
				id: 'project-b',
				spaceId: 'space-1',
				spaceName: '工作',
				spaceSlug: 'work',
				name: '已完成项目',
				note: null,
				updatedAt: '2026-01-02T00:00:00Z',
				completedAt: '2026-01-02T00:00:00Z',
			},
			{
				id: 'project-c',
				spaceId: 'space-1',
				spaceName: '工作',
				spaceSlug: 'work',
				name: '多余',
				note: null,
				updatedAt: '2026-01-03T00:00:00Z',
				completedAt: '2026-01-03T00:00:00Z',
			},
		],
	}
}

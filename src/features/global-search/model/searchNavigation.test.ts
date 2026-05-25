import {
	resolveProjectSearchTargetPath,
	resolveTaskSearchTargetPath,
} from '@/features/global-search/model/searchNavigation'

describe('searchNavigation', () => {
	it('项目结果始终跳转到所属项目页', () => {
		expect(
			resolveProjectSearchTargetPath({
				id: 'project-1',
				spaceId: 'space-1',
				spaceName: '工作',
				spaceSlug: 'work',
				name: '项目 A',
				note: null,
				updatedAt: '2026-05-09T10:00:00Z',
				completedAt: null,
			}),
		).toBe('/spaces/space-1/projects/project-1')
	})

	it('任务结果根据项目、Inbox 与独立事项决定目标页面', () => {
		expect(
			resolveTaskSearchTargetPath({
				id: 'task-project',
				spaceId: 'space-1',
				spaceName: '工作',
				spaceSlug: 'work',
				projectId: 'project-1',
				projectName: '项目 A',
				title: '项目任务',
				note: null,
				priority: 2,
				status: 'todo',
				inboxAt: null,
				updatedAt: '2026-05-09T10:00:00Z',
				completedAt: null,
			}),
		).toBe('/spaces/space-1/projects/project-1')

		expect(
			resolveTaskSearchTargetPath({
				id: 'task-inbox',
				spaceId: 'space-2',
				spaceName: '生活',
				spaceSlug: 'life',
				projectId: null,
				projectName: null,
				title: 'Inbox 任务',
				note: null,
				priority: 1,
				status: 'doing',
				inboxAt: '2026-05-09T10:00:00Z',
				updatedAt: '2026-05-09T10:00:00Z',
				completedAt: null,
			}),
		).toBe('/spaces/space-2/inbox')

		expect(
			resolveTaskSearchTargetPath({
				id: 'task-no-project',
				spaceId: 'space-3',
				spaceName: '个人',
				spaceSlug: 'personal',
				projectId: null,
				projectName: null,
				title: '独立事项',
				note: null,
				priority: 0,
				status: 'waiting',
				inboxAt: null,
				updatedAt: '2026-05-09T10:00:00Z',
				completedAt: null,
			}),
		).toBe('/spaces/space-3/no-project')
	})
})

import { resolveProjectSearchTargetPath } from './searchNavigation'

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
		).toBe('/space-1/projects/project-1')
	})
})

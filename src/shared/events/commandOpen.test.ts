import { normalizeCommandOpenPayload } from '@/shared/events/commandOpen'

describe('commandOpen event helpers', () => {
	it('将带项目归属的 Task 打开事件映射为前端字段', () => {
		expect(
			normalizeCommandOpenPayload({
				kind: 'task',
				id: 'task-uuid',
				space_slug: 'default',
				project_id: 'project-uuid',
			}),
		).toEqual({
			kind: 'task',
			id: 'task-uuid',
			spaceSlug: 'default',
			projectId: 'project-uuid',
		})
	})

	it('没有项目归属时 projectId 为 null', () => {
		expect(
			normalizeCommandOpenPayload({
				kind: 'task',
				id: 'task-uuid',
				space_slug: 'default',
			}),
		).toEqual({
			kind: 'task',
			id: 'task-uuid',
			spaceSlug: 'default',
			projectId: null,
		})
	})

	it('忽略不完整或未知类型事件', () => {
		expect(normalizeCommandOpenPayload({ kind: 'task', id: 'task-uuid' })).toBeNull()
		expect(
			normalizeCommandOpenPayload({
				kind: 'space',
				id: 'space-uuid',
				space_slug: 'default',
			}),
		).toBeNull()
	})
})

import { normalizeCommandOpenPayload } from '@/shared/events/commandOpen'

describe('commandOpen event helpers', () => {
	it('将带项目归属的 Task 打开事件映射为前端字段', () => {
		expect(
			normalizeCommandOpenPayload({
				kind: 'task',
				id: 'task-uuid',
				space_id: 'space-uuid',
				project_id: 'project-uuid',
				placement: 'project',
			}),
		).toEqual({
			kind: 'task',
			id: 'task-uuid',
			spaceId: 'space-uuid',
			projectId: 'project-uuid',
			placement: 'project',
		})
	})

	it('没有项目归属时使用 standalone 作为默认 placement', () => {
		expect(
			normalizeCommandOpenPayload({
				kind: 'task',
				id: 'task-uuid',
				space_id: 'space-uuid',
			}),
		).toEqual({
			kind: 'task',
			id: 'task-uuid',
			spaceId: 'space-uuid',
			projectId: null,
			placement: 'standalone',
		})
	})

	it('忽略不完整或未知类型事件', () => {
		expect(normalizeCommandOpenPayload({ kind: 'task', id: 'task-uuid' })).toBeNull()
		expect(
			normalizeCommandOpenPayload({
				kind: 'space',
				id: 'space-uuid',
				space_id: 'space-uuid',
			}),
		).toBeNull()
	})
})

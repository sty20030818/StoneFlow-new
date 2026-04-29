import { invoke } from '@tauri-apps/api/core'

import { getEntityActivities } from '@/features/activity/api/getEntityActivities'

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}))

const mockedInvoke = vi.mocked(invoke)

describe('getEntityActivities', () => {
	afterEach(() => {
		mockedInvoke.mockReset()
	})

	it('将 Rust snake_case 载荷映射为前端 camelCase 结构', async () => {
		mockedInvoke.mockResolvedValue([
			{
				id: 'event-1',
				entity_type: 'task',
				entity_id: 'task-1',
				action: 'task.status.changed',
				actor_type: 'user',
				source: 'app',
				summary: '状态更新',
				metadata: { panel: 'drawer' },
				created_at: '2026-04-29T01:00:00Z',
				changes: [
					{
						id: 'change-1',
						field: 'status',
						old_value: 'todo',
						new_value: 'doing',
						created_at: '2026-04-29T01:00:00Z',
					},
				],
			},
		])

		const result = await getEntityActivities({
			entityType: 'task',
			entityId: 'task-1',
			limit: 20,
		})

		expect(mockedInvoke).toHaveBeenCalledWith('get_entity_activities', {
			input: {
				entity_type: 'task',
				entity_id: 'task-1',
				limit: 20,
			},
		})
		expect(result).toEqual([
			{
				id: 'event-1',
				entityType: 'task',
				entityId: 'task-1',
				action: 'task.status.changed',
				actorType: 'user',
				source: 'app',
				summary: '状态更新',
				metadata: { panel: 'drawer' },
				createdAt: '2026-04-29T01:00:00Z',
				changes: [
					{
						id: 'change-1',
						field: 'status',
						oldValue: 'todo',
						newValue: 'doing',
						createdAt: '2026-04-29T01:00:00Z',
					},
				],
			},
		])
	})
})

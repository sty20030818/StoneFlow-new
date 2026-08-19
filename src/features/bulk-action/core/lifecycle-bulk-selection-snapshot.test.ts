import type { LifecycleEntry } from '@/shared/types'

import { createLifecycleBulkSelectionSnapshot } from './lifecycle-bulk-selection-snapshot'

describe('createLifecycleBulkSelectionSnapshot', () => {
	it('从生命周期条目创建 bulk-bar 快照', () => {
		const entries = [
			createEntry({ id: 'space-a', entityType: 'space', title: '工作' }),
			createEntry({
				id: 'project-a',
				entityType: 'project',
				title: '阶段五',
				spaceName: '产品',
			}),
			createEntry({
				id: 'task-a',
				entityType: 'task',
				title: '批量恢复',
				projectName: '阶段五',
			}),
		]

		const snapshot = createLifecycleBulkSelectionSnapshot(entries, 'bulk-bar')

		expect(snapshot.entity).toBe('lifecycle')
		expect(snapshot.source).toBe('bulk-bar')
		expect(snapshot.ids).toEqual(['space-a', 'project-a', 'task-a'])
		expect(snapshot.entities).toEqual([
			expect.objectContaining({ id: 'space-a', title: '工作', subtitle: '空间' }),
			expect.objectContaining({
				id: 'project-a',
				title: '阶段五',
				subtitle: '项目 · 产品',
			}),
			expect.objectContaining({
				id: 'task-a',
				title: '批量恢复',
				subtitle: '阶段五',
			}),
		])
	})
})

function createEntry(overrides: Partial<LifecycleEntry> = {}): LifecycleEntry {
	return {
		id: 'entry-a',
		entityType: 'task',
		title: '生命周期条目',
		spaceId: 'space-a',
		spaceName: '工作',
		projectId: null,
		projectName: null,
		archivedAt: '2026-05-17T00:00:00.000Z',
		deletedAt: null,
		sourceType: 'self',
		sourceId: 'entry-a',
		restoreHint: '恢复提示',
		...overrides,
	}
}

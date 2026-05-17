import type { LifecycleEntry } from '@/shared/types'

import { createLifecycleBulkAdapter } from './lifecycle-bulk-adapter'

describe('LifecycleBulkAdapter', () => {
	it('restore 多 id 后只刷新一次', async () => {
		const refreshLoadedSlices = vi.fn<() => Promise<void>>(() => Promise.resolve())
		const restoreLifecycleEntry = vi.fn<(entry: LifecycleEntry) => Promise<unknown>>(() =>
			Promise.resolve({}),
		)
		const adapter = createLifecycleBulkAdapter({
			entries: [createEntry({ id: 'entry-a' }), createEntry({ id: 'entry-b' })],
			refreshLoadedSlices,
			restoreLifecycleEntry: restoreLifecycleEntry as never,
		})

		const result = await adapter.restore(['entry-a', 'entry-b'])

		expect(result).toEqual({
			requestedIds: ['entry-a', 'entry-b'],
			succeededIds: ['entry-a', 'entry-b'],
			failedIds: [],
			skippedIds: [],
		})
		expect(restoreLifecycleEntry).toHaveBeenCalledTimes(2)
		expect(refreshLoadedSlices).toHaveBeenCalledTimes(1)
	})

	it('permanent delete 单个 id 失败时不中断其余 id', async () => {
		const refreshLoadedSlices = vi.fn<() => Promise<void>>(() => Promise.resolve())
		const permanentlyDeleteLifecycleEntry = vi.fn<(entry: LifecycleEntry) => Promise<unknown>>(
			(entry) => {
				if (entry.id === 'entry-b') {
					return Promise.reject(new Error('boom'))
				}
				return Promise.resolve({})
			},
		)
		const adapter = createLifecycleBulkAdapter({
			entries: [
				createEntry({ id: 'entry-a' }),
				createEntry({ id: 'entry-b' }),
				createEntry({ id: 'entry-c' }),
			],
			permanentlyDeleteLifecycleEntry: permanentlyDeleteLifecycleEntry as never,
			refreshLoadedSlices,
		})

		const result = await adapter.deletePermanently(['entry-a', 'entry-b', 'entry-c'])

		expect(result).toEqual({
			requestedIds: ['entry-a', 'entry-b', 'entry-c'],
			succeededIds: ['entry-a', 'entry-c'],
			failedIds: ['entry-b'],
			skippedIds: [],
		})
		expect(permanentlyDeleteLifecycleEntry).toHaveBeenCalledTimes(3)
		expect(refreshLoadedSlices).toHaveBeenCalledTimes(1)
	})

	it('跳过当前切片不存在的 id', async () => {
		const refreshLoadedSlices = vi.fn<() => Promise<void>>(() => Promise.resolve())
		const restoreLifecycleEntry = vi.fn<(entry: LifecycleEntry) => Promise<unknown>>(() =>
			Promise.resolve({}),
		)
		const adapter = createLifecycleBulkAdapter({
			entries: [createEntry({ id: 'entry-a' })],
			refreshLoadedSlices,
			restoreLifecycleEntry: restoreLifecycleEntry as never,
		})

		const result = await adapter.restore(['entry-a', 'missing-entry'])

		expect(result).toEqual({
			requestedIds: ['entry-a', 'missing-entry'],
			succeededIds: ['entry-a'],
			failedIds: [],
			skippedIds: ['missing-entry'],
		})
		expect(restoreLifecycleEntry).toHaveBeenCalledTimes(1)
		expect(refreshLoadedSlices).toHaveBeenCalledTimes(1)
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

import {
	LIFECYCLE_BULK_ACTION_IDS,
	createBulkSelectionSnapshot,
	shouldConfirmAction,
} from '@/features/bulk-action'

import type { LifecycleBulkAdapter } from './lifecycle-bulk-adapter'
import { lifecycleBulkActions } from './lifecycle.bulk-actions'

const snapshot = createBulkSelectionSnapshot({
	entity: 'lifecycle',
	ids: ['entry-a', 'entry-b'],
	source: 'bulk-bar',
	entities: [
		{ id: 'entry-a', title: '条目 A' },
		{ id: 'entry-b', title: '条目 B' },
	],
})

describe('lifecycleBulkActions', () => {
	it('restore/deletePermanently 使用 adapter 执行并成功后清空 selection', async () => {
		const adapter = createAdapter()

		await expect(
			getAction(LIFECYCLE_BULK_ACTION_IDS.restoreSelected).run(snapshot, { adapter }),
		).resolves.toMatchObject({
			status: 'success',
			actionId: LIFECYCLE_BULK_ACTION_IDS.restoreSelected,
			shouldClearSelection: true,
		})
		await expect(
			getAction(LIFECYCLE_BULK_ACTION_IDS.deletePermanentlySelected).run(snapshot, {
				adapter,
			}),
		).resolves.toMatchObject({
			status: 'success',
			actionId: LIFECYCLE_BULK_ACTION_IDS.deletePermanentlySelected,
			shouldClearSelection: true,
		})

		expect(adapter.restore).toHaveBeenCalledWith(['entry-a', 'entry-b'])
		expect(adapter.deletePermanently).toHaveBeenCalledWith(['entry-a', 'entry-b'])
	})

	it('永久删除声明 destructive 确认策略', () => {
		const action = getAction(LIFECYCLE_BULK_ACTION_IDS.deletePermanentlySelected)

		expect(action.tone).toBe('destructive')
		expect(shouldConfirmAction(action, snapshot)).toBe(true)
	})

	it('缺 adapter 时返回 failed', async () => {
		await expect(
			getAction(LIFECYCLE_BULK_ACTION_IDS.restoreSelected).run(snapshot, {}),
		).resolves.toMatchObject({
			status: 'failed',
			actionId: LIFECYCLE_BULK_ACTION_IDS.restoreSelected,
		})
	})
})

function getAction(actionId: string) {
	const action = lifecycleBulkActions.find((item) => item.id === actionId)
	if (!action) {
		throw new Error(`missing test action: ${actionId}`)
	}
	return action
}

function createAdapter(overrides: Partial<LifecycleBulkAdapter> = {}): LifecycleBulkAdapter {
	const report = {
		requestedIds: ['entry-a', 'entry-b'],
		succeededIds: ['entry-a', 'entry-b'],
		failedIds: [],
		skippedIds: [],
	}

	return {
		restore: vi.fn<LifecycleBulkAdapter['restore']>(() => Promise.resolve(report)),
		deleteLifecycle: vi.fn<LifecycleBulkAdapter['deleteLifecycle']>(() => Promise.resolve(report)),
		deletePermanently: vi.fn<LifecycleBulkAdapter['deletePermanently']>(() =>
			Promise.resolve(report),
		),
		...overrides,
	}
}

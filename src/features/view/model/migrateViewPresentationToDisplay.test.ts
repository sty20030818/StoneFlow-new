import { beforeEach, describe, expect, it, vi } from 'vitest'

import { EMPTY_FILTER_QUERY } from '@/shared/types'

const updateTaskDisplayPreference = vi.fn()
const updateView = vi.fn()
const listCustomViewRawRecords = vi.fn()

vi.mock('@/features/display-options', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@/features/display-options')>()
	return {
		...actual,
		updateTaskDisplayPreference: (...args: unknown[]) => updateTaskDisplayPreference(...args),
	}
})

vi.mock('../api/views', () => ({
	listCustomViewRawRecords: (...args: unknown[]) => listCustomViewRawRecords(...args),
	updateView: (...args: unknown[]) => updateView(...args),
}))

import { migrateViewPresentationToDisplay } from './migrateViewPresentationToDisplay'

describe('migrateViewPresentationToDisplay', () => {
	beforeEach(() => {
		updateTaskDisplayPreference.mockReset()
		updateView.mockReset()
		listCustomViewRawRecords.mockReset()
		updateTaskDisplayPreference.mockResolvedValue({ personal: null, workspaceDefault: null })
		updateView.mockResolvedValue({
			id: 'x',
			name: 'x',
			kind: 'custom',
			systemKey: null,
			scope: { type: 'all' },
			filters: EMPTY_FILTER_QUERY,
			position: 0,
			createdAt: '',
			updatedAt: '',
		})
	})

	it('跳过已空呈现', async () => {
		listCustomViewRawRecords.mockResolvedValue([
			{ id: 'c1', filters: EMPTY_FILTER_QUERY, sort: [], groupBy: 'none' },
		])
		const result = await migrateViewPresentationToDisplay()
		expect(result).toEqual({ migrated: 0, skipped: 1 })
		expect(updateView).not.toHaveBeenCalled()
	})

	it('迁移 sort/group 到 display default 并 updateView', async () => {
		listCustomViewRawRecords.mockResolvedValue([
			{
				id: 'c2',
				filters: EMPTY_FILTER_QUERY,
				sort: [{ field: 'priority', direction: 'desc' }],
				groupBy: 'status',
			},
		])
		const result = await migrateViewPresentationToDisplay()
		expect(result.migrated).toBe(1)
		expect(updateTaskDisplayPreference).toHaveBeenCalledWith({
			pageKey: 'task:view:c2',
			workspaceDefault: {
				groupBy: 'status',
				orderBy: 'priority',
				orderDirection: 'desc',
			},
		})
		expect(updateView).toHaveBeenCalledWith({
			viewId: 'c2',
			filters: EMPTY_FILTER_QUERY,
		})
	})
})

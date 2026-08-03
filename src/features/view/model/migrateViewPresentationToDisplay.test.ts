import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { View } from '@/shared/types'
import { EMPTY_FILTER_QUERY } from '@/shared/types'

const updateTaskDisplayPreference = vi.fn()
const updateView = vi.fn()

vi.mock('@/features/display-options/api/displayOptions', () => ({
	updateTaskDisplayPreference: (...args: unknown[]) => updateTaskDisplayPreference(...args),
}))

vi.mock('../api/views', () => ({
	updateView: (...args: unknown[]) => updateView(...args),
}))

import { migrateViewPresentationToDisplay } from './migrateViewPresentationToDisplay'

function makeView(partial: Partial<View> & Pick<View, 'id'>): View {
	return {
		id: partial.id,
		name: partial.name ?? 'v',
		kind: partial.kind ?? 'custom',
		systemKey: partial.systemKey ?? null,
		scope: partial.scope ?? { type: 'all' },
		filters: partial.filters ?? EMPTY_FILTER_QUERY,
		sort: partial.sort ?? [],
		groupBy: partial.groupBy ?? 'none',
		position: partial.position ?? 0,
		createdAt: '',
		updatedAt: '',
	}
}

describe('migrateViewPresentationToDisplay', () => {
	beforeEach(() => {
		updateTaskDisplayPreference.mockReset()
		updateView.mockReset()
		updateTaskDisplayPreference.mockResolvedValue({ personal: null, workspaceDefault: null })
		updateView.mockResolvedValue(makeView({ id: 'x' }))
	})

	it('跳过 system 与已空呈现', async () => {
		const result = await migrateViewPresentationToDisplay([
			makeView({ id: 'all', kind: 'system', systemKey: 'all' }),
			makeView({ id: 'c1', sort: [], groupBy: 'none' }),
		])
		expect(result).toEqual({ migrated: 0, skipped: 2 })
		expect(updateView).not.toHaveBeenCalled()
	})

	it('迁移 sort/group 到 display default 并 updateView', async () => {
		const result = await migrateViewPresentationToDisplay([
			makeView({
				id: 'c2',
				sort: [{ field: 'priority', direction: 'desc' }],
				groupBy: 'status',
			}),
		])
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

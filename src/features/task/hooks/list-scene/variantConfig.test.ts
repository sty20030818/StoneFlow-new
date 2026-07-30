import { describe, expect, it } from 'vitest'

import { TASK_LIST_PAGE_VIEW_KEY, VARIANT_CONFIG } from './variantConfig'

describe('task list variantConfig', () => {
	it('所有任务页 viewKey 固定为 all（All 与单 Space 同语义）', () => {
		expect(TASK_LIST_PAGE_VIEW_KEY).toBe('all')
		expect(VARIANT_CONFIG.all.placement).toEqual({ kind: 'all' })
	})

	it('standalone 使用独立 placement', () => {
		expect(VARIANT_CONFIG.standalone.placement).toEqual({ kind: 'standalone' })
	})
})

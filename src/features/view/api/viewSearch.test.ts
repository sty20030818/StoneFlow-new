import { describe, expect, it } from 'vitest'

import { encodeFilterQueryToSearchParam, createFilterClause } from '@/features/filter'

import { parseViewSearch } from './viewSearch'

describe('parseViewSearch', () => {
	it('只保留 f，丢弃旧扁平键', () => {
		const f = encodeFilterQueryToSearchParam({
			clauses: [createFilterClause('status', 'is', ['todo'])],
		})
		const result = parseViewSearch({
			f: f!,
			status: 'doing',
			due: 'overdue',
			sortField: 'dueAt',
			groupBy: 'status',
		})

		expect(result).toEqual({ f })
		expect('filters' in result).toBe(false)
		expect('sort' in result).toBe(false)
		expect('groupBy' in result).toBe(false)
	})

	it('无 f 时返回空对象', () => {
		expect(parseViewSearch({ status: 'todo' })).toEqual({})
	})
})

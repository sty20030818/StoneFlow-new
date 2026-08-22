import { describe, expect, it } from 'vitest'

import { createFilterClause, filterQueriesEqual } from './normalize'
import { decodeFilterQueryFromSearchParam, encodeFilterQueryToSearchParam } from './url-codec'
import { EMPTY_FILTER_QUERY } from './types'

describe('FilterQuery URL codec', () => {
	it('空查询编码为显式 draft，null 表示无 draft', () => {
		const encoded = encodeFilterQueryToSearchParam(EMPTY_FILTER_QUERY)
		expect(encoded).toBeTruthy()
		expect(decodeFilterQueryFromSearchParam(encoded)).toEqual(EMPTY_FILTER_QUERY)
		expect(encodeFilterQueryToSearchParam(null)).toBeNull()
		expect(decodeFilterQueryFromSearchParam(null)).toBeNull()
	})

	it('round-trip 保留 field/op/values 语义', () => {
		const query = {
			clauses: [
				createFilterClause('priority', 'is', ['4', '3'], 'id-p'),
				createFilterClause('status', 'is_not', ['canceled'], 'id-s'),
			],
		}
		const encoded = encodeFilterQueryToSearchParam(query)
		expect(encoded).toBeTruthy()
		expect(encoded).not.toMatch(/[+/=]/)

		const decoded = decodeFilterQueryFromSearchParam(encoded)
		expect(filterQueriesEqual(decoded, query)).toBe(true)
		// id 应尽量保留
		expect(decoded!.clauses.some((c) => c.id === 'id-p' || c.id === 'id-s')).toBe(true)
	})

	it('非法 / 缺失参数 → 无 draft', () => {
		expect(decodeFilterQueryFromSearchParam('%%%not-base64%%%')).toBeNull()
		const invalidClause = btoa(
			JSON.stringify({ v: 1, c: [{ i: 'bad', f: 'unknown', o: 'is', v: ['todo'] }] }),
		)
		expect(decodeFilterQueryFromSearchParam(invalidClause)).toBeNull()
		const partlyInvalidClause = btoa(
			JSON.stringify({
				v: 1,
				c: [{ i: 'bad-value', f: 'status', o: 'is', v: ['todo', 'unknown'] }],
			}),
		)
		expect(decodeFilterQueryFromSearchParam(partlyInvalidClause)).toBeNull()
		expect(decodeFilterQueryFromSearchParam('')).toBeNull()
		expect(decodeFilterQueryFromSearchParam(undefined)).toBeNull()
	})
})

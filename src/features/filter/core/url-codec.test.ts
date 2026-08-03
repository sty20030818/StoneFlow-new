import { describe, expect, it } from 'vitest'

import { createFilterClause, filterQueriesEqual, isFilterQueryEmpty } from './normalize'
import {
	decodeFilterQueryFromSearchParam,
	encodeFilterQueryToSearchParam,
	FILTER_SEARCH_PARAM_KEY,
	mergeFilterQueryIntoSearch,
	readFilterQueryFromSearch,
} from './url-codec'
import { EMPTY_FILTER_QUERY } from './types'

describe('FilterQuery URL codec', () => {
	it('空查询编码为 null', () => {
		expect(encodeFilterQueryToSearchParam(EMPTY_FILTER_QUERY)).toBeNull()
		expect(encodeFilterQueryToSearchParam(null)).toBeNull()
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
		expect(decoded.clauses.some((c) => c.id === 'id-p' || c.id === 'id-s')).toBe(true)
	})

	it('非法 / 损坏参数 → empty', () => {
		expect(decodeFilterQueryFromSearchParam('%%%not-base64%%%')).toEqual(EMPTY_FILTER_QUERY)
		expect(decodeFilterQueryFromSearchParam('')).toEqual(EMPTY_FILTER_QUERY)
		expect(decodeFilterQueryFromSearchParam(undefined)).toEqual(EMPTY_FILTER_QUERY)
	})

	it('mergeFilterQueryIntoSearch 写入与清除 f', () => {
		const query = { clauses: [createFilterClause('status', 'is', ['todo'])] }
		const withF = mergeFilterQueryIntoSearch({ tab: 'all' }, query)
		expect(withF.tab).toBe('all')
		expect(typeof withF[FILTER_SEARCH_PARAM_KEY]).toBe('string')

		const cleared = mergeFilterQueryIntoSearch(withF, EMPTY_FILTER_QUERY)
		expect(cleared.tab).toBe('all')
		expect(cleared[FILTER_SEARCH_PARAM_KEY]).toBeUndefined()
		expect(isFilterQueryEmpty(readFilterQueryFromSearch(cleared))).toBe(true)
	})

	it('readFilterQueryFromSearch 读取 f', () => {
		const query = { clauses: [createFilterClause('due', 'is', ['today'])] }
		const search = mergeFilterQueryIntoSearch({}, query)
		expect(filterQueriesEqual(readFilterQueryFromSearch(search), query)).toBe(true)
	})
})

import { describe, expect, it } from 'vitest'

import {
	createFilterClause,
	EMPTY_FILTER_QUERY,
	encodeFilterQueryToSearchParam,
	FILTER_SEARCH_PARAM_KEY,
	normalizeFilterQuery,
} from '../core'
import { parseListFilterSearch } from './useListFilterSession'

describe('parseListFilterSearch', () => {
	it('保留合法 f，丢弃空', () => {
		const encoded = encodeFilterQueryToSearchParam({
			clauses: [createFilterClause('status', 'is', ['todo'])],
		})
		expect(parseListFilterSearch({ f: encoded!, other: 1 })).toEqual({
			[FILTER_SEARCH_PARAM_KEY]: encoded,
		})
		expect(parseListFilterSearch({ f: '' })).toEqual({})
		expect(parseListFilterSearch({})).toEqual({})
	})
})

describe('effective 语义（纯函数对照）', () => {
	it('temp 空 → effective = base', () => {
		const base = normalizeFilterQuery({
			clauses: [createFilterClause('priority', 'is', ['4'])],
		})
		const temp = EMPTY_FILTER_QUERY
		const dirty = temp.clauses.length > 0
		const effective = dirty ? temp : base
		expect(effective).toEqual(base)
	})

	it('temp 非空 → effective = temp', () => {
		const base = normalizeFilterQuery({
			clauses: [createFilterClause('priority', 'is', ['4'])],
		})
		const temp = normalizeFilterQuery({
			clauses: [createFilterClause('status', 'is', ['doing'])],
		})
		const dirty = temp.clauses.length > 0
		const effective = dirty ? temp : base
		expect(effective).toEqual(temp)
	})
})

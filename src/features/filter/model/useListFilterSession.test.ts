import { describe, expect, it } from 'vitest'

import {
	createFilterClause,
	encodeFilterQueryToSearchParam,
	FILTER_SEARCH_PARAM_KEY,
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

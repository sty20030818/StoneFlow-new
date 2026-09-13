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

	it('损坏的 UTF-8 不得替换为可执行的项目排除条件', () => {
		const invalidUtf8 = btoa(
			'{"v":1,"c":[{"i":"bad","f":"project","o":"is_not","v":["' +
				String.fromCharCode(255) +
				'"]}]}',
		)
		expect(() => decodeFilterQueryFromSearchParam(invalidUtf8)).toThrow('筛选链接无效')
	})

	it('缺失参数没有 draft，非法参数明确失败', () => {
		expect(() => decodeFilterQueryFromSearchParam('%%%not-base64%%%')).toThrow('筛选链接无效')
		const invalidClause = btoa(
			JSON.stringify({ v: 1, c: [{ i: 'bad', f: 'unknown', o: 'is', v: ['todo'] }] }),
		)
		expect(() => decodeFilterQueryFromSearchParam(invalidClause)).toThrow('筛选链接无效')
		const partlyInvalidClause = btoa(
			JSON.stringify({
				v: 1,
				c: [{ i: 'bad-value', f: 'status', o: 'is', v: ['todo', 'unknown'] }],
			}),
		)
		expect(() => decodeFilterQueryFromSearchParam(partlyInvalidClause)).toThrow('筛选链接无效')
		expect(() => decodeFilterQueryFromSearchParam('')).toThrow('筛选链接无效')
		expect(decodeFilterQueryFromSearchParam(undefined)).toBeNull()
	})
})

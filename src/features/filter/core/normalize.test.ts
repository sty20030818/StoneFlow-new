import { describe, expect, it } from 'vitest'

import {
	createFilterClause,
	filterQueriesEqual,
	isFilterQueryEmpty,
	normalizeFilterQuery,
	removeFilterField,
	setFilterFieldClause,
} from './normalize'
import { EMPTY_FILTER_QUERY } from './types'

describe('normalizeFilterQuery', () => {
	it('空 / 非法输入 → empty', () => {
		expect(normalizeFilterQuery(null)).toEqual(EMPTY_FILTER_QUERY)
		expect(normalizeFilterQuery(undefined)).toEqual(EMPTY_FILTER_QUERY)
		expect(normalizeFilterQuery({ clauses: [] })).toEqual(EMPTY_FILTER_QUERY)
		expect(
			normalizeFilterQuery({ clauses: [{ id: '1', field: 'status', op: 'is', values: [] }] }),
		).toEqual(EMPTY_FILTER_QUERY)
	})

	it('丢弃非法 field / op / value', () => {
		const result = normalizeFilterQuery({
			clauses: [
				{ id: 'a', field: 'status', op: 'is', values: ['todo', 'not-a-status'] },
				// @ts-expect-error 非法 field
				{ id: 'b', field: 'assignee', op: 'is', values: ['x'] },
				// @ts-expect-error 非法 op
				{ id: 'c', field: 'priority', op: 'includes', values: ['1'] },
			],
		})
		expect(result.clauses).toHaveLength(1)
		expect(result.clauses[0]?.field).toBe('status')
		expect(result.clauses[0]?.values).toEqual(['todo'])
	})

	it('同 field+op 合并 values 并稳定排序', () => {
		const result = normalizeFilterQuery({
			clauses: [
				createFilterClause('priority', 'is', ['1'], 'p1'),
				createFilterClause('priority', 'is', ['3', '1'], 'p2'),
				createFilterClause('status', 'is', ['done', 'todo'], 's1'),
			],
		})
		expect(result.clauses.map((c) => c.field)).toEqual(['status', 'priority'])
		const priority = result.clauses.find((c) => c.field === 'priority')
		expect(priority?.id).toBe('p1')
		expect(priority?.values).toEqual(['3', '1'])
		const status = result.clauses.find((c) => c.field === 'status')
		expect(status?.values).toEqual(['todo', 'done'])
	})

	it('project __none__ 与 id 合法', () => {
		const result = normalizeFilterQuery({
			clauses: [createFilterClause('project', 'is', ['__none__', 'proj-1'])],
		})
		expect(result.clauses[0]?.values).toContain('__none__')
		expect(result.clauses[0]?.values).toContain('proj-1')
	})
})

describe('isFilterQueryEmpty / filterQueriesEqual', () => {
	it('empty 判定', () => {
		expect(isFilterQueryEmpty(EMPTY_FILTER_QUERY)).toBe(true)
		expect(isFilterQueryEmpty({ clauses: [createFilterClause('status', 'is', ['todo'])] })).toBe(
			false,
		)
	})

	it('相等忽略 id 差异、依赖 normalize', () => {
		const a = {
			clauses: [createFilterClause('status', 'is', ['todo', 'doing'], 'a')],
		}
		const b = {
			clauses: [
				createFilterClause('status', 'is', ['doing'], 'b1'),
				createFilterClause('status', 'is', ['todo'], 'b2'),
			],
		}
		expect(filterQueriesEqual(a, b)).toBe(true)
		expect(
			filterQueriesEqual(a, { clauses: [createFilterClause('status', 'is', ['todo'], 'x')] }),
		).toBe(false)
	})
})

describe('setFilterFieldClause / removeFilterField', () => {
	it('写入并替换同 field', () => {
		const base = { clauses: [createFilterClause('status', 'is', ['todo'], 's1')] }
		const next = setFilterFieldClause(base, 'status', 'is', ['doing'])
		expect(next.clauses).toHaveLength(1)
		expect(next.clauses[0]?.values).toEqual(['doing'])
	})

	it('values 空则删除 field', () => {
		const base = {
			clauses: [
				createFilterClause('status', 'is', ['todo'], 's1'),
				createFilterClause('priority', 'is', ['4'], 'p1'),
			],
		}
		expect(setFilterFieldClause(base, 'status', 'is', []).clauses.map((c) => c.field)).toEqual([
			'priority',
		])
		expect(removeFilterField(base, 'priority').clauses.map((c) => c.field)).toEqual(['status'])
	})
})

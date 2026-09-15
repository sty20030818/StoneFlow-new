import { describe, expect, it } from 'vitest'

import {
	createFilterClause,
	filterQueriesEqual,
	isFilterQueryEmpty,
	normalizeFilterQuery,
} from './normalize'
import { EMPTY_FILTER_QUERY, type FilterQuery } from './types'
import semanticCases from '../../../../tests/fixtures/filter-query-semantics.json'

describe('normalizeFilterQuery', () => {
	it('只有显式空 clauses 表示 empty', () => {
		expect(normalizeFilterQuery({ clauses: [] })).toEqual(EMPTY_FILTER_QUERY)
		expect(() =>
			normalizeFilterQuery({ clauses: [{ id: '1', field: 'status', op: 'is', values: [] }] }),
		).toThrow('筛选')
	})

	it('非法字段、操作符、值和不完整结构明确失败', () => {
		const bad = [
			null,
			undefined,
			{ clauses: [{ id: 'a', field: 'status', op: 'is', values: ['todo', 'not-a-status'] }] },
			{ clauses: [{ id: 'b', field: 'assignee', op: 'is', values: ['x'] }] },
			{ clauses: [{ id: 'c', field: 'priority', op: 'includes', values: ['1'] }] },
			{ clauses: [{ id: 'p', field: 'priority', op: 'is', values: ['01'] }] },
			{ clauses: [{ id: 'p', field: 'project', op: 'is', values: [' project-1 '] }] },
			{},
		]
		for (const query of bad) {
			expect(() => normalizeFilterQuery(query as never)).toThrow('筛选')
		}
	})

	it('同 field/op 保留 AND，仅条内去重和完全相同条件等价去重', () => {
		const result = normalizeFilterQuery({
			clauses: [
				createFilterClause('priority', 'is', ['1'], 'p1'),
				createFilterClause('priority', 'is', ['3', '1', '3'], 'p2'),
				createFilterClause('status', 'is', ['done', 'todo'], 's1'),
				createFilterClause('status', 'is', ['todo', 'done'], 's2'),
			],
		})
		expect(result.clauses.map((c) => c.id)).toEqual(['s1', 'p1', 'p2'])
		expect(result.clauses.map((c) => c.values)).toEqual([['todo', 'done'], ['1'], ['3', '1']])
	})

	it('缺失或重复身份不会让编辑同时修改两条不同条件', () => {
		const query = {
			clauses: [
				createFilterClause('status', 'is', ['todo'], 'duplicate'),
				createFilterClause('status', 'is_not', ['done'], 'duplicate'),
				createFilterClause('priority', 'is', ['4'], ''),
			],
		}
		const ids = normalizeFilterQuery(query).clauses.map((c) => c.id)
		expect(new Set(ids).size).toBe(3)
		expect(ids.every(Boolean)).toBe(true)
		expect(normalizeFilterQuery(query).clauses.map((c) => c.id)).toEqual(ids)
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

	it('相等忽略 id，但同字段的 AND 不等于 OR', () => {
		const a = {
			clauses: [createFilterClause('status', 'is', ['todo', 'doing'], 'a')],
		}
		const b = {
			clauses: [
				createFilterClause('status', 'is', ['doing'], 'b1'),
				createFilterClause('status', 'is', ['todo'], 'b2'),
			],
		}
		expect(filterQueriesEqual(a, b)).toBe(false)
		expect(
			filterQueriesEqual(a, {
				clauses: [createFilterClause('status', 'is', ['doing', 'todo'], 'other')],
			}),
		).toBe(true)
		expect(
			filterQueriesEqual(a, { clauses: [createFilterClause('status', 'is', ['todo'], 'x')] }),
		).toBe(false)
	})
})

describe('前端与 SQLite 共用语义样例', () => {
	it.each(semanticCases)('$name', ({ raw, normalized }) => {
		expect(normalizeFilterQuery(raw as FilterQuery)).toEqual(normalized)
		expect(normalizeFilterQuery(normalized as FilterQuery)).toEqual(normalized)
	})
})

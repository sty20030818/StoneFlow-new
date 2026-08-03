import { describe, expect, it, vi } from 'vitest'

import { adaptFilterQueryToListTasks, adaptFilterQueryToViewFilters } from './adapt'
import { createFilterClause } from './normalize'
import { FILTER_PROJECT_NONE_VALUE } from './types'

describe('adaptFilterQueryToListTasks', () => {
	it('status is → statuses 白名单', () => {
		const patch = adaptFilterQueryToListTasks({
			clauses: [createFilterClause('status', 'is', ['todo', 'doing'])],
		})
		expect(patch.statuses).toEqual(['todo', 'doing'])
	})

	it('status is_not → 补集白名单', () => {
		const patch = adaptFilterQueryToListTasks({
			clauses: [createFilterClause('status', 'is_not', ['done', 'canceled'])],
		})
		expect(patch.statuses).toEqual(['todo', 'doing', 'waiting'])
	})

	it('priority is / is_not', () => {
		expect(
			adaptFilterQueryToListTasks({
				clauses: [createFilterClause('priority', 'is', ['4', '2'])],
			}).priorities,
		).toEqual([4, 2])

		expect(
			adaptFilterQueryToListTasks({
				clauses: [createFilterClause('priority', 'is_not', ['0'])],
			}).priorities,
		).toEqual([1, 2, 3, 4])
	})

	it('due today 编码为本地日 range', () => {
		vi.useFakeTimers()
		vi.setSystemTime(new Date(2026, 7, 3, 15, 0, 0))
		const patch = adaptFilterQueryToListTasks({
			clauses: [createFilterClause('due', 'is', ['today'])],
		})
		expect(patch.dateFilter?.mode).toBe('range')
		if (patch.dateFilter?.mode === 'range') {
			expect(new Date(patch.dateFilter.from!).getDate()).toBe(3)
			expect(new Date(patch.dateFilter.to!).getDate()).toBe(3)
		}
		vi.useRealTimers()
	})

	it('hasDate / noDate', () => {
		expect(
			adaptFilterQueryToListTasks({
				clauses: [createFilterClause('due', 'is', ['hasDate'])],
			}).dateFilter,
		).toEqual({ mode: 'hasDate' })
		expect(
			adaptFilterQueryToListTasks({
				clauses: [createFilterClause('planned', 'is', ['noDate'])],
			}).dateFilter,
		).toEqual({ mode: 'noDate' })
	})

	it('project specific / none', () => {
		expect(
			adaptFilterQueryToListTasks({
				clauses: [createFilterClause('project', 'is', ['proj-a'])],
			}).project,
		).toEqual({ mode: 'specific', projectId: 'proj-a' })

		expect(
			adaptFilterQueryToListTasks({
				clauses: [createFilterClause('project', 'is', [FILTER_PROJECT_NONE_VALUE])],
			}).project,
		).toEqual({ mode: 'none' })
	})

	it('due 优先于 planned 写 dateFilter', () => {
		const patch = adaptFilterQueryToListTasks({
			clauses: [
				createFilterClause('planned', 'is', ['overdue']),
				createFilterClause('due', 'is', ['hasDate']),
			],
		})
		expect(patch.dateFilter).toEqual({ mode: 'hasDate' })
	})
})

describe('adaptFilterQueryToViewFilters', () => {
	it('归一化后原样作为 run 覆盖', () => {
		const filters = adaptFilterQueryToViewFilters({
			clauses: [
				createFilterClause('status', 'is', ['doing', 'todo']),
				createFilterClause('project', 'is', ['p1']),
			],
		})
		expect(filters.clauses.map((c) => c.field)).toEqual(['status', 'project'])
		expect(filters.clauses.find((c) => c.field === 'status')?.values).toEqual(['todo', 'doing'])
	})
})

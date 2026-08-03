import { describe, expect, it } from 'vitest'

import { parseViewSearch } from './viewSearch'

describe('parseViewSearch', () => {
	it('把 URL search 恢复为 FilterQuery + 请求期 sort/group', () => {
		const result = parseViewSearch({
			status: 'todo,doing,unknown',
			due: 'overdue',
			planned: 'future',
			projectMode: 'specific',
			projectIds: 'project-a,project-b',
			sortField: 'dueAt',
			sortDirection: 'asc',
			groupBy: 'planned',
			ignored: 'x',
		})

		expect(result.sort).toEqual([{ field: 'dueAt', direction: 'asc' }])
		expect(result.groupBy).toBe('planned')
		expect(result.filters.clauses.map((c) => c.field).sort()).toEqual(
			['due', 'planned', 'project', 'status'].sort(),
		)
		const status = result.filters.clauses.find((c) => c.field === 'status')
		expect(status?.values).toEqual(['todo', 'doing'])
		const due = result.filters.clauses.find((c) => c.field === 'due')
		expect(due?.values).toEqual(['overdue'])
		const project = result.filters.clauses.find((c) => c.field === 'project')
		expect(project?.values).toEqual(['project-a', 'project-b'])
	})
})

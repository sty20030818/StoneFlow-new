import { describe, expect, it } from 'vitest'

import { parseViewSearch } from './viewSearch'

describe('parseViewSearch', () => {
	it('把 URL search 恢复为受限 View 查询定义', () => {
		expect(
			parseViewSearch({
				status: 'todo,doing,unknown',
				due: 'overdue',
				planned: 'future',
				projectMode: 'specific',
				projectIds: 'project-a,project-b',
				sortField: 'dueAt',
				sortDirection: 'asc',
				groupBy: 'planned',
				ignored: 'x',
			}),
		).toEqual({
			filters: {
				status: ['todo', 'doing'],
				due: { mode: 'overdue' },
				planned: { mode: 'future' },
				project: { mode: 'specific', ids: ['project-a', 'project-b'] },
			},
			sort: [{ field: 'dueAt', direction: 'asc' }],
			groupBy: 'planned',
		})
	})
})

import { createFilterClause, FILTER_PROJECT_NONE_VALUE } from '../core'
import { formatClauseValuesSummary } from './filterLabels'

describe('formatClauseValuesSummary', () => {
	it.each([
		['status', ['todo', 'doing', 'waiting', 'done'], '4 个状态'],
		['priority', ['3', '4'], '2 个优先级'],
		['project', ['project-1', 'project-2'], '2 个项目'],
		['due', ['today', 'tomorrow'], '2 个日期条件'],
		['planned', ['today', 'tomorrow', 'future'], '3 个日期条件'],
	] as const)('%s 多选只展示完整数量和属性名', (field, values, expected) => {
		const clause = createFilterClause(field, 'is', [...values], 'filter')

		expect(formatClauseValuesSummary(clause)).toBe(expected)
	})

	it.each([
		['status', 'doing', '进行中'],
		['priority', '3', '高'],
		['project', 'project-1', '项目一'],
		['project', FILTER_PROJECT_NONE_VALUE, '独立事项'],
		['project', 'missing-project', 'missing-project'],
		['due', 'today', '今天'],
		['planned', 'tomorrow', '明天'],
	] as const)('%s 单选 %s 保留原值名称与既有回退', (field, value, expected) => {
		const clause = createFilterClause(field, 'is', [value], 'filter')

		expect(formatClauseValuesSummary(clause, [{ id: 'project-1', name: '项目一' }])).toBe(expected)
	})
})

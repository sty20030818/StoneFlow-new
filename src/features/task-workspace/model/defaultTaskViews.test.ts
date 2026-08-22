import { describe, expect, it } from 'vitest'

import { getDefaultTaskViews } from './defaultTaskViews'

describe('getDefaultTaskViews', () => {
	it.each([
		['all', false, ['incomplete', 'today', 'upcoming', 'all'], 'incomplete'],
		['standalone', false, ['incomplete', 'today', 'all'], 'incomplete'],
		['project', false, ['incomplete', 'today', 'upcoming', 'completed', 'all'], 'incomplete'],
		['project', true, ['all', 'completed', 'incomplete'], 'all'],
	] as const)(
		'%s 页面提供确定的默认视图',
		(contextKind, projectCompleted, expectedKeys, expectedDefaultKey) => {
			const result = getDefaultTaskViews({
				context:
					contextKind === 'project'
						? { kind: 'project', projectId: 'project-1' }
						: { kind: contextKind },
				projectCompleted,
			})

			expect(result.options.map((option) => option.key)).toEqual(expectedKeys)
			expect(result.defaultKey).toBe(expectedDefaultKey)
		},
	)

	it('默认视图只描述稳定查询基线，不创建持久化 View 实体', () => {
		const result = getDefaultTaskViews({ context: { kind: 'all' }, projectCompleted: false })

		expect(result.options).toEqual([
			{ key: 'incomplete', label: '未完成', baseViewKey: 'active' },
			{ key: 'today', label: '今天', baseViewKey: 'today' },
			{ key: 'upcoming', label: '即将到期', baseViewKey: 'upcoming' },
			{ key: 'all', label: '全部', baseViewKey: 'all' },
		])
	})
})

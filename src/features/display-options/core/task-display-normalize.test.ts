import { describe, expect, it } from 'vitest'

import {
	createTaskDisplayViewPageKey,
	getTaskDisplayPageKind,
	isTaskDisplayPageKey,
	resolveTaskDisplayOptions,
} from './index'

describe('display-page-key', () => {
	it('支持 task:view:<id> 形式的页面键', () => {
		const pageKey = createTaskDisplayViewPageKey('view-123')

		expect(pageKey).toBe('task:view:view-123')
		expect(isTaskDisplayPageKey(pageKey)).toBe(true)
		expect(getTaskDisplayPageKind(pageKey)).toBe('task:view')
	})

	it('拒绝空的 view 页面键', () => {
		expect(isTaskDisplayPageKey('task:view:')).toBe(false)
	})
})

describe('resolveTaskDisplayOptions', () => {
	it('返回 task:all 的系统默认值', () => {
		expect(resolveTaskDisplayOptions({ pageKey: 'task:all' })).toEqual({
			groupBy: 'status',
			subGroupBy: 'none',
			orderBy: 'smart',
			orderDirection: 'desc',
			completedOrder: 'recency',
			showCompleted: false,
			showEmptyGroups: false,
			visibleProperties: ['status', 'priority', 'project', 'dueAt'],
		})
	})

	it('按 system -> workspace -> personal 顺序合并偏好', () => {
		expect(
			resolveTaskDisplayOptions({
				pageKey: 'task:project-detail',
				workspaceDefault: {
					groupBy: 'priority',
					showEmptyGroups: true,
				},
				personalOverride: {
					groupBy: 'status',
					orderBy: 'priority',
					visibleProperties: ['status', 'updatedAt'],
				},
			}),
		).toEqual({
			groupBy: 'status',
			subGroupBy: 'none',
			orderBy: 'priority',
			orderDirection: 'asc',
			completedOrder: 'recency',
			showCompleted: true,
			showEmptyGroups: true,
			visibleProperties: ['status', 'updatedAt'],
		})
	})

	it('在不支持 manual 的页面回退到默认排序', () => {
		expect(
			resolveTaskDisplayOptions({
				pageKey: 'task:all',
				personalOverride: {
					orderBy: 'manual',
				},
			}).orderBy,
		).toBe('smart')
	})

	it('裁剪页面不支持的子分组', () => {
		expect(
			resolveTaskDisplayOptions({
				pageKey: 'task:today',
				personalOverride: {
					subGroupBy: 'scheduled',
				},
			}),
		).toMatchObject({
			subGroupBy: 'none',
		})
	})

	it('去重并过滤无效的 visibleProperties', () => {
		const resolved = resolveTaskDisplayOptions({
			pageKey: 'task:all',
			personalOverride: {
				visibleProperties: ['project', 'project', 'updatedAt', 'status', 'invalid' as never],
			},
		})

		expect(resolved.visibleProperties).toEqual(['project', 'updatedAt', 'status'])
	})
})

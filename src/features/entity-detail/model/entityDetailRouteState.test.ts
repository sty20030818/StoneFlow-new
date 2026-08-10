import { describe, expect, it } from 'vitest'

import {
	buildEntityDetailSearch,
	clearEntityDetailSearch,
	parseEntityDetailRouteState,
} from './entityDetailRouteState'

describe('entityDetailRouteState', () => {
	it('没有 detail query 时返回 null', () => {
		expect(parseEntityDetailRouteState('?view=today')).toEqual({
			activeDetail: null,
			shouldCleanSearch: false,
		})
	})

	it('解析 task query', () => {
		expect(parseEntityDetailRouteState('?task=task-a')).toEqual({
			activeDetail: { kind: 'task', id: 'task-a' },
			shouldCleanSearch: false,
		})
	})

	it('project query 属于已移除的抽屉契约并要求清理', () => {
		expect(parseEntityDetailRouteState('?project=project-a')).toEqual({
			activeDetail: null,
			shouldCleanSearch: true,
		})
	})

	it('task 和 project 同时存在时优先 task 并要求清理', () => {
		expect(parseEntityDetailRouteState('?task=task-a&project=project-a')).toEqual({
			activeDetail: { kind: 'task', id: 'task-a' },
			shouldCleanSearch: true,
		})
	})

	it('写入 task 时删除 project 并保留其他 query', () => {
		expect(
			buildEntityDetailSearch('?view=today&project=project-a', { kind: 'task', id: 'task-a' }),
		).toBe('?view=today&task=task-a')
	})

	it('关闭时只删除 detail query 并保留其他 query', () => {
		expect(clearEntityDetailSearch('?view=today&task=task-a&filter=open')).toBe(
			'?view=today&filter=open',
		)
	})

	it('空 id 和空白 id 视为无效并要求清理 query', () => {
		expect(parseEntityDetailRouteState('?task=')).toEqual({
			activeDetail: null,
			shouldCleanSearch: true,
		})
		expect(parseEntityDetailRouteState('?project=%20%20')).toEqual({
			activeDetail: null,
			shouldCleanSearch: true,
		})
	})
})

import { beforeEach, describe, expect, it } from 'vitest'

import {
	buildTaskDisplayPreferenceStorageKey,
	getTaskDisplayPreference,
	updateTaskDisplayPreference,
} from './displayOptions'

const DISPLAY_OPTIONS_KEY = 'stoneflow.display-options.task:task:all'

describe('displayOptions api', () => {
	beforeEach(() => {
		localStorage.clear()
	})

	it('storage key 按 pageKey 生成', () => {
		expect(buildTaskDisplayPreferenceStorageKey('task:all')).toBe('task:task:all')
	})

	it('读取不存在的页面偏好时返回空 payload', async () => {
		await expect(getTaskDisplayPreference('task:all')).resolves.toEqual({
			personal: null,
			workspaceDefault: null,
		})
	})

	it('写入 personal 偏好后能回读规范化结果', async () => {
		await updateTaskDisplayPreference({
			pageKey: 'task:all',
			personal: {
				groupBy: 'status',
				visibleProperties: ['status', 'status', 'project'],
			},
		})

		await expect(getTaskDisplayPreference('task:all')).resolves.toEqual({
			personal: {
				groupBy: 'status',
				visibleProperties: ['status', 'project'],
			},
			workspaceDefault: null,
		})
		expect(localStorage.getItem(DISPLAY_OPTIONS_KEY)).not.toBeNull()
	})

	it('清空 personal 与 workspace default 时删除存储记录', async () => {
		await updateTaskDisplayPreference({
			pageKey: 'task:all',
			personal: {
				groupBy: 'status',
			},
		})

		await updateTaskDisplayPreference({
			pageKey: 'task:all',
			personal: null,
			workspaceDefault: null,
		})

		expect(localStorage.getItem(DISPLAY_OPTIONS_KEY)).toBeNull()
		await expect(getTaskDisplayPreference('task:all')).resolves.toEqual({
			personal: null,
			workspaceDefault: null,
		})
	})
})

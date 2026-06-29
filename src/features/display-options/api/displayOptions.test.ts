import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
	buildTaskDisplayPreferenceStorageKey,
	getTaskDisplayPreference,
	updateTaskDisplayPreference,
} from './displayOptions'

const storeState = vi.hoisted(() => new Map<string, unknown>())
const storeSaveMock = vi.hoisted(() => vi.fn())
const storeDeleteMock = vi.hoisted(() => vi.fn())

vi.mock('@tauri-apps/plugin-store', () => ({
	LazyStore: vi.fn(function LazyStore() {
		return {
			get: vi.fn((key: string) => Promise.resolve(storeState.get(key))),
			set: vi.fn((key: string, value: unknown) => {
				storeState.set(key, value)
				return Promise.resolve()
			}),
			delete: vi.fn((key: string) => {
				storeDeleteMock(key)
				storeState.delete(key)
				return Promise.resolve()
			}),
			save: vi.fn(() => {
				storeSaveMock()
				return Promise.resolve()
			}),
		}
	}),
}))

describe('displayOptions api', () => {
	beforeEach(() => {
		storeState.clear()
		storeSaveMock.mockClear()
		storeDeleteMock.mockClear()
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
		expect(storeSaveMock).toHaveBeenCalled()
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

		expect(storeDeleteMock).toHaveBeenCalledWith('task:task:all')
		await expect(getTaskDisplayPreference('task:all')).resolves.toEqual({
			personal: null,
			workspaceDefault: null,
		})
	})
})

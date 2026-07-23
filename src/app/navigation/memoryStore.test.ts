import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
	rememberShellRoute,
	resolveRememberedPathForScope,
	resolveStartupPath,
} from './memoryStore'
import { normalizeShellRouteMemory } from './memory'

const TASK_SHORTCUT_PATH = '/tasks/task-a'

const storeState = vi.hoisted(() => new Map<string, unknown>())
const storeSetMock = vi.hoisted(() => vi.fn())

vi.mock('@tauri-apps/plugin-store', () => ({
	LazyStore: vi.fn(function LazyStore() {
		return {
			get: vi.fn((key: string) => Promise.resolve(storeState.get(key))),
			set: vi.fn((key: string, value: unknown) => {
				storeSetMock(key, value)
				storeState.set(key, value)
				return Promise.resolve()
			}),
			save: vi.fn(() => Promise.resolve()),
		}
	}),
}))

describe('routeMemoryStore', () => {
	beforeEach(() => {
		storeState.clear()
		storeSetMock.mockClear()
	})

	it('rememberShellRoute 写入 canonical path 并删除 drawer query', async () => {
		await rememberShellRoute(
			{ type: 'space', spaceId: 'space-a' },
			'/space-a/views/today?task=task-a',
		)

		expect(storeState.get('shell.navigation.restore')).toEqual({
			version: 3,
			lastScopeKey: 'space:space-a',
			lastRouteByScopeKey: {
				'space:space-a': '/space-a/views/today',
			},
		})
	})

	it('rememberShellRoute 不保存 shortcut path', async () => {
		await rememberShellRoute({ type: 'all' }, TASK_SHORTCUT_PATH)

		expect(storeSetMock).not.toHaveBeenCalledWith('shell.navigation.restore', expect.anything())
	})

	it('normalizeShellRouteMemory 丢弃非法 payload（缺 version）', () => {
		expect(
			normalizeShellRouteMemory({
				lastScopeKey: 'space:space-a',
				lastRouteByScopeKey: {
					'space:space-a': '/space-a/standalone',
				},
			}),
		).toBeNull()
	})

	it('resolveStartupPath 遇到非法 payload 走默认启动路径', async () => {
		storeState.set('shell.navigation.restore', {
			lastScopeKey: 'space:space-a',
			lastRouteByScopeKey: {
				'space:space-a': '/space-a/views/today',
			},
		})

		await expect(resolveStartupPath({ spaces: [{ id: 'space-a' } as never] })).resolves.toBe(
			'/all/tasks',
		)
	})

	it('resolveRememberedPathForScope 遇到非法 path 返回 defaultPath', async () => {
		storeState.set('shell.navigation.restore', {
			version: 3,
			lastScopeKey: 'space:space-a',
			lastRouteByScopeKey: {
				'space:space-a': '/garbage',
			},
		})

		await expect(
			resolveRememberedPathForScope({
				scopeKey: 'space:space-a',
				spaces: [{ id: 'space-a' } as never],
				defaultPath: '/space-a/standalone',
			}),
		).resolves.toBe('/space-a/standalone')
	})
})

import { beforeEach, describe, expect, it } from 'vitest'

import {
	rememberShellRoute,
	resolveRememberedPathForScope,
	resolveStartupPath,
} from './memoryStore'
import { normalizeShellRouteMemory } from './memory'

const TASK_SHORTCUT_PATH = '/tasks/task-a'

const NAVIGATION_RESTORE_KEY = 'stoneflow.shell.navigation.restore'

describe('routeMemoryStore', () => {
	beforeEach(() => {
		localStorage.clear()
	})

	it('rememberShellRoute 写入 canonical path 并删除 drawer query', async () => {
		await rememberShellRoute(
			{ type: 'space', spaceId: 'space-a' },
			'/space-a/views/today?task=task-a',
		)

		expect(JSON.parse(localStorage.getItem(NAVIGATION_RESTORE_KEY)!)).toEqual({
			version: 3,
			lastScopeKey: 'space:space-a',
			lastRouteByScopeKey: {
				'space:space-a': '/space-a/views/today',
			},
		})
	})

	it('rememberShellRoute 不保存 shortcut path', async () => {
		await rememberShellRoute({ type: 'all' }, TASK_SHORTCUT_PATH)

		expect(localStorage.getItem(NAVIGATION_RESTORE_KEY)).toBeNull()
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
		localStorage.setItem(
			NAVIGATION_RESTORE_KEY,
			JSON.stringify({
				lastScopeKey: 'space:space-a',
				lastRouteByScopeKey: {
					'space:space-a': '/space-a/views/today',
				},
			}),
		)

		await expect(resolveStartupPath({ spaces: [{ id: 'space-a' } as never] })).resolves.toBe(
			'/all/tasks',
		)
	})

	it('resolveRememberedPathForScope 遇到非法 path 返回 defaultPath', async () => {
		localStorage.setItem(
			NAVIGATION_RESTORE_KEY,
			JSON.stringify({
				version: 3,
				lastScopeKey: 'space:space-a',
				lastRouteByScopeKey: {
					'space:space-a': '/garbage',
				},
			}),
		)

		await expect(
			resolveRememberedPathForScope({
				scopeKey: 'space:space-a',
				spaces: [{ id: 'space-a' } as never],
				defaultPath: '/space-a/standalone',
			}),
		).resolves.toBe('/space-a/standalone')
	})
})

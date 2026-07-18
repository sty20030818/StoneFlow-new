import { beforeEach, describe, expect, it, vi } from 'vitest'

import { buildShellScopeKey } from './shellLocation'
import {
	createNextShellRouteMemory,
	isRememberableShellPath,
	normalizeRememberedShellPath,
	normalizeShellMemoryPath,
	normalizeShellRouteMemory,
	resolveRememberedPathForScope,
	resolveStartupPathFromMemory,
	stripShellDetailSearch,
	validateShellRouteMemoryPaths,
} from './memory'

const TASK_SHORTCUT_PATH = '/tasks/task-a'
const PROJECT_SHORTCUT_PATH = '/projects/project-a'

const getProjectDetailMock = vi.hoisted(() => vi.fn())
const getTaskDetailMock = vi.hoisted(() => vi.fn())

vi.mock('@/features/project', () => ({
	getProjectDetail: getProjectDetailMock,
}))

vi.mock('@/features/task', () => ({
	getTaskDetail: getTaskDetailMock,
}))

describe('routeMemory', () => {
	beforeEach(() => {
		getProjectDetailMock.mockReset()
		getTaskDetailMock.mockReset()
	})

	it('构建 scope key；只接受合法 v3 payload', () => {
		expect(buildShellScopeKey({ type: 'all' })).toBe('all')
		expect(buildShellScopeKey({ type: 'space', spaceId: 'space-a' })).toBe('space:space-a')
		expect(
			normalizeShellRouteMemory({
				version: 2,
				lastScopeKey: 'space:space-a',
				lastRouteByScopeKey: {
					'space:space-a': '/space-a/inbox',
				},
			} as never),
		).toBeNull()
		expect(
			normalizeShellRouteMemory({
				version: 3,
				lastScopeKey: 'space:space-a',
				lastRouteByScopeKey: {
					'space:space-a': '/space-a/inbox',
					bad: '/all/inbox',
				},
			} as never),
		).toEqual({
			version: 3,
			lastScopeKey: 'space:space-a',
			lastRouteByScopeKey: {
				'space:space-a': '/space-a/inbox',
			},
		})
	})

	it('写入 memory 前剥离 drawer query，只保存 canonical path', () => {
		expect(
			createNextShellRouteMemory(
				null,
				{ type: 'space', spaceId: 'space-a' },
				'/space-a/inbox?task=task-a&view=today',
			),
		).toEqual({
			version: 3,
			lastScopeKey: 'space:space-a',
			lastRouteByScopeKey: {
				'space:space-a': '/space-a/inbox?view=today',
			},
		})
	})

	it('校验时非法 path 回退到当前 scope fallback', async () => {
		await expect(
			validateShellRouteMemoryPaths(
				{
					version: 3,
					lastScopeKey: 'space:space-a',
					lastRouteByScopeKey: {
						all: '/views?view=today&task=task-a',
						'space:space-a': '/unknown/path',
					},
				},
				[{ id: 'space-a' } as never],
			),
		).resolves.toEqual({
			version: 3,
			lastScopeKey: 'space:space-a',
			lastRouteByScopeKey: {
				all: '/all/tasks',
				'space:space-a': '/space-a/inbox',
			},
		})
	})

	it('不保存 launcher、shortcut、缺 scope 与未知 path', () => {
		expect(createNextShellRouteMemory(null, { type: 'all' }, '/launcher')).toBeNull()
		expect(createNextShellRouteMemory(null, { type: 'all' }, TASK_SHORTCUT_PATH)).toBeNull()
		expect(createNextShellRouteMemory(null, { type: 'all' }, PROJECT_SHORTCUT_PATH)).toBeNull()
		expect(createNextShellRouteMemory(null, { type: 'all' }, '/inbox')).toBeNull()
		expect(createNextShellRouteMemory(null, { type: 'all' }, '/unknown')).toBeNull()
	})

	it('rememberable 白名单：canonical 工作区路径可记，其余不可', () => {
		expect(isRememberableShellPath('/all/inbox')).toBe(true)
		expect(isRememberableShellPath('/all/views/today')).toBe(true)
		expect(isRememberableShellPath('/space-a/projects/project-a')).toBe(true)
		expect(isRememberableShellPath('/space-a/tasks/task-a')).toBe(true)
		expect(isRememberableShellPath('/space-a/views/today')).toBe(true)
		expect(isRememberableShellPath('/inbox')).toBe(false)
		expect(isRememberableShellPath(TASK_SHORTCUT_PATH)).toBe(false)
		expect(isRememberableShellPath('/launcher')).toBe(false)
		expect(isRememberableShellPath('/all/settings/general')).toBe(false)
	})

	it('规范化 shell memory path 只剥离 drawer query', () => {
		expect(normalizeShellMemoryPath('/space-a/views/today?project=project-a')).toBe(
			'/space-a/views/today',
		)
		expect(stripShellDetailSearch('/all/views/focus?task=task-a#top')).toBe('/all/views/focus#top')
	})

	it('启动恢复遇到非法 path 时回退到 canonical inbox', async () => {
		await expect(
			resolveStartupPathFromMemory({
				routeMemory: {
					version: 3,
					lastScopeKey: 'space:space-a',
					lastRouteByScopeKey: {
						'space:space-a': '/not-a-real-route',
					},
				},
				spaces: [{ id: 'space-a' } as never],
			}),
		).resolves.toBe('/space-a/inbox')
	})

	it('scope remembered path 遇到非法 path 时返回 defaultPath', async () => {
		await expect(
			resolveRememberedPathForScope({
				scopeKey: 'space:space-a',
				routeMemory: {
					version: 3,
					lastScopeKey: 'space:space-a',
					lastRouteByScopeKey: {
						'space:space-a': '/garbage',
					},
				},
				spaces: [{ id: 'space-a' } as never],
				defaultPath: '/space-a/inbox',
			}),
		).resolves.toBe('/space-a/inbox')
	})

	it('space scope 不得恢复到 all scope 路径', async () => {
		await expect(
			resolveRememberedPathForScope({
				scopeKey: 'space:space-a',
				routeMemory: {
					version: 3,
					lastScopeKey: 'space:space-a',
					lastRouteByScopeKey: {
						'space:space-a': '/all/tasks',
					},
				},
				spaces: [{ id: 'space-a' } as never],
				defaultPath: '/space-a/inbox',
			}),
		).resolves.toBe('/space-a/inbox')
	})

	it('all scope 不得恢复到 space scope 路径', async () => {
		await expect(
			resolveRememberedPathForScope({
				scopeKey: 'all',
				routeMemory: {
					version: 3,
					lastScopeKey: 'all',
					lastRouteByScopeKey: {
						all: '/space-a/inbox',
					},
				},
				spaces: [{ id: 'space-a' } as never],
				defaultPath: '/all/tasks',
			}),
		).resolves.toBe('/all/tasks')
	})

	it('校验 detail 所属 space', async () => {
		getTaskDetailMock.mockResolvedValue({ id: 'task-a', spaceId: 'space-a' })
		getProjectDetailMock.mockResolvedValue({ id: 'project-a', spaceId: 'space-b' })

		await expect(
			normalizeRememberedShellPath(
				'/space-a/tasks/task-a',
				[{ id: 'space-a' } as never],
				'/all/inbox',
			),
		).resolves.toBe('/space-a/tasks/task-a')
		await expect(
			normalizeRememberedShellPath(
				'/space-a/projects/project-a',
				[{ id: 'space-a' } as never],
				'/all/tasks',
			),
		).resolves.toBe('/all/tasks')
	})

	it('all scope 只能记住 all scope 路径', async () => {
		await expect(
			normalizeRememberedShellPath(
				'/space-a/inbox',
				[{ id: 'space-a' } as never],
				'/all/tasks',
				'all',
			),
		).resolves.toBe('/all/tasks')
	})
})

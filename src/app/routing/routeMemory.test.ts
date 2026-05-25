import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
	buildShellScopeKey,
	createNextShellRouteMemory,
	isRememberableShellPath,
	migrateShellRouteMemoryPaths,
	normalizeRememberedShellPath,
	normalizeShellMemoryPath,
	normalizeShellRouteMemory,
	resolveRememberedPathForScope,
	resolveStartupPathFromMemory,
	stripShellDetailSearch,
} from './routeMemory'

const getProjectDetailMock = vi.hoisted(() => vi.fn())
const getTaskDetailMock = vi.hoisted(() => vi.fn())

vi.mock('@/features/project/api/projects', () => ({
	getProjectDetail: getProjectDetailMock,
}))

vi.mock('@/features/task/api/tasks', () => ({
	getTaskDetail: getTaskDetailMock,
}))

describe('routeMemory', () => {
	beforeEach(() => {
		getProjectDetailMock.mockReset()
		getTaskDetailMock.mockReset()
	})

	it('构建 scope key 并把旧 payload 规范化为 v2 memory', () => {
		expect(buildShellScopeKey({ type: 'all' })).toBe('all')
		expect(buildShellScopeKey({ type: 'space', spaceId: 'space-a' })).toBe('space:space-a')
		expect(
			normalizeShellRouteMemory({
				lastScopeKey: 'space:space-a',
				lastRouteByScopeKey: {
					'space:space-a': '/space/space-a/inbox',
					bad: '/all/inbox',
				},
			} as never),
		).toEqual({
			version: 2,
			lastScopeKey: 'space:space-a',
			lastRouteByScopeKey: {
				'space:space-a': '/space/space-a/inbox',
			},
		})
	})

	it('写入 memory 前迁移 canonical 并剥离 drawer query', () => {
		expect(
			createNextShellRouteMemory(null, { type: 'space', spaceId: 'space-a' }, '/space/space-a/inbox?task=task-a&view=today'),
		).toEqual({
			version: 2,
			lastScopeKey: 'space:space-a',
			lastRouteByScopeKey: {
				'space:space-a': '/spaces/space-a/inbox?view=today',
			},
		})
	})

	it('迁移旧 memory path 为 canonical path', async () => {
		await expect(
			migrateShellRouteMemoryPaths(
				{
					version: 2,
					lastScopeKey: 'space:space-a',
					lastRouteByScopeKey: {
						all: '/spaces/views?view=today&task=task-a',
						'space:space-a': '/space/space-a/inbox?project=project-a',
					},
				},
				[{ id: 'space-a' } as never],
			),
		).resolves.toEqual({
			version: 2,
			lastScopeKey: 'space:space-a',
			lastRouteByScopeKey: {
				all: '/all/views?view=today',
				'space:space-a': '/spaces/space-a/inbox',
			},
		})
	})

	it('不保存 quick-create、shortcut 和非法 path', () => {
		expect(createNextShellRouteMemory(null, { type: 'all' }, '/quick-create')).toBeNull()
		expect(createNextShellRouteMemory(null, { type: 'all' }, '/tasks/task-a')).toBeNull()
		expect(createNextShellRouteMemory(null, { type: 'all' }, '/projects/project-a')).toBeNull()
		expect(createNextShellRouteMemory(null, { type: 'all' }, '/unknown')).toBeNull()
	})

	it('判断 rememberable route 并保留 canonical detail path', () => {
		expect(isRememberableShellPath('/all/inbox')).toBe(true)
		expect(isRememberableShellPath('/spaces/space-a/project/project-a')).toBe(true)
		expect(isRememberableShellPath('/spaces/space-a/tasks/task-a')).toBe(true)
		expect(isRememberableShellPath('/spaces/space-a/projects/project-a/detail')).toBe(true)
		expect(isRememberableShellPath('/spaces/inbox')).toBe(true)
		expect(isRememberableShellPath('/tasks/task-a')).toBe(false)
	})

	it('规范化 shell memory path', () => {
		expect(normalizeShellMemoryPath('/space/space-a/views?view=today&project=project-a')).toBe(
			'/spaces/space-a/views?view=today',
		)
		expect(stripShellDetailSearch('/all/views?task=task-a&view=focus#top')).toBe(
			'/all/views?view=focus#top',
		)
	})

	it('启动恢复输出 canonical path', async () => {
		await expect(
			resolveStartupPathFromMemory({
				routeMemory: {
					version: 2,
					lastScopeKey: 'space:space-a',
					lastRouteByScopeKey: {
						'space:space-a': '/space/space-a/inbox?task=task-a',
					},
				},
				spaces: [{ id: 'space-a' } as never],
			}),
		).resolves.toBe('/spaces/space-a/inbox')
	})

	it('scope remembered path 返回 canonical path', async () => {
		await expect(
			resolveRememberedPathForScope({
				scopeKey: 'space:space-a',
				routeMemory: {
					version: 2,
					lastScopeKey: 'space:space-a',
					lastRouteByScopeKey: {
						'space:space-a': '/space/space-a/views?view=today',
					},
				},
				spaces: [{ id: 'space-a' } as never],
				defaultPath: '/spaces/space-a/inbox',
			}),
		).resolves.toBe('/spaces/space-a/views?view=today')
	})

	it('校验 detail 所属 space', async () => {
		getTaskDetailMock.mockResolvedValue({ id: 'task-a', spaceId: 'space-a' })
		getProjectDetailMock.mockResolvedValue({ id: 'project-a', spaceId: 'space-b' })

		await expect(
			normalizeRememberedShellPath(
				'/spaces/space-a/tasks/task-a',
				[{ id: 'space-a' } as never],
				'/all/inbox',
			),
		).resolves.toBe('/spaces/space-a/tasks/task-a')
		await expect(
			normalizeRememberedShellPath(
				'/spaces/space-a/projects/project-a/detail',
				[{ id: 'space-a' } as never],
				'/all/inbox',
			),
		).resolves.toBe('/all/inbox')
	})
})

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { buildShellScopeKey } from '@/app/navigation/shellRoute'
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
} from '@/app/navigation/routeMemory'

const OLD_SPACE_INBOX_PATH = `/${'space'}/space-a/inbox`
const OLD_SPACE_VIEWS_PATH = `/${'space'}/space-a/views?view=today`
const TASK_SHORTCUT_PATH = `/${'tasks'}/task-a`
const PROJECT_SHORTCUT_PATH = `/${'projects'}/project-a`

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

	it('构建 scope key 并把 payload 规范化为 v2 memory', () => {
		expect(buildShellScopeKey({ type: 'all' })).toBe('all')
		expect(buildShellScopeKey({ type: 'space', spaceId: 'space-a' })).toBe('space:space-a')
		expect(
			normalizeShellRouteMemory({
				lastScopeKey: 'space:space-a',
				lastRouteByScopeKey: {
					'space:space-a': '/spaces/space-a/inbox',
					bad: '/all/inbox',
				},
			} as never),
		).toEqual({
			version: 2,
			lastScopeKey: 'space:space-a',
			lastRouteByScopeKey: {
				'space:space-a': '/spaces/space-a/inbox',
			},
		})
	})

	it('写入 memory 前剥离 drawer query，只保存 canonical path', () => {
		expect(
			createNextShellRouteMemory(
				null,
				{ type: 'space', spaceId: 'space-a' },
				'/spaces/space-a/inbox?task=task-a&view=today',
			),
		).toEqual({
			version: 2,
			lastScopeKey: 'space:space-a',
			lastRouteByScopeKey: {
				'space:space-a': '/spaces/space-a/inbox?view=today',
			},
		})
	})

	it('不迁移旧 memory path，校验时回退到当前 scope fallback', async () => {
		await expect(
			validateShellRouteMemoryPaths(
				{
					version: 2,
					lastScopeKey: 'space:space-a',
					lastRouteByScopeKey: {
						all: '/spaces/views?view=today&task=task-a',
						'space:space-a': `${OLD_SPACE_INBOX_PATH}?project=project-a`,
					},
				},
				[{ id: 'space-a' } as never],
			),
		).resolves.toEqual({
			version: 2,
			lastScopeKey: 'space:space-a',
			lastRouteByScopeKey: {
				all: '/all/tasks',
				'space:space-a': '/spaces/space-a/inbox',
			},
		})
	})

	it('不保存 quick-create、顶层详情入口、旧路径和非法 path', () => {
		expect(createNextShellRouteMemory(null, { type: 'all' }, '/quick-create')).toBeNull()
		expect(createNextShellRouteMemory(null, { type: 'all' }, TASK_SHORTCUT_PATH)).toBeNull()
		expect(createNextShellRouteMemory(null, { type: 'all' }, PROJECT_SHORTCUT_PATH)).toBeNull()
		expect(createNextShellRouteMemory(null, { type: 'all' }, '/spaces/inbox')).toBeNull()
		expect(
			createNextShellRouteMemory(null, { type: 'space', spaceId: 'space-a' }, OLD_SPACE_INBOX_PATH),
		).toBeNull()
		expect(createNextShellRouteMemory(null, { type: 'all' }, '/unknown')).toBeNull()
	})

	it('判断 rememberable route 并保留 canonical detail path', () => {
		expect(isRememberableShellPath('/all/inbox')).toBe(true)
		expect(isRememberableShellPath('/all/views/today')).toBe(true)
		expect(isRememberableShellPath('/spaces/space-a/projects/project-a')).toBe(true)
		expect(isRememberableShellPath('/spaces/space-a/tasks/task-a')).toBe(true)
		expect(isRememberableShellPath('/spaces/space-a/views/today')).toBe(true)
		expect(isRememberableShellPath('/spaces/space-a/projects/project-a')).toBe(true)
		expect(isRememberableShellPath('/spaces/inbox')).toBe(false)
		expect(isRememberableShellPath(TASK_SHORTCUT_PATH)).toBe(false)
	})

	it('规范化 shell memory path 只剥离 drawer query', () => {
		expect(normalizeShellMemoryPath('/spaces/space-a/views/today?project=project-a')).toBe(
			'/spaces/space-a/views/today',
		)
		expect(stripShellDetailSearch('/all/views/focus?task=task-a#top')).toBe('/all/views/focus#top')
	})

	it('启动恢复遇到旧 stored path 时回退到 canonical inbox', async () => {
		await expect(
			resolveStartupPathFromMemory({
				routeMemory: {
					version: 2,
					lastScopeKey: 'space:space-a',
					lastRouteByScopeKey: {
						'space:space-a': `${OLD_SPACE_INBOX_PATH}?task=task-a`,
					},
				},
				spaces: [{ id: 'space-a' } as never],
			}),
		).resolves.toBe('/spaces/space-a/inbox')
	})

	it('scope remembered path 遇到旧 path 时返回 defaultPath', async () => {
		await expect(
			resolveRememberedPathForScope({
				scopeKey: 'space:space-a',
				routeMemory: {
					version: 2,
					lastScopeKey: 'space:space-a',
					lastRouteByScopeKey: {
						'space:space-a': OLD_SPACE_VIEWS_PATH,
					},
				},
				spaces: [{ id: 'space-a' } as never],
				defaultPath: '/spaces/space-a/inbox',
			}),
		).resolves.toBe('/spaces/space-a/inbox')
	})

	it('space scope 不得恢复到 all scope 路径', async () => {
		await expect(
			resolveRememberedPathForScope({
				scopeKey: 'space:space-a',
				routeMemory: {
					version: 2,
					lastScopeKey: 'space:space-a',
					lastRouteByScopeKey: {
						'space:space-a': '/all/tasks',
					},
				},
				spaces: [{ id: 'space-a' } as never],
				defaultPath: '/spaces/space-a/inbox',
			}),
		).resolves.toBe('/spaces/space-a/inbox')
	})

	it('all scope 不得恢复到 space scope 路径', async () => {
		await expect(
			resolveRememberedPathForScope({
				scopeKey: 'all',
				routeMemory: {
					version: 2,
					lastScopeKey: 'all',
					lastRouteByScopeKey: {
						all: '/spaces/space-a/inbox',
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
				'/spaces/space-a/tasks/task-a',
				[{ id: 'space-a' } as never],
				'/all/inbox',
			),
		).resolves.toBe('/spaces/space-a/tasks/task-a')
		await expect(
			normalizeRememberedShellPath(
				'/spaces/space-a/projects/project-a',
				[{ id: 'space-a' } as never],
				'/all/tasks',
			),
		).resolves.toBe('/all/tasks')
	})

	it('all scope 只能记住 all scope 路径', async () => {
		await expect(
			normalizeRememberedShellPath(
				'/spaces/space-a/inbox',
				[{ id: 'space-a' } as never],
				'/all/tasks',
				'all',
			),
		).resolves.toBe('/all/tasks')
	})
})

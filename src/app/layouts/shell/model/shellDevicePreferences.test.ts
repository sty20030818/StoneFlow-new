import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
	loadShellDeviceState,
	rememberShellRoute,
	resolveRememberedPathForScope,
	resolveStartupPath,
} from './shellDevicePreferences'

const OLD_SPACE_INBOX_PATH = `/${'space'}/space-a/inbox`
const OLD_SPACE_VIEWS_PATH = `/${'space'}/space-a/views?view=today&project=project-a`
const TASK_SHORTCUT_PATH = `/${'tasks'}/task-a`

const storeState = vi.hoisted(() => new Map<string, unknown>())
const storeSetMock = vi.hoisted(() => vi.fn())
const storeSaveMock = vi.hoisted(() => vi.fn())
const invokeMock = vi.hoisted(() => vi.fn())

vi.mock('@tauri-apps/api/core', () => ({
	invoke: (command: string) => invokeMock(command),
}))

vi.mock('@tauri-apps/plugin-store', () => ({
	LazyStore: vi.fn(function LazyStore() {
		return {
			get: vi.fn((key: string) => Promise.resolve(storeState.get(key))),
			set: vi.fn((key: string, value: unknown) => {
				storeSetMock(key, value)
				storeState.set(key, value)
				return Promise.resolve()
			}),
			save: vi.fn(() => {
				storeSaveMock()
				return Promise.resolve()
			}),
		}
	}),
}))

describe('shellDevicePreferences navigation restore', () => {
	beforeEach(() => {
		storeState.clear()
		storeSetMock.mockClear()
		storeSaveMock.mockClear()
		invokeMock.mockReset()
		invokeMock.mockResolvedValue({ sidebar: null, ui: null })
	})

	it('load 时把旧 navigation restore payload 校验后写回 v2 fallback', async () => {
		storeState.set('shell.sidebar.device', {
			width: 256,
			desktopPreference: 'expanded',
			projectSectionCollapsed: false,
			projectSectionMaxVisible: null,
		})
		storeState.set('shell.ui.device', { taskDrawerWidth: 420 })
		storeState.set('shell.navigation.restore', {
			lastScopeKey: 'space:space-a',
			lastRouteByScopeKey: {
				'space:space-a': OLD_SPACE_INBOX_PATH,
			},
		})

		const state = await loadShellDeviceState()

		expect(state.navigationRestore).toEqual({
			version: 2,
			lastScopeKey: 'space:space-a',
			lastRouteByScopeKey: {
				'space:space-a': '/all/inbox',
			},
		})
		expect(storeSetMock).toHaveBeenCalledWith('shell.navigation.restore', state.navigationRestore)
		expect(storeSaveMock).toHaveBeenCalled()
	})

	it('rememberShellRoute 写入 canonical path 并删除 drawer query', async () => {
		await rememberShellRoute(
			{ type: 'space', spaceId: 'space-a' },
			'/spaces/space-a/inbox?task=task-a&view=today',
		)

		expect(storeState.get('shell.navigation.restore')).toEqual({
			version: 2,
			lastScopeKey: 'space:space-a',
			lastRouteByScopeKey: {
				'space:space-a': '/spaces/space-a/inbox?view=today',
			},
		})
	})

	it('rememberShellRoute 不保存 shortcut path', async () => {
		await rememberShellRoute({ type: 'all' }, TASK_SHORTCUT_PATH)

		expect(storeSetMock).not.toHaveBeenCalledWith(
			'shell.navigation.restore',
			expect.anything(),
		)
	})

	it('resolveStartupPath 遇到旧 stored path 返回 canonical fallback', async () => {
		storeState.set('shell.navigation.restore', {
			lastScopeKey: 'space:space-a',
			lastRouteByScopeKey: {
				'space:space-a': OLD_SPACE_VIEWS_PATH,
			},
		})

		await expect(resolveStartupPath({ spaces: [{ id: 'space-a' } as never] })).resolves.toBe(
			'/spaces/space-a/inbox',
		)
	})

	it('resolveRememberedPathForScope 遇到旧 stored path 返回 defaultPath', async () => {
		storeState.set('shell.navigation.restore', {
			version: 2,
			lastScopeKey: 'space:space-a',
			lastRouteByScopeKey: {
				'space:space-a': OLD_SPACE_INBOX_PATH,
			},
		})

		await expect(
			resolveRememberedPathForScope({
				scopeKey: 'space:space-a',
				spaces: [{ id: 'space-a' } as never],
				defaultPath: '/spaces/space-a/inbox',
			}),
		).resolves.toBe('/spaces/space-a/inbox')
	})
})

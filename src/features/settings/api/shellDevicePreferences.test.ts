import { beforeEach, describe, expect, it, vi } from 'vitest'

import { loadShellDeviceState, updateShellUiDevicePreferences } from './shellDevicePreferences'

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

describe('shellDevicePreferences', () => {
	beforeEach(() => {
		storeState.clear()
		storeSetMock.mockClear()
		storeSaveMock.mockClear()
		invokeMock.mockReset()
		invokeMock.mockResolvedValue({ sidebar: null, ui: null })
	})

	it('loadShellDeviceState 只加载 sidebar/ui 设备偏好', async () => {
		storeState.set('shell.sidebar.device', {
			width: 256,
			desktopPreference: 'expanded',
			projectSectionCollapsed: false,
			projectSectionMaxVisible: null,
		})
		storeState.set('shell.ui.device', { taskDrawerWidth: 420 })

		await expect(loadShellDeviceState()).resolves.toEqual({
			sidebar: {
				width: 256,
				desktopPreference: 'expanded',
				projectSectionCollapsed: false,
				projectSectionMaxVisible: null,
			},
			ui: { taskDrawerWidth: 420 },
		})
		expect(invokeMock).not.toHaveBeenCalled()
	})

	it('updateShellUiDevicePreferences 规范化任务抽屉宽度并保存', async () => {
		await expect(updateShellUiDevicePreferences({ taskDrawerWidth: 318.6 })).resolves.toEqual({
			taskDrawerWidth: 319,
		})

		expect(storeSetMock).toHaveBeenCalledWith('shell.ui.device', { taskDrawerWidth: 319 })
		expect(storeSaveMock).toHaveBeenCalled()
	})
})

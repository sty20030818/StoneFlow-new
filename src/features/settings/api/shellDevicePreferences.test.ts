import { beforeEach, describe, expect, it } from 'vitest'

import { loadShellDeviceState, updateShellUiDevicePreferences } from './shellDevicePreferences'

const SIDEBAR_DEVICE_KEY = 'stoneflow.shell.sidebar.device'
const UI_DEVICE_KEY = 'stoneflow.shell.ui.device'

describe('shellDevicePreferences', () => {
	beforeEach(() => {
		localStorage.clear()
	})

	it('loadShellDeviceState 只加载 sidebar/ui 设备偏好', async () => {
		localStorage.setItem(
			SIDEBAR_DEVICE_KEY,
			JSON.stringify({
				width: 256,
				desktopPreference: 'expanded',
				projectSectionCollapsed: false,
				projectSectionMaxVisible: null,
			}),
		)
		localStorage.setItem(UI_DEVICE_KEY, JSON.stringify({ taskDrawerWidth: 420 }))

		await expect(loadShellDeviceState()).resolves.toEqual({
			sidebar: {
				width: 256,
				desktopPreference: 'expanded',
				projectSectionCollapsed: false,
				projectSectionMaxVisible: null,
			},
			ui: { taskDrawerWidth: 420 },
		})
	})

	it('updateShellUiDevicePreferences 规范化任务抽屉宽度并保存', async () => {
		await expect(updateShellUiDevicePreferences({ taskDrawerWidth: 318.6 })).resolves.toEqual({
			taskDrawerWidth: 319,
		})

		expect(JSON.parse(localStorage.getItem(UI_DEVICE_KEY)!)).toEqual({ taskDrawerWidth: 319 })
	})
})

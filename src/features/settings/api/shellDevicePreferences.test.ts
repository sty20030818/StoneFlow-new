import { beforeEach, describe, expect, it } from 'vitest'

import {
	loadShellSidebarDevicePreferences,
	updateShellSidebarDevicePreferences,
} from './shellDevicePreferences'

const SIDEBAR_DEVICE_KEY = 'stoneflow.shell.sidebar.device'

describe('shellDevicePreferences', () => {
	beforeEach(() => {
		localStorage.clear()
	})

	it('加载并规范化 sidebar 设备偏好', async () => {
		localStorage.setItem(
			SIDEBAR_DEVICE_KEY,
			JSON.stringify({
				width: 256,
				desktopPreference: 'expanded',
				projectSectionCollapsed: false,
				projectSectionMaxVisible: null,
			}),
		)

		await expect(loadShellSidebarDevicePreferences()).resolves.toEqual({
			width: 256,
			desktopPreference: 'expanded',
			projectSectionCollapsed: false,
			projectSectionMaxVisible: null,
		})
	})

	it.each([
		{ width: 219.4, expectedWidth: 220 },
		{ width: 330.6, expectedWidth: 330 },
	])(
		'原子保存宽度与桌面状态，并将 $width 限制为 $expectedWidth',
		async ({ width, expectedWidth }) => {
			localStorage.setItem(
				SIDEBAR_DEVICE_KEY,
				JSON.stringify({
					width: 256,
					desktopPreference: 'expanded',
					projectSectionCollapsed: true,
					projectSectionMaxVisible: 7,
				}),
			)

			const preferences = await updateShellSidebarDevicePreferences({
				width,
				desktopPreference: 'collapsed',
			})

			expect(preferences).toEqual({
				width: expectedWidth,
				desktopPreference: 'collapsed',
				projectSectionCollapsed: true,
				projectSectionMaxVisible: 7,
			})
			expect(JSON.parse(localStorage.getItem(SIDEBAR_DEVICE_KEY)!)).toEqual(preferences)
		},
	)
})

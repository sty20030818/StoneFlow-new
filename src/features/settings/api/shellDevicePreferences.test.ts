import { beforeEach, describe, expect, it } from 'vitest'

import {
	loadShellDeviceState,
	updateShellSidebarDevicePreferences,
	updateShellUiDevicePreferences,
} from './shellDevicePreferences'

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
		localStorage.setItem(UI_DEVICE_KEY, JSON.stringify({ detailPresentation: 'aside' }))

		await expect(loadShellDeviceState()).resolves.toEqual({
			sidebar: {
				width: 256,
				desktopPreference: 'expanded',
				projectSectionCollapsed: false,
				projectSectionMaxVisible: null,
			},
			ui: { detailPresentation: 'aside' },
		})
	})

	it('旧 UI 设备偏好没有呈现方式时默认为 sheet', async () => {
		localStorage.setItem(UI_DEVICE_KEY, JSON.stringify({ taskDrawerWidth: 420 }))

		await expect(loadShellDeviceState()).resolves.toMatchObject({
			ui: { detailPresentation: 'sheet' },
		})
	})

	it('updateShellUiDevicePreferences 只保存详情呈现偏好', async () => {
		localStorage.setItem(UI_DEVICE_KEY, JSON.stringify({ taskDrawerWidth: 420 }))

		await expect(updateShellUiDevicePreferences({ detailPresentation: 'aside' })).resolves.toEqual({
			detailPresentation: 'aside',
		})

		expect(JSON.parse(localStorage.getItem(UI_DEVICE_KEY)!)).toEqual({
			detailPresentation: 'aside',
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

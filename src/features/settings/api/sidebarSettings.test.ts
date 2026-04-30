import { invoke } from '@tauri-apps/api/core'

import {
	getSidebarSettings,
	updateSidebarDesktopPreference,
	updateSidebarItemVisibility,
	updateSidebarProjectSection,
	updateSidebarWidth,
} from '@/features/settings/api/sidebarSettings'

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}))

const mockedInvoke = vi.mocked(invoke)

describe('sidebarSettings api', () => {
	afterEach(() => {
		mockedInvoke.mockReset()
	})

	it('读取 sidebar settings 时返回 typed settings 载荷', async () => {
		mockedInvoke.mockResolvedValue({
			settings: {
				mainItems: {
					inbox: { visible: true, order: 100 },
					allTasks: { visible: true, order: 200 },
					views: { visible: true, order: 300 },
					projectOverview: { visible: true, order: 400 },
				},
				projectSection: {
					visible: true,
					order: 500,
					collapsed: false,
					showCounts: true,
					showCompleted: true,
					maxVisible: null,
				},
				footerItems: {
					archive: { visible: true, order: 900 },
					trash: { visible: true, order: 1000 },
				},
				width: 256,
				desktopPreference: 'expanded',
			},
		})

		const result = await getSidebarSettings()

		expect(mockedInvoke).toHaveBeenCalledWith('get_sidebar_settings')
		expect(result.width).toBe(256)
		expect(result.mainItems.projectOverview.visible).toBe(true)
	})

	it('更新可见性时发送 typed target', async () => {
		mockedInvoke.mockResolvedValue({
			settings: {
				mainItems: {
					inbox: { visible: true, order: 100 },
					allTasks: { visible: true, order: 200 },
					views: { visible: false, order: 300 },
					projectOverview: { visible: true, order: 400 },
				},
				projectSection: {
					visible: true,
					order: 500,
					collapsed: false,
					showCounts: true,
					showCompleted: true,
					maxVisible: null,
				},
				footerItems: {
					archive: { visible: true, order: 900 },
					trash: { visible: true, order: 1000 },
				},
				width: 256,
				desktopPreference: 'expanded',
			},
		})

		await updateSidebarItemVisibility({ kind: 'main', key: 'views' }, false)

		expect(mockedInvoke).toHaveBeenCalledWith('update_sidebar_item_visibility', {
			input: {
				target: { kind: 'main', key: 'views' },
				visible: false,
			},
		})
	})

	it('更新宽度、project section 和桌面偏好时使用 camelCase 输入', async () => {
		mockedInvoke.mockResolvedValue({
			settings: {
				mainItems: {
					inbox: { visible: true, order: 100 },
					allTasks: { visible: true, order: 200 },
					views: { visible: true, order: 300 },
					projectOverview: { visible: true, order: 400 },
				},
				projectSection: {
					visible: true,
					order: 520,
					collapsed: true,
					showCounts: false,
					showCompleted: false,
					maxVisible: 5,
				},
				footerItems: {
					archive: { visible: true, order: 900 },
					trash: { visible: true, order: 1000 },
				},
				width: 320,
				desktopPreference: 'collapsed',
			},
		})

		await updateSidebarWidth(320)
		await updateSidebarProjectSection({
			visible: true,
			order: 520,
			collapsed: true,
			showCounts: false,
			showCompleted: false,
			maxVisible: 5,
		})
		await updateSidebarDesktopPreference('collapsed')

		expect(mockedInvoke).toHaveBeenNthCalledWith(1, 'update_sidebar_width', {
			input: { width: 320 },
		})
		expect(mockedInvoke).toHaveBeenNthCalledWith(2, 'update_sidebar_project_section', {
			input: {
				config: {
					visible: true,
					order: 520,
					collapsed: true,
					showCounts: false,
					showCompleted: false,
					maxVisible: 5,
				},
			},
		})
		expect(mockedInvoke).toHaveBeenNthCalledWith(3, 'update_sidebar_desktop_preference', {
			input: { desktopPreference: 'collapsed' },
		})
	})
})

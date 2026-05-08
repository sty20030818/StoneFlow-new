import { invoke } from '@tauri-apps/api/core'

import {
	getSidebarSettings,
	updateSidebarItemVisibility,
	updateSidebarProjectSection,
} from '@/features/settings/api/sidebarSettings'

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn<(cmd: string, args?: Record<string, unknown>) => Promise<unknown>>(),
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
					showCounts: true,
					showCompleted: true,
				},
				footerItems: {
					archive: { visible: true, order: 900 },
					trash: { visible: true, order: 1000 },
				},
			},
		})

		const result = await getSidebarSettings()

		expect(mockedInvoke).toHaveBeenCalledWith('get_sidebar_settings')
		expect(result.mainItems.projectOverview.visible).toBe(true)
		expect(result.projectSection.showCounts).toBe(true)
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
					showCounts: true,
					showCompleted: true,
				},
				footerItems: {
					archive: { visible: true, order: 900 },
					trash: { visible: true, order: 1000 },
				},
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

	it('更新 project section 时使用 camelCase 输入', async () => {
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
					showCounts: false,
					showCompleted: false,
				},
				footerItems: {
					archive: { visible: true, order: 900 },
					trash: { visible: true, order: 1000 },
				},
			},
		})

		await updateSidebarProjectSection({
			visible: true,
			order: 520,
			showCounts: false,
			showCompleted: false,
		})

		expect(mockedInvoke).toHaveBeenNthCalledWith(1, 'update_sidebar_project_section', {
			input: {
				config: {
					visible: true,
					order: 520,
					showCounts: false,
					showCompleted: false,
				},
			},
		})
	})
})

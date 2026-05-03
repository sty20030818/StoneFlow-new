import { useSidebarSettingsStore } from '@/app/layouts/shell/model/useSidebarSettingsStore'
import type { SidebarSettings } from '@/features/settings/api/sidebarSettings'
import {
	getSidebarSettings,
	updateSidebarItemVisibility,
	updateSidebarProjectSection,
	updateSidebarWidth,
} from '@/features/settings/api/sidebarSettings'

vi.mock('@/features/settings/api/sidebarSettings', () => ({
	getSidebarSettings: vi.fn<() => Promise<SidebarSettings>>(),
	updateSidebarItemVisibility:
		vi.fn<
			(
				target: { kind: 'main' | 'footer'; key: string },
				visible: boolean,
			) => Promise<SidebarSettings>
		>(),
	updateSidebarWidth: vi.fn<(width: number) => Promise<SidebarSettings>>(),
	updateSidebarDesktopPreference: vi.fn(),
	updateSidebarProjectSection:
		vi.fn<(config: SidebarSettings['projectSection']) => Promise<SidebarSettings>>(),
}))

const mockedGetSidebarSettings = vi.mocked(getSidebarSettings)
const mockedUpdateSidebarItemVisibility = vi.mocked(updateSidebarItemVisibility)
const mockedUpdateSidebarProjectSection = vi.mocked(updateSidebarProjectSection)
const mockedUpdateSidebarWidth = vi.mocked(updateSidebarWidth)

describe('useSidebarSettingsStore', () => {
	beforeEach(() => {
		mockedGetSidebarSettings.mockReset()
		mockedUpdateSidebarItemVisibility.mockReset()
		mockedUpdateSidebarProjectSection.mockReset()
		mockedUpdateSidebarWidth.mockReset()

		useSidebarSettingsStore.setState({
			status: 'idle',
			settings: null,
			errorMessage: null,
		})
	})

	it('load 会拉取并缓存 sidebar settings', async () => {
		mockedGetSidebarSettings.mockResolvedValue(createSidebarSettings())

		await useSidebarSettingsStore.getState().load()

		const state = useSidebarSettingsStore.getState()
		expect(mockedGetSidebarSettings).toHaveBeenCalledTimes(1)
		expect(state.status).toBe('ready')
		expect(state.settings?.width).toBe(256)
	})

	it('setItemVisibility 会提交更新后的设置', async () => {
		useSidebarSettingsStore.setState({
			status: 'ready',
			settings: createSidebarSettings(),
			errorMessage: null,
		})
		mockedUpdateSidebarItemVisibility.mockResolvedValue(
			createSidebarSettings({
				mainItems: {
					inbox: { visible: true, order: 100 },
					allTasks: { visible: false, order: 200 },
					views: { visible: true, order: 300 },
					projectOverview: { visible: true, order: 400 },
				},
			}),
		)

		await useSidebarSettingsStore
			.getState()
			.setItemVisibility({ kind: 'main', key: 'allTasks' }, false)

		const state = useSidebarSettingsStore.getState()
		expect(mockedUpdateSidebarItemVisibility).toHaveBeenCalledWith(
			{ kind: 'main', key: 'allTasks' },
			false,
		)
		expect(state.settings?.mainItems.allTasks.visible).toBe(false)
	})

	it('setProjectSectionConfig 会更新 Projects 分区配置', async () => {
		useSidebarSettingsStore.setState({
			status: 'ready',
			settings: createSidebarSettings(),
			errorMessage: null,
		})
		mockedUpdateSidebarProjectSection.mockResolvedValue(
			createSidebarSettings({
				projectSection: {
					visible: true,
					order: 500,
					collapsed: false,
					showCounts: false,
					showCompleted: false,
					maxVisible: null,
				},
			}),
		)

		await useSidebarSettingsStore.getState().setProjectSectionConfig({
			visible: true,
			order: 500,
			collapsed: false,
			showCounts: false,
			showCompleted: false,
			maxVisible: null,
		})

		const state = useSidebarSettingsStore.getState()
		expect(mockedUpdateSidebarProjectSection).toHaveBeenCalledWith({
			visible: true,
			order: 500,
			collapsed: false,
			showCounts: false,
			showCompleted: false,
			maxVisible: null,
		})
		expect(state.settings?.projectSection.showCompleted).toBe(false)
		expect(state.settings?.projectSection.showCounts).toBe(false)
	})

	it('setSidebarWidth 会应用服务端返回的宽度设置', async () => {
		useSidebarSettingsStore.setState({
			status: 'ready',
			settings: createSidebarSettings(),
			errorMessage: null,
		})
		mockedUpdateSidebarWidth.mockResolvedValue(
			createSidebarSettings({
				width: 320,
			}),
		)

		await useSidebarSettingsStore.getState().setSidebarWidth(320)

		const state = useSidebarSettingsStore.getState()
		expect(mockedUpdateSidebarWidth).toHaveBeenCalledWith(320)
		expect(state.settings?.width).toBe(320)
	})
})

function createSidebarSettings(overrides?: Partial<SidebarSettings>): SidebarSettings {
	return {
		mainItems: {
			inbox: { visible: true, order: 100 },
			allTasks: { visible: true, order: 200 },
			views: { visible: true, order: 300 },
			projectOverview: { visible: true, order: 400 },
			...overrides?.mainItems,
		},
		projectSection: {
			visible: true,
			order: 500,
			collapsed: false,
			showCounts: true,
			showCompleted: true,
			maxVisible: null,
			...overrides?.projectSection,
		},
		footerItems: {
			archive: { visible: true, order: 900 },
			trash: { visible: true, order: 1000 },
			...overrides?.footerItems,
		},
		width: overrides?.width ?? 256,
		desktopPreference: overrides?.desktopPreference ?? 'expanded',
	}
}

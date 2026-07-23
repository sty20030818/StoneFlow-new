import type {
	ShellSidebarDevicePreferences,
	ShellSidebarProjectSectionSettings,
	ShellSidebarSettings,
	ShellUiDevicePreferences,
} from '../api/shellDevicePreferences'
import type { SidebarPreferenceSettings } from '../api/sidebarSettings'
import {
	getSidebarSettings,
	updateSidebarItemVisibility,
	updateSidebarProjectSection,
} from '../api/sidebarSettings'
import {
	loadShellDeviceState,
	updateShellSidebarDevicePreferences,
} from '../api/shellDevicePreferences'
import { useSidebarSettingsStore } from './useSidebarSettingsStore'

// store 直引 api 路径，mock 与实现对齐
vi.mock('./../api/sidebarSettings', async (importOriginal) => {
	const actual = await importOriginal<typeof import('../api/sidebarSettings')>()
	return {
		...actual,
		getSidebarSettings: vi.fn<() => Promise<SidebarPreferenceSettings>>(),
		updateSidebarItemVisibility:
			vi.fn<
				(
					target: { kind: 'main' | 'footer'; key: string },
					visible: boolean,
				) => Promise<SidebarPreferenceSettings>
			>(),
		updateSidebarProjectSection:
			vi.fn<
				(config: SidebarPreferenceSettings['projectSection']) => Promise<SidebarPreferenceSettings>
			>(),
	}
})

vi.mock('./../api/shellDevicePreferences', async (importOriginal) => {
	const actual = await importOriginal<typeof import('../api/shellDevicePreferences')>()
	return {
		...actual,
		loadShellDeviceState: vi.fn(),
		updateShellSidebarDevicePreferences: vi.fn(),
	}
})

const mockedGetSidebarSettings = vi.mocked(getSidebarSettings)
const mockedUpdateSidebarItemVisibility = vi.mocked(updateSidebarItemVisibility)
const mockedUpdateSidebarProjectSection = vi.mocked(updateSidebarProjectSection)
const mockedLoadShellDeviceState = vi.mocked(loadShellDeviceState)
const mockedUpdateShellSidebarDevicePreferences = vi.mocked(updateShellSidebarDevicePreferences)

describe('useSidebarSettingsStore', () => {
	beforeEach(() => {
		mockedGetSidebarSettings.mockReset()
		mockedUpdateSidebarItemVisibility.mockReset()
		mockedUpdateSidebarProjectSection.mockReset()
		mockedLoadShellDeviceState.mockReset()
		mockedUpdateShellSidebarDevicePreferences.mockReset()

		useSidebarSettingsStore.setState({
			status: 'idle',
			settings: null,
			syncSettings: null,
			sidebarDevicePreferences: null,
			uiDevicePreferences: null,
			errorMessage: null,
		})
	})

	it('load 会并行拉取 sync settings 和 device state', async () => {
		mockedGetSidebarSettings.mockResolvedValue(createSidebarPreferenceSettings())
		mockedLoadShellDeviceState.mockResolvedValue(createShellDeviceState())

		await useSidebarSettingsStore.getState().load()

		const state = useSidebarSettingsStore.getState()
		expect(mockedGetSidebarSettings).toHaveBeenCalledTimes(1)
		expect(mockedLoadShellDeviceState).toHaveBeenCalledTimes(1)
		expect(state.status).toBe('ready')
		expect(state.settings?.width).toBe(256)
		expect(state.settings?.desktopPreference).toBe('expanded')
	})

	it('setItemVisibility 会提交更新后的 sync settings', async () => {
		useSidebarSettingsStore.setState(createReadyStoreState())
		mockedUpdateSidebarItemVisibility.mockResolvedValue(
			createSidebarPreferenceSettings({
				mainItems: {
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
		expect(state.settings?.width).toBe(256)
	})

	it('setProjectSectionConfig 会只更新 sync project section 字段', async () => {
		useSidebarSettingsStore.setState(createReadyStoreState())
		mockedUpdateSidebarProjectSection.mockResolvedValue(
			createSidebarPreferenceSettings({
				projectSection: {
					visible: true,
					order: 500,
					showCounts: false,
					showCompleted: false,
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
			showCounts: false,
			showCompleted: false,
		})
		expect(state.settings?.projectSection.showCompleted).toBe(false)
		expect(state.settings?.projectSection.showCounts).toBe(false)
		expect(mockedUpdateShellSidebarDevicePreferences).not.toHaveBeenCalled()
	})

	it('setSidebarWidth 会写入 device preferences 并保留 sync settings', async () => {
		useSidebarSettingsStore.setState(createReadyStoreState())
		mockedUpdateShellSidebarDevicePreferences.mockResolvedValue(
			createSidebarDevicePreferences({
				width: 320,
			}),
		)

		await useSidebarSettingsStore.getState().setSidebarWidth(320)

		const state = useSidebarSettingsStore.getState()
		expect(mockedUpdateShellSidebarDevicePreferences).toHaveBeenCalledWith({
			width: 320,
		})
		expect(state.settings?.width).toBe(320)
		expect(state.settings?.mainItems.allTasks.visible).toBe(true)
	})
})

function createReadyStoreState() {
	const syncSettings = createSidebarPreferenceSettings()
	const sidebarDevicePreferences = createSidebarDevicePreferences()
	const uiDevicePreferences = createUiDevicePreferences()

	return {
		status: 'ready' as const,
		syncSettings,
		sidebarDevicePreferences,
		uiDevicePreferences,
		settings: createShellSidebarSettings({
			width: sidebarDevicePreferences.width,
			desktopPreference: sidebarDevicePreferences.desktopPreference,
			projectSection: {
				...syncSettings.projectSection,
				collapsed: sidebarDevicePreferences.projectSectionCollapsed,
				maxVisible: sidebarDevicePreferences.projectSectionMaxVisible,
			},
		}),
		errorMessage: null,
	}
}

function createShellDeviceState() {
	return {
		sidebar: createSidebarDevicePreferences(),
		ui: createUiDevicePreferences(),
	}
}

function createSidebarPreferenceSettings(
	overrides?: Partial<SidebarPreferenceSettings>,
): SidebarPreferenceSettings {
	return {
		mainItems: {
			allTasks: { visible: true, order: 200 },
			views: { visible: true, order: 300 },
			projectOverview: { visible: true, order: 400 },
			...overrides?.mainItems,
		},
		projectSection: {
			visible: true,
			order: 500,
			showCounts: true,
			showCompleted: true,
			...overrides?.projectSection,
		},
		footerItems: {
			archive: { visible: true, order: 900 },
			trash: { visible: true, order: 1000 },
			...overrides?.footerItems,
		},
	}
}

function createSidebarDevicePreferences(
	overrides?: Partial<ShellSidebarDevicePreferences>,
): ShellSidebarDevicePreferences {
	return {
		width: overrides?.width ?? 256,
		desktopPreference: overrides?.desktopPreference ?? 'expanded',
		projectSectionCollapsed: overrides?.projectSectionCollapsed ?? false,
		projectSectionMaxVisible: overrides?.projectSectionMaxVisible ?? null,
	}
}

function createUiDevicePreferences(
	overrides?: Partial<ShellUiDevicePreferences>,
): ShellUiDevicePreferences {
	return {
		taskDrawerWidth: overrides?.taskDrawerWidth ?? 420,
	}
}

function createShellSidebarSettings(
	overrides?: Partial<ShellSidebarSettings> & {
		projectSection?: Partial<ShellSidebarProjectSectionSettings>
	},
): ShellSidebarSettings {
	return {
		mainItems: {
			allTasks: { visible: true, order: 200 },
			views: { visible: true, order: 300 },
			projectOverview: { visible: true, order: 400 },
			...overrides?.mainItems,
		},
		projectSection: {
			visible: true,
			order: 500,
			showCounts: true,
			showCompleted: true,
			collapsed: false,
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

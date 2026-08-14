import { create } from 'zustand'

// 同 feature 内直引 api，避免经 barrel 自引用 + 测试 mock 环
import {
	getSidebarSettings,
	updateSidebarItemVisibility,
	updateSidebarProjectSection,
	type SidebarItemVisibilityTarget,
	type SidebarPreferenceSettings,
	type SidebarProjectSectionPreferenceConfig,
} from '../api/sidebarSettings'
import {
	buildShellSidebarSettings,
	loadShellDeviceState,
	updateShellSidebarDevicePreferences,
	type ShellSidebarDevicePreferences,
	type ShellSidebarProjectSectionSettings,
	type ShellSidebarSettings,
	type ShellUiDevicePreferences,
} from '../api/shellDevicePreferences'

type SidebarSettingsStatus = 'idle' | 'loading' | 'ready' | 'error'

type SidebarSettingsState = {
	status: SidebarSettingsStatus
	settings: ShellSidebarSettings | null
	syncSettings: SidebarPreferenceSettings | null
	sidebarDevicePreferences: ShellSidebarDevicePreferences | null
	uiDevicePreferences: ShellUiDevicePreferences | null
	errorMessage: string | null

	load: () => Promise<void>
	resetMainItemsVisibility: () => Promise<void>
	setItemVisibility: (target: SidebarItemVisibilityTarget, visible: boolean) => Promise<void>
	setSidebarPreferences: (
		preferences: Pick<ShellSidebarDevicePreferences, 'width' | 'desktopPreference'>,
	) => Promise<void>
	setProjectSectionConfig: (config: ShellSidebarProjectSectionSettings) => Promise<void>
}

let pendingLoad: Promise<void> | null = null

export const useSidebarSettingsStore = create<SidebarSettingsState>((set, get) => {
	const applyResolvedSettings = (payload: {
		syncSettings: SidebarPreferenceSettings
		sidebarDevicePreferences: ShellSidebarDevicePreferences
		uiDevicePreferences: ShellUiDevicePreferences
	}) => {
		set({
			status: 'ready',
			settings: buildShellSidebarSettings(payload.syncSettings, payload.sidebarDevicePreferences),
			syncSettings: payload.syncSettings,
			sidebarDevicePreferences: payload.sidebarDevicePreferences,
			uiDevicePreferences: payload.uiDevicePreferences,
			errorMessage: null,
		})
	}

	const commitSyncUpdate = async (runner: () => Promise<SidebarPreferenceSettings>) => {
		try {
			const syncSettings = await runner()
			const sidebarDevicePreferences = get().sidebarDevicePreferences
			const uiDevicePreferences = get().uiDevicePreferences
			if (!sidebarDevicePreferences || !uiDevicePreferences) {
				throw new Error('Sidebar 设备偏好尚未完成加载')
			}

			applyResolvedSettings({
				syncSettings,
				sidebarDevicePreferences,
				uiDevicePreferences,
			})
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Sidebar 设置更新失败'
			set((state) => ({
				status: state.settings ? 'ready' : 'error',
				errorMessage: message,
			}))
			throw error
		}
	}

	const commitDeviceUpdate = async (runner: () => Promise<ShellSidebarDevicePreferences>) => {
		try {
			const sidebarDevicePreferences = await runner()
			const syncSettings = get().syncSettings
			const uiDevicePreferences = get().uiDevicePreferences
			if (!syncSettings || !uiDevicePreferences) {
				throw new Error('Sidebar 同步设置尚未完成加载')
			}

			applyResolvedSettings({
				syncSettings,
				sidebarDevicePreferences,
				uiDevicePreferences,
			})
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Sidebar 设备偏好更新失败'
			set((state) => ({
				status: state.settings ? 'ready' : 'error',
				errorMessage: message,
			}))
			throw error
		}
	}

	return {
		status: 'idle',
		settings: null,
		syncSettings: null,
		sidebarDevicePreferences: null,
		uiDevicePreferences: null,
		errorMessage: null,

		load: async () => {
			const currentStatus = get().status
			if (currentStatus === 'ready') {
				return
			}

			if (pendingLoad) {
				return pendingLoad
			}

			set((state) => ({
				status: state.settings ? 'ready' : 'loading',
				errorMessage: null,
			}))

			pendingLoad = (async () => {
				try {
					const [syncSettings, deviceState] = await Promise.all([
						getSidebarSettings(),
						loadShellDeviceState(),
					])
					applyResolvedSettings({
						syncSettings,
						sidebarDevicePreferences: deviceState.sidebar,
						uiDevicePreferences: deviceState.ui,
					})
				} catch (error) {
					const message = error instanceof Error ? error.message : 'Sidebar 设置加载失败'
					set({
						status: 'error',
						settings: null,
						syncSettings: null,
						sidebarDevicePreferences: null,
						uiDevicePreferences: null,
						errorMessage: message,
					})
					throw error
				} finally {
					pendingLoad = null
				}
			})()

			return pendingLoad
		},

		resetMainItemsVisibility: async () => {
			await Promise.all([
				get().setItemVisibility({ kind: 'main', key: 'allTasks' }, true),
				get().setItemVisibility({ kind: 'main', key: 'views' }, true),
				get().setItemVisibility({ kind: 'main', key: 'projectOverview' }, true),
				get().setItemVisibility({ kind: 'footer', key: 'archive' }, true),
				get().setItemVisibility({ kind: 'footer', key: 'trash' }, true),
			])
		},

		setItemVisibility: async (target, visible) => {
			await commitSyncUpdate(() => updateSidebarItemVisibility(target, visible))
		},

		setSidebarPreferences: async (preferences) => {
			await commitDeviceUpdate(() => updateShellSidebarDevicePreferences(preferences))
		},

		setProjectSectionConfig: async (config) => {
			const syncConfig: SidebarProjectSectionPreferenceConfig = {
				visible: config.visible,
				order: config.order,
				showCounts: config.showCounts,
				showCompleted: config.showCompleted,
			}
			const syncSettings = get().syncSettings
			const currentDevice = get().sidebarDevicePreferences
			const currentUi = get().uiDevicePreferences
			if (!syncSettings || !currentDevice || !currentUi) {
				throw new Error('Sidebar 设置尚未完成加载')
			}

			const shouldUpdateSync =
				syncSettings.projectSection.visible !== syncConfig.visible ||
				syncSettings.projectSection.order !== syncConfig.order ||
				syncSettings.projectSection.showCounts !== syncConfig.showCounts ||
				syncSettings.projectSection.showCompleted !== syncConfig.showCompleted
			const shouldUpdateDevice =
				currentDevice.projectSectionCollapsed !== config.collapsed ||
				currentDevice.projectSectionMaxVisible !== config.maxVisible

			if (!shouldUpdateSync && !shouldUpdateDevice) {
				return
			}

			try {
				const [nextSyncSettings, nextDeviceSettings] = await Promise.all([
					shouldUpdateSync
						? updateSidebarProjectSection(syncConfig)
						: Promise.resolve(syncSettings),
					shouldUpdateDevice
						? updateShellSidebarDevicePreferences({
								projectSectionCollapsed: config.collapsed,
								projectSectionMaxVisible: config.maxVisible,
							})
						: Promise.resolve(currentDevice),
				])

				applyResolvedSettings({
					syncSettings: nextSyncSettings,
					sidebarDevicePreferences: nextDeviceSettings,
					uiDevicePreferences: currentUi,
				})
			} catch (error) {
				const message = error instanceof Error ? error.message : 'Projects 分区设置更新失败'
				set((state) => ({
					status: state.settings ? 'ready' : 'error',
					errorMessage: message,
				}))
				throw error
			}
		},
	}
})

export const selectSidebarSettingsStatus = (state: SidebarSettingsState) => state.status
export const selectSidebarSettings = (state: SidebarSettingsState) => state.settings
export const selectSidebarSettingsError = (state: SidebarSettingsState) => state.errorMessage

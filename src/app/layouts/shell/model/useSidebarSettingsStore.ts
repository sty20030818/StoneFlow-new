import { create } from 'zustand'

import {
	getSidebarSettings,
	type SidebarDesktopPreference,
	type SidebarItemVisibilityTarget,
	type SidebarProjectSectionConfig,
	type SidebarSettings,
	updateSidebarDesktopPreference,
	updateSidebarItemVisibility,
	updateSidebarProjectSection,
	updateSidebarWidth,
} from '@/features/settings/api/sidebarSettings'

type SidebarSettingsStatus = 'idle' | 'loading' | 'ready' | 'error'

type SidebarSettingsState = {
	status: SidebarSettingsStatus
	settings: SidebarSettings | null
	errorMessage: string | null

	load: () => Promise<void>
	resetMainItemsVisibility: () => Promise<void>
	setItemVisibility: (target: SidebarItemVisibilityTarget, visible: boolean) => Promise<void>
	setSidebarWidth: (width: number) => Promise<void>
	setDesktopPreference: (desktopPreference: SidebarDesktopPreference) => Promise<void>
	setProjectSectionConfig: (config: SidebarProjectSectionConfig) => Promise<void>
}

let pendingLoad: Promise<void> | null = null

export const useSidebarSettingsStore = create<SidebarSettingsState>((set, get) => {
	const applySettings = (settings: SidebarSettings) => {
		set({
			status: 'ready',
			settings,
			errorMessage: null,
		})
	}

	const commitUpdate = async (runner: () => Promise<SidebarSettings>) => {
		try {
			const settings = await runner()
			applySettings(settings)
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Sidebar 设置更新失败'
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
					const settings = await getSidebarSettings()
					applySettings(settings)
				} catch (error) {
					const message = error instanceof Error ? error.message : 'Sidebar 设置加载失败'
					set({
						status: 'error',
						settings: null,
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
				get().setItemVisibility({ kind: 'main', key: 'inbox' }, true),
				get().setItemVisibility({ kind: 'main', key: 'allTasks' }, true),
				get().setItemVisibility({ kind: 'main', key: 'views' }, true),
				get().setItemVisibility({ kind: 'main', key: 'projectOverview' }, true),
			])
		},

		setItemVisibility: async (target, visible) => {
			await commitUpdate(() => updateSidebarItemVisibility(target, visible))
		},

		setSidebarWidth: async (width) => {
			await commitUpdate(() => updateSidebarWidth(width))
		},

		setDesktopPreference: async (desktopPreference) => {
			await commitUpdate(() => updateSidebarDesktopPreference(desktopPreference))
		},

		setProjectSectionConfig: async (config) => {
			await commitUpdate(() => updateSidebarProjectSection(config))
		},
	}
})

export const selectSidebarSettingsStatus = (state: SidebarSettingsState) => state.status
export const selectSidebarSettings = (state: SidebarSettingsState) => state.settings
export const selectSidebarSettingsError = (state: SidebarSettingsState) => state.errorMessage

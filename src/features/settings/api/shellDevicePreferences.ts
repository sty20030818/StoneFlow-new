import { clamp } from 'es-toolkit/math'

import {
	DEFAULT_SIDEBAR_WIDTH,
	SIDEBAR_WIDTH_MAX,
	SIDEBAR_WIDTH_MIN,
} from '@/shared/lib/shellSidebarGeometry'
import type {
	SidebarPreferenceSettings,
	SidebarProjectSectionPreferenceConfig,
} from './sidebarSettings'
import { readLocalStorageValue, writeLocalStorageValue } from '@/shared/lib/localStorageValue'

const SIDEBAR_DEVICE_KEY = 'stoneflow.shell.sidebar.device'

export { DEFAULT_SIDEBAR_WIDTH } from '@/shared/lib/shellSidebarGeometry'

export type SidebarDesktopPreference = 'expanded' | 'collapsed'

export type ShellSidebarDevicePreferences = {
	width: number
	desktopPreference: SidebarDesktopPreference
	projectSectionCollapsed: boolean
	projectSectionMaxVisible: number | null
}

export type ShellSidebarProjectSectionSettings = SidebarProjectSectionPreferenceConfig & {
	collapsed: boolean
	maxVisible: number | null
}

export type ShellSidebarSettings = SidebarPreferenceSettings & {
	width: number
	desktopPreference: SidebarDesktopPreference
	projectSection: ShellSidebarProjectSectionSettings
}

export async function loadShellSidebarDevicePreferences(): Promise<ShellSidebarDevicePreferences> {
	const stored = readLocalStorageValue<ShellSidebarDevicePreferences>(SIDEBAR_DEVICE_KEY)
	return normalizeSidebarDevicePreferences(stored ?? defaultShellSidebarDevicePreferences())
}

export function buildShellSidebarSettings(
	syncSettings: SidebarPreferenceSettings,
	sidebarDevicePreferences: ShellSidebarDevicePreferences,
): ShellSidebarSettings {
	return {
		...syncSettings,
		width: sidebarDevicePreferences.width,
		desktopPreference: sidebarDevicePreferences.desktopPreference,
		projectSection: {
			...syncSettings.projectSection,
			collapsed: sidebarDevicePreferences.projectSectionCollapsed,
			maxVisible: sidebarDevicePreferences.projectSectionMaxVisible,
		},
	}
}

export async function updateShellSidebarDevicePreferences(
	patch: Partial<ShellSidebarDevicePreferences>,
): Promise<ShellSidebarDevicePreferences> {
	const current = readLocalStorageValue<ShellSidebarDevicePreferences>(SIDEBAR_DEVICE_KEY) ?? {
		...defaultShellSidebarDevicePreferences(),
	}
	const next = normalizeSidebarDevicePreferences({
		...current,
		...patch,
	})

	writeLocalStorageValue(SIDEBAR_DEVICE_KEY, next)
	return next
}

function normalizeSidebarDevicePreferences(
	candidate: ShellSidebarDevicePreferences,
): ShellSidebarDevicePreferences {
	return {
		width: clamp(Math.round(candidate.width), SIDEBAR_WIDTH_MIN, SIDEBAR_WIDTH_MAX),
		desktopPreference: candidate.desktopPreference === 'collapsed' ? 'collapsed' : 'expanded',
		projectSectionCollapsed: candidate.projectSectionCollapsed === true,
		projectSectionMaxVisible:
			typeof candidate.projectSectionMaxVisible === 'number' &&
			candidate.projectSectionMaxVisible > 0
				? Math.round(candidate.projectSectionMaxVisible)
				: null,
	}
}

function defaultShellSidebarDevicePreferences(): ShellSidebarDevicePreferences {
	return {
		width: DEFAULT_SIDEBAR_WIDTH,
		desktopPreference: 'expanded',
		projectSectionCollapsed: false,
		projectSectionMaxVisible: null,
	}
}

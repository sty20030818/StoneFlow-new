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
const UI_DEVICE_KEY = 'stoneflow.shell.ui.device'
const DEFAULT_TASK_DRAWER_WIDTH = 420

export { DEFAULT_SIDEBAR_WIDTH } from '@/shared/lib/shellSidebarGeometry'

export type SidebarDesktopPreference = 'expanded' | 'collapsed'

export type ShellSidebarDevicePreferences = {
	width: number
	desktopPreference: SidebarDesktopPreference
	projectSectionCollapsed: boolean
	projectSectionMaxVisible: number | null
}

export type ShellUiDevicePreferences = {
	taskDrawerWidth: number
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

export type ShellDeviceState = {
	sidebar: ShellSidebarDevicePreferences
	ui: ShellUiDevicePreferences
}

export async function loadShellDeviceState(): Promise<ShellDeviceState> {
	const [sidebar, ui] = await Promise.all([
		readLocalStorageValue<ShellSidebarDevicePreferences>(SIDEBAR_DEVICE_KEY),
		readLocalStorageValue<ShellUiDevicePreferences>(UI_DEVICE_KEY),
	])

	return {
		sidebar: normalizeSidebarDevicePreferences(sidebar ?? defaultShellSidebarDevicePreferences()),
		ui: normalizeUiDevicePreferences(ui ?? defaultShellUiDevicePreferences()),
	}
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

export async function updateShellUiDevicePreferences(
	patch: Partial<ShellUiDevicePreferences>,
): Promise<ShellUiDevicePreferences> {
	const current = readLocalStorageValue<ShellUiDevicePreferences>(UI_DEVICE_KEY) ?? {
		...defaultShellUiDevicePreferences(),
	}
	const next = normalizeUiDevicePreferences({
		...current,
		...patch,
	})

	writeLocalStorageValue(UI_DEVICE_KEY, next)
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

function normalizeUiDevicePreferences(
	candidate: ShellUiDevicePreferences,
): ShellUiDevicePreferences {
	return {
		taskDrawerWidth:
			typeof candidate.taskDrawerWidth === 'number' && candidate.taskDrawerWidth > 0
				? Math.round(candidate.taskDrawerWidth)
				: DEFAULT_TASK_DRAWER_WIDTH,
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

function defaultShellUiDevicePreferences(): ShellUiDevicePreferences {
	return {
		taskDrawerWidth: DEFAULT_TASK_DRAWER_WIDTH,
	}
}

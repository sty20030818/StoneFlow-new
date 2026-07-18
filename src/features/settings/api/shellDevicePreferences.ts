import { invoke } from '@tauri-apps/api/core'
import { LazyStore } from '@tauri-apps/plugin-store'
import { clamp } from 'es-toolkit/math'

import type {
	SidebarPreferenceSettings,
	SidebarProjectSectionPreferenceConfig,
} from './sidebarSettings'

const SHELL_DEVICE_STORE_PATH = 'shell-device-preferences.json'
const SIDEBAR_DEVICE_KEY = 'shell.sidebar.device'
const UI_DEVICE_KEY = 'shell.ui.device'
const SIDEBAR_WIDTH_MIN = 220
const SIDEBAR_WIDTH_MAX = 330
const DEFAULT_SIDEBAR_WIDTH = 256
const DEFAULT_TASK_DRAWER_WIDTH = 420

const shellDeviceStore = new LazyStore(SHELL_DEVICE_STORE_PATH)

type LegacyShellDevicePreferencesPayload = {
	sidebar: ShellSidebarDevicePreferences | null
	ui: ShellUiDevicePreferences | null
}

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
		shellDeviceStore.get<ShellSidebarDevicePreferences>(SIDEBAR_DEVICE_KEY),
		shellDeviceStore.get<ShellUiDevicePreferences>(UI_DEVICE_KEY),
	])

	const { sidebar: resolvedSidebar, ui: resolvedUi } = await migrateLegacyDevicePreferencesIfNeeded(
		{
			sidebar: sidebar ?? null,
			ui: ui ?? null,
		},
	)

	return {
		sidebar: normalizeSidebarDevicePreferences(resolvedSidebar),
		ui: normalizeUiDevicePreferences(resolvedUi),
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
	const current = (await shellDeviceStore.get<ShellSidebarDevicePreferences>(
		SIDEBAR_DEVICE_KEY,
	)) ?? {
		...defaultShellSidebarDevicePreferences(),
	}
	const next = normalizeSidebarDevicePreferences({
		...current,
		...patch,
	})

	await shellDeviceStore.set(SIDEBAR_DEVICE_KEY, next)
	await shellDeviceStore.save()
	return next
}

export async function updateShellUiDevicePreferences(
	patch: Partial<ShellUiDevicePreferences>,
): Promise<ShellUiDevicePreferences> {
	const current = (await shellDeviceStore.get<ShellUiDevicePreferences>(UI_DEVICE_KEY)) ?? {
		...defaultShellUiDevicePreferences(),
	}
	const next = normalizeUiDevicePreferences({
		...current,
		...patch,
	})

	await shellDeviceStore.set(UI_DEVICE_KEY, next)
	await shellDeviceStore.save()
	return next
}

async function migrateLegacyDevicePreferencesIfNeeded(input: {
	sidebar: ShellSidebarDevicePreferences | null
	ui: ShellUiDevicePreferences | null
}): Promise<{
	sidebar: ShellSidebarDevicePreferences
	ui: ShellUiDevicePreferences
}> {
	let nextSidebar = input.sidebar ? normalizeSidebarDevicePreferences(input.sidebar) : null
	let nextUi = input.ui ? normalizeUiDevicePreferences(input.ui) : null

	if (nextSidebar && nextUi) {
		return {
			sidebar: nextSidebar,
			ui: nextUi,
		}
	}

	const legacy = await invoke<LegacyShellDevicePreferencesPayload>(
		'get_legacy_shell_device_preferences',
	)
	if (!nextSidebar) {
		nextSidebar = normalizeSidebarDevicePreferences(
			legacy.sidebar ?? defaultShellSidebarDevicePreferences(),
		)
		await shellDeviceStore.set(SIDEBAR_DEVICE_KEY, nextSidebar)
	}
	if (!nextUi) {
		nextUi = normalizeUiDevicePreferences(legacy.ui ?? defaultShellUiDevicePreferences())
		await shellDeviceStore.set(UI_DEVICE_KEY, nextUi)
	}

	await shellDeviceStore.save()

	return {
		sidebar: nextSidebar,
		ui: nextUi,
	}
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

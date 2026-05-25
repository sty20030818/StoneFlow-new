import { invoke } from '@tauri-apps/api/core'
import { LazyStore } from '@tauri-apps/plugin-store'
import { clamp } from 'es-toolkit/math'

import {
	createNextShellRouteMemory,
	isRememberableShellPath as isRememberableShellRoutePath,
	migrateShellRouteMemoryPaths,
	normalizeShellRouteMemory,
	resolveRememberedPathForScope as resolveRememberedRoutePathForScope,
	resolveStartupPathFromMemory,
} from '@/app/routing'
import type { ShellRouteMemory, ShellScopeKey } from '@/app/routing'
import type {
	SidebarPreferenceSettings,
	SidebarProjectSectionPreferenceConfig,
} from '@/features/settings/api/sidebarSettings'
import type { Scope, Space } from '@/shared/types'

export { buildShellScopeKey } from '@/app/routing'

const SHELL_DEVICE_STORE_PATH = 'shell-device-preferences.json'
const SIDEBAR_DEVICE_KEY = 'shell.sidebar.device'
const UI_DEVICE_KEY = 'shell.ui.device'
const NAVIGATION_RESTORE_KEY = 'shell.navigation.restore'
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

export type ShellNavigationRestore = ShellRouteMemory

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
	navigationRestore: ShellNavigationRestore | null
}

type ResolveRememberedPathInput = {
	scopeKey: ShellScopeKey
	spaces: Space[]
	defaultPath: string
}

type ResolveStartupPathInput = {
	spaces: Space[]
}

export async function loadShellDeviceState(): Promise<ShellDeviceState> {
	const [sidebar, ui, navigationRestore] = await Promise.all([
		shellDeviceStore.get<ShellSidebarDevicePreferences>(SIDEBAR_DEVICE_KEY),
		shellDeviceStore.get<ShellUiDevicePreferences>(UI_DEVICE_KEY),
		shellDeviceStore.get<ShellNavigationRestore>(NAVIGATION_RESTORE_KEY),
	])

	const { sidebar: resolvedSidebar, ui: resolvedUi } = await migrateLegacyDevicePreferencesIfNeeded(
		{
			sidebar: sidebar ?? null,
			ui: ui ?? null,
		},
	)
	const resolvedNavigationRestore = await migrateShellRouteMemoryPaths(
		normalizeShellRouteMemory(navigationRestore ?? null),
		[],
	)
	if (navigationRestore && resolvedNavigationRestore) {
		await shellDeviceStore.set(NAVIGATION_RESTORE_KEY, resolvedNavigationRestore)
		await shellDeviceStore.save()
	}

	return {
		sidebar: normalizeSidebarDevicePreferences(resolvedSidebar),
		ui: normalizeUiDevicePreferences(resolvedUi),
		navigationRestore: resolvedNavigationRestore,
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

export async function rememberShellRoute(scope: Scope, path: string): Promise<void> {
	const current = normalizeShellRouteMemory(
		(await shellDeviceStore.get<ShellNavigationRestore>(NAVIGATION_RESTORE_KEY)) ?? null,
	)
	const next = createNextShellRouteMemory(current, scope, path)
	if (!next) {
		return
	}

	await shellDeviceStore.set(NAVIGATION_RESTORE_KEY, next)
	await shellDeviceStore.save()
}

export async function resolveRememberedPathForScope({
	scopeKey,
	spaces,
	defaultPath,
}: ResolveRememberedPathInput): Promise<string> {
	const navigationRestore = normalizeShellRouteMemory(
		(await shellDeviceStore.get<ShellNavigationRestore>(NAVIGATION_RESTORE_KEY)) ?? null,
	)
	return resolveRememberedRoutePathForScope({
		scopeKey,
		routeMemory: navigationRestore,
		spaces,
		defaultPath,
	})
}

export async function resolveStartupPath({ spaces }: ResolveStartupPathInput): Promise<string> {
	const navigationRestore = normalizeShellRouteMemory(
		(await shellDeviceStore.get<ShellNavigationRestore>(NAVIGATION_RESTORE_KEY)) ?? null,
	)
	return resolveStartupPathFromMemory({
		routeMemory: navigationRestore,
		spaces,
	})
}

export function isRememberableShellPath(path: string): boolean {
	return isRememberableShellRoutePath(path)
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

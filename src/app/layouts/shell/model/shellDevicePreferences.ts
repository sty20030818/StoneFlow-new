import { invoke } from '@tauri-apps/api/core'
import { LazyStore } from '@tauri-apps/plugin-store'
import { clamp } from 'es-toolkit/math'

import type {
	SidebarPreferenceSettings,
	SidebarProjectSectionPreferenceConfig,
} from '@/features/settings/api/sidebarSettings'
import { getProjectDetail } from '@/features/project/api/projects'
import type { Scope, Space } from '@/shared/types'

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

export type ShellNavigationRestore = {
	lastScopeKey: ShellScopeKey
	lastRouteByScopeKey: Record<string, string>
}

export type ShellScopeKey = 'all' | `space:${string}`

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

	return {
		sidebar: normalizeSidebarDevicePreferences(resolvedSidebar),
		ui: normalizeUiDevicePreferences(resolvedUi),
		navigationRestore: normalizeNavigationRestore(navigationRestore ?? null),
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
	if (!isRememberableShellPath(path)) {
		return
	}

	const current = normalizeNavigationRestore(
		(await shellDeviceStore.get<ShellNavigationRestore>(NAVIGATION_RESTORE_KEY)) ?? null,
	) ?? {
		lastScopeKey: 'all',
		lastRouteByScopeKey: {},
	}
	const scopeKey = buildShellScopeKey(scope)
	const next: ShellNavigationRestore = {
		lastScopeKey: scopeKey,
		lastRouteByScopeKey: {
			...current.lastRouteByScopeKey,
			[scopeKey]: path,
		},
	}

	await shellDeviceStore.set(NAVIGATION_RESTORE_KEY, next)
	await shellDeviceStore.save()
}

export async function resolveRememberedPathForScope({
	scopeKey,
	spaces,
	defaultPath,
}: ResolveRememberedPathInput): Promise<string> {
	const navigationRestore = normalizeNavigationRestore(
		(await shellDeviceStore.get<ShellNavigationRestore>(NAVIGATION_RESTORE_KEY)) ?? null,
	)
	if (!navigationRestore) {
		return defaultPath
	}

	return resolveScopePath({
		scopeKey,
		navigationRestore,
		spaces,
		defaultPath,
	})
}

export async function resolveStartupPath({ spaces }: ResolveStartupPathInput): Promise<string> {
	const navigationRestore = normalizeNavigationRestore(
		(await shellDeviceStore.get<ShellNavigationRestore>(NAVIGATION_RESTORE_KEY)) ?? null,
	)
	if (!navigationRestore) {
		return '/spaces/inbox'
	}

	const defaultSpaceId = resolveDefaultSpaceId(spaces)
	if (navigationRestore.lastScopeKey === 'all') {
		return await normalizeRememberedShellPath(
			navigationRestore.lastRouteByScopeKey.all,
			spaces,
			'/spaces/inbox',
		)
	}

	const targetSpaceId = extractSpaceIdFromScopeKey(navigationRestore.lastScopeKey)
	if (targetSpaceId && spaces.some((space) => space.id === targetSpaceId)) {
		return resolveScopePath({
			scopeKey: navigationRestore.lastScopeKey,
			navigationRestore,
			spaces,
			defaultPath: `/space/${targetSpaceId}/inbox`,
		})
	}

	if (!defaultSpaceId) {
		return '/spaces/inbox'
	}

	return resolveScopePath({
		scopeKey: `space:${defaultSpaceId}`,
		navigationRestore,
		spaces,
		defaultPath: `/space/${defaultSpaceId}/inbox`,
	})
}

export function buildShellScopeKey(scope: Scope): ShellScopeKey {
	return scope.type === 'all' ? 'all' : `space:${scope.spaceId}`
}

export function isRememberableShellPath(path: string): boolean {
	return matchesRememberableShellPath(path)
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

async function resolveScopePath(input: {
	scopeKey: ShellScopeKey
	navigationRestore: ShellNavigationRestore
	spaces: Space[]
	defaultPath: string
}): Promise<string> {
	const rememberedPath = input.navigationRestore.lastRouteByScopeKey[input.scopeKey]
	return normalizeRememberedShellPath(rememberedPath, input.spaces, input.defaultPath)
}

async function normalizeRememberedShellPath(
	path: string | undefined,
	spaces: Space[],
	fallbackPath: string,
): Promise<string> {
	if (!path) {
		return fallbackPath
	}

	if (!matchesRememberableShellPath(path)) {
		return fallbackPath
	}

	const match = path.match(/^\/space\/([^/]+)\/(.+)$/)
	if (match) {
		const [, spaceId, remainder] = match
		if (spaces.length > 0 && !spaces.some((space) => space.id === spaceId)) {
			return fallbackPath
		}

		if (remainder.startsWith('project/')) {
			const projectId = remainder.slice('project/'.length)
			if (projectId.length === 0) {
				return fallbackPath
			}

			try {
				const detail = await getProjectDetail(projectId)
				if (detail.spaceId !== spaceId) {
					return fallbackPath
				}
				return path
			} catch {
				return fallbackPath
			}
		}

		return path
	}

	return path
}

function extractSpaceIdFromScopeKey(scopeKey: ShellScopeKey): string | null {
	return scopeKey === 'all' ? null : scopeKey.slice('space:'.length)
}

function resolveDefaultSpaceId(spaces: Space[]): string | null {
	return spaces.find((space) => space.isDefault)?.id ?? spaces[0]?.id ?? null
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

function normalizeNavigationRestore(
	candidate: ShellNavigationRestore | null | undefined,
): ShellNavigationRestore | null {
	if (!candidate) {
		return null
	}

	const lastScopeKey = isShellScopeKey(candidate.lastScopeKey) ? candidate.lastScopeKey : 'all'
	const lastRouteByScopeKey = Object.fromEntries(
		Object.entries(candidate.lastRouteByScopeKey ?? {}).filter(
			([scopeKey, path]) =>
				isShellScopeKey(scopeKey) && typeof path === 'string' && path.length > 0,
		),
	)

	return {
		lastScopeKey,
		lastRouteByScopeKey,
	}
}

function isShellScopeKey(value: string): value is ShellScopeKey {
	return value === 'all' || value.startsWith('space:')
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

function matchesRememberableShellPath(path: string): boolean {
	const allMatch = path.match(/^\/spaces\/(.+)$/)
	if (allMatch) {
		return ALLOWED_ALL_SECTIONS.has(allMatch[1]?.split('?')[0] ?? '')
	}

	const spaceMatch = path.match(/^\/space\/([^/]+)\/(.+)$/)
	if (!spaceMatch) {
		return false
	}

	const remainder = spaceMatch[2] ?? ''
	if (remainder.startsWith('project/')) {
		return remainder.length > 'project/'.length
	}

	return ALLOWED_SPACE_SECTIONS.has(remainder.split('?')[0] ?? '')
}

const ALLOWED_ALL_SECTIONS = new Set([
	'inbox',
	'all-tasks',
	'no-project',
	'views',
	'projects',
	'archive',
	'trash',
	'settings',
])

const ALLOWED_SPACE_SECTIONS = new Set([
	'inbox',
	'all-tasks',
	'no-project',
	'views',
	'projects',
	'archive',
	'trash',
	'settings',
])

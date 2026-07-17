import { LazyStore } from '@tauri-apps/plugin-store'

import type { ShellRouteMemory, ShellScopeKey } from './shellLocation'
import {
	createNextShellRouteMemory,
	normalizeShellRouteMemory,
	resolveRememberedPathForScope as resolveRememberedRoutePathForScope,
	resolveStartupPathFromMemory,
	validateShellRouteMemoryPaths,
} from './memory'
import type { Scope, Space } from '@/shared/types'

/**
 * Route memory 的本机持久化边界。
 */
const SHELL_DEVICE_STORE_PATH = 'shell-device-preferences.json'
const NAVIGATION_RESTORE_KEY = 'shell.navigation.restore'

const routeMemoryStore = new LazyStore(SHELL_DEVICE_STORE_PATH)

type ResolveRememberedPathInput = {
	scopeKey: ShellScopeKey
	spaces: Space[]
	defaultPath: string
}

type ResolveStartupPathInput = {
	spaces: Space[]
}

export async function loadShellNavigationRestore(): Promise<ShellRouteMemory | null> {
	const current = normalizeShellRouteMemory(
		(await routeMemoryStore.get<ShellRouteMemory>(NAVIGATION_RESTORE_KEY)) ?? null,
	)
	const resolved = await validateShellRouteMemoryPaths(current, [])
	if (current && resolved) {
		await routeMemoryStore.set(NAVIGATION_RESTORE_KEY, resolved)
		await routeMemoryStore.save()
	}

	return resolved
}

export async function rememberShellRoute(scope: Scope, path: string): Promise<void> {
	const current = normalizeShellRouteMemory(
		(await routeMemoryStore.get<ShellRouteMemory>(NAVIGATION_RESTORE_KEY)) ?? null,
	)
	const next = createNextShellRouteMemory(current, scope, path)
	if (!next) {
		return
	}

	await routeMemoryStore.set(NAVIGATION_RESTORE_KEY, next)
	await routeMemoryStore.save()
}

export async function resolveRememberedPathForScope({
	scopeKey,
	spaces,
	defaultPath,
}: ResolveRememberedPathInput): Promise<string> {
	const navigationRestore = normalizeShellRouteMemory(
		(await routeMemoryStore.get<ShellRouteMemory>(NAVIGATION_RESTORE_KEY)) ?? null,
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
		(await routeMemoryStore.get<ShellRouteMemory>(NAVIGATION_RESTORE_KEY)) ?? null,
	)
	return resolveStartupPathFromMemory({
		routeMemory: navigationRestore,
		spaces,
	})
}

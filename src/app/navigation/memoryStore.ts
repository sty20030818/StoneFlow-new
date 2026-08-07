import type { ShellRouteMemory, ShellScopeKey } from './shellLocation'
import {
	createNextShellRouteMemory,
	normalizeShellRouteMemory,
	resolveRememberedPathForScope as resolveRememberedRoutePathForScope,
	resolveStartupPathFromMemory,
} from './memory'
import type { Scope, Space } from '@/shared/types'
import { readLocalStorageValue, writeLocalStorageValue } from '@/shared/lib/localStorageValue'

/**
 * Route memory 的本机持久化边界。
 */
const NAVIGATION_RESTORE_KEY = 'stoneflow.shell.navigation.restore'

type ResolveRememberedPathInput = {
	scopeKey: ShellScopeKey
	spaces: Space[]
	defaultPath: string
}

type ResolveStartupPathInput = {
	spaces: Space[]
}

export async function rememberShellRoute(scope: Scope, path: string): Promise<void> {
	const current = normalizeShellRouteMemory(
		readLocalStorageValue<ShellRouteMemory>(NAVIGATION_RESTORE_KEY),
	)
	const next = createNextShellRouteMemory(current, scope, path)
	if (!next) {
		return
	}

	writeLocalStorageValue(NAVIGATION_RESTORE_KEY, next)
}

export async function resolveRememberedPathForScope({
	scopeKey,
	spaces,
	defaultPath,
}: ResolveRememberedPathInput): Promise<string> {
	const navigationRestore = normalizeShellRouteMemory(
		readLocalStorageValue<ShellRouteMemory>(NAVIGATION_RESTORE_KEY),
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
		readLocalStorageValue<ShellRouteMemory>(NAVIGATION_RESTORE_KEY),
	)
	return resolveStartupPathFromMemory({
		routeMemory: navigationRestore,
		spaces,
	})
}

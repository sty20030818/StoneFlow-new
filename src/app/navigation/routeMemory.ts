/**
 * Route memory 规则入口（薄 re-export）。
 * 实现：routeMemoryNormalize（纯路径）· routeMemoryResolve（校验与启动恢复）。
 */

export {
	createNextShellRouteMemory,
	defaultShellRouteMemory,
	isRememberableShellPath,
	normalizeShellMemoryPath,
	normalizeShellRouteMemory,
	stripShellDetailSearch,
} from '@/app/navigation/routeMemoryNormalize'

export {
	normalizeRememberedShellPath,
	resolveRememberedPathForScope,
	resolveStartupPathFromMemory,
	validateShellRouteMemoryPaths,
	type ResolveRememberedPathInput,
	type ResolveStartupPathInput,
} from '@/app/navigation/routeMemoryResolve'

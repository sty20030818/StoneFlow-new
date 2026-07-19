import { useEffect, useRef, useState } from 'react'

import {
	isRememberableShellPath,
	normalizeShellMemoryPath,
	openStartupFallback,
	type ShellRoute,
} from '@/app/navigation'
import type { Scope } from '@/shared/types'

/**
 * 解析「进入设置前」应返回的工作 path。
 * - 仅接受可记忆的 non-settings shell path（与 memory 规则一致）
 * - 无效则用当前 scope 的 startup fallback
 */
export function resolveSettingsReturnPath(
	candidatePath: string | null | undefined,
	scope: Scope,
): string {
	const normalized = normalizeShellMemoryPath((candidatePath ?? '').trim())
	if (normalized.length > 0 && isRememberableShellPath(normalized)) {
		return normalized
	}
	return openStartupFallback(scope)
}

/**
 * Settings Mode 的 returnPath：在 non-settings → settings 边沿捕获一次。
 * 设置内 section `replace` 不得覆盖；离开设置后继续跟踪工作 path。
 */
export function useSettingsReturnPath(shellRoute: ShellRoute, currentScope: Scope) {
	const isSettingsMode = shellRoute.isSettingsPath
	const [returnPath, setReturnPath] = useState(() => openStartupFallback(currentScope))
	const lastWorkPathRef = useRef(openStartupFallback(currentScope))
	const wasSettingsModeRef = useRef(isSettingsMode)

	useEffect(() => {
		if (!isSettingsMode) {
			const candidate = normalizeShellMemoryPath(shellRoute.fullPath)
			if (isRememberableShellPath(candidate)) {
				lastWorkPathRef.current = candidate
			}
		}

		const wasSettingsMode = wasSettingsModeRef.current
		wasSettingsModeRef.current = isSettingsMode

		if (!wasSettingsMode && isSettingsMode) {
			setReturnPath(resolveSettingsReturnPath(lastWorkPathRef.current, currentScope))
		}
	}, [currentScope, isSettingsMode, shellRoute.fullPath])

	return returnPath
}

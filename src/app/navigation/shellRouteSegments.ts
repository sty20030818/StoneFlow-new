import {
	decodeScopeKey,
	isCanonicalWorkRemainder,
	isSettingsRemainder,
	SECTION_SEGMENT_TO_KEY,
	splitPathSegments,
	stripQueryAndHash,
} from '@/app/navigation/pathDialect'
import type { RouteScope } from '@/app/navigation/shellRouteTypes'

export { isCanonicalWorkRemainder, SECTION_SEGMENT_TO_KEY, splitPathSegments, stripQueryAndHash }

export const isSingleSettingsRemainder = isSettingsRemainder

/** 从 pathname 拆 scope + remainder（S1：第一段即 scopeKey） */
export function splitWorkspacePath(pathname: string): {
	scope: RouteScope
	remainder: string[]
	scopeKey: string
} | null {
	const segments = splitPathSegments(pathname)
	if (segments.length === 0) {
		return null
	}
	const scopeKey = segments[0]
	const scope = decodeScopeKey(scopeKey)
	if (!scope) {
		return null
	}
	return {
		scope,
		scopeKey,
		remainder: segments.slice(1),
	}
}

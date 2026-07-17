import type {
	RouteScope,
	ShellSectionKey,
	ShellSectionSegment,
} from '@/app/navigation/shellRouteTypes'

/**
 * 唯一 URL 方言（S1）：
 *   /:scopeKey/<section>[/…]
 * scopeKey = `all` | 真实 spaceId
 * 详情仅 space：/{spaceId}/tasks|projects/{id}
 */

export const ALL_SCOPE_KEY = 'all' as const

export const DEFAULT_SPACE_SECTION: ShellSectionSegment = 'inbox'
export const DEFAULT_ALL_SECTION: ShellSectionSegment = 'tasks'

/** 不可用作 spaceId 的第一段保留字（与根路由 / 系统段对齐） */
export const RESERVED_SCOPE_KEYS = new Set([ALL_SCOPE_KEY, 'quick-create', 'settings', 'debug'])

export const SECTION_SEGMENT_TO_KEY: Record<string, ShellSectionKey> = {
	inbox: 'inbox',
	tasks: 'tasks',
	views: 'views',
	projects: 'projects',
	'no-project': 'noProject',
	archive: 'archive',
	trash: 'trash',
	settings: 'settings',
}

export function toSectionSegment(
	section: ShellSectionKey | ShellSectionSegment,
): ShellSectionSegment {
	return section === 'noProject' ? 'no-project' : section
}

export function encodeScopeKey(scope: RouteScope, fallbackSpaceId?: string | null): string {
	if (scope.type === 'all') {
		return ALL_SCOPE_KEY
	}
	const spaceId = scope.spaceId || fallbackSpaceId
	if (!spaceId) {
		return ALL_SCOPE_KEY
	}
	return encodeURIComponent(spaceId)
}

export function decodeScopeKey(scopeKey: string): RouteScope | null {
	if (!scopeKey) {
		return null
	}
	if (scopeKey === ALL_SCOPE_KEY) {
		return { type: 'all' }
	}
	if (RESERVED_SCOPE_KEYS.has(scopeKey)) {
		return null
	}
	try {
		return { type: 'space', spaceId: decodeURIComponent(scopeKey) }
	} catch {
		return { type: 'space', spaceId: scopeKey }
	}
}

export function splitPathSegments(pathname: string): string[] {
	const normalized = pathname.split(/[?#]/)[0] || '/'
	if (normalized === '/') {
		return []
	}
	return normalized
		.split('/')
		.filter(Boolean)
		.map((segment) => {
			try {
				return decodeURIComponent(segment)
			} catch {
				return segment
			}
		})
}

export function stripQueryAndHash(pathname: string) {
	return pathname.split(/[?#]/)[0] || '/'
}

export function isSettingsRemainder(remainder: string[]) {
	return remainder[0] === 'settings' && remainder.length <= 2
}

/** 工作区 remainder 是否合法（allowTaskDetail：仅 space 详情） */
export function isCanonicalWorkRemainder(remainder: string[], allowTaskDetail: boolean) {
	if (remainder.length === 0) {
		return false
	}
	const head = remainder[0]
	if (remainder.length === 1) {
		return head in SECTION_SEGMENT_TO_KEY
	}
	if (head === 'views' && remainder.length === 2) {
		return true
	}
	if (head === 'projects' && remainder.length === 2 && allowTaskDetail) {
		// 项目详情仅 space
		return true
	}
	if (allowTaskDetail && head === 'tasks' && remainder.length === 2) {
		return true
	}
	if (head === 'settings' && remainder.length === 2) {
		return true
	}
	return false
}

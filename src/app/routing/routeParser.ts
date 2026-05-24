import type { ShellSectionKey } from '@/app/layouts/shell/types'
import type { RouteScope, ShellPathKind } from './routeTypes'

const TASK_SHORTCUT_PATH = /^\/tasks\/[^/]+$/
const PROJECT_SHORTCUT_PATH = /^\/projects\/[^/]+$/
const SPACE_SHELL_PATH = /^\/space\/([^/]+)(?:\/(.+))?$/
const ALL_SHELL_PATH = /^\/spaces(?:\/(.+))?$/

export function resolveShellSection(pathname: string): ShellSectionKey {
	if (isProjectShortcutPath(pathname) || pathname.includes('/project/')) {
		return 'project'
	}

	if (pathname.includes('/all-tasks')) {
		return 'allTasks'
	}

	if (pathname.includes('/no-project')) {
		return 'noProject'
	}

	if (pathname.includes('/views') || pathname.includes('/focus')) {
		return 'views'
	}

	if (pathname.includes('/projects')) {
		return 'projects'
	}

	if (pathname.includes('/archive')) {
		return 'archive'
	}

	if (pathname.includes('/trash')) {
		return 'trash'
	}

	if (pathname.includes('/settings')) {
		return 'settings'
	}

	return 'inbox'
}

export function parseShellScopePath(pathname: string): RouteScope | null {
	if (pathname.startsWith('/spaces')) {
		return { type: 'all' }
	}

	const match = pathname.match(SPACE_SHELL_PATH)
	if (!match?.[1]) {
		return null
	}

	return { type: 'space', spaceId: decodeURIComponent(match[1]) }
}

export function isProjectShellPath(pathname: string) {
	return pathname.includes('/project/')
}

export function isTaskShortcutPath(pathname: string) {
	return TASK_SHORTCUT_PATH.test(pathname)
}

export function isProjectShortcutPath(pathname: string) {
	return PROJECT_SHORTCUT_PATH.test(pathname)
}

export function resolveShellPathKind(pathname: string): ShellPathKind {
	if (isTaskShortcutPath(pathname)) {
		return 'task-shortcut'
	}

	if (isProjectShortcutPath(pathname)) {
		return 'project-shortcut'
	}

	if (pathname.startsWith('/spaces')) {
		return 'all'
	}

	if (pathname.startsWith('/space/')) {
		return 'space'
	}

	return 'other'
}

export function isShellPath(pathname: string) {
	return ALL_SHELL_PATH.test(pathname) || SPACE_SHELL_PATH.test(pathname)
}

export function isQuickCreatePath(pathname: string) {
	return pathname === '/quick-create'
}

export function isTaskPageSection(section: ShellSectionKey) {
	return section === 'allTasks'
}

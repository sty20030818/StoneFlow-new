import { startTransition, useEffect, useMemo, useState } from 'react'
import { compact } from 'es-toolkit/array'
import { useLocation, useNavigate, useNavigationType } from 'react-router-dom'

import {
	isProjectShortcutPath,
	isTaskShortcutPath,
	parseShellScopePath,
	resolveShellSection,
} from '@/app/routing'
import { getSectionLabel, getSpaceLabel, type ShellProjectLink } from '@/app/layouts/shell/config'
import type { Scope, Space } from '@/shared/types'
import {
	ArchiveIcon,
	BoxIcon,
	FolderIcon,
	InboxIcon,
	Layers2Icon,
	ListTodoIcon,
	Settings2Icon,
	SparklesIcon,
	SquarePenIcon,
	Trash2Icon,
	type LucideIcon,
} from 'lucide-react'

export type ShellRouteHistoryEntry = {
	path: string
	label: string
	spaceId: string | null
	spaceName: string
	entryIcon: LucideIcon
}

type ShellRouteHistoryState = {
	entries: ShellRouteHistoryEntry[]
	currentIndex: number
}

type UseShellRouteHistoryOptions = {
	currentScope: Scope
	currentSpaceId: string | null
	spaces: Space[]
	projects: ShellProjectLink[]
	maxEntries?: number
}

const DEFAULT_MAX_HISTORY_ENTRIES = 8

/** 路径段 → icon 映射，与 Sidebar 主导航保持一致 */
const PATH_ICON_MAP: Record<string, LucideIcon> = {
	'all-tasks': ListTodoIcon,
	views: Layers2Icon,
	projects: BoxIcon,
	'no-project': SparklesIcon,
	archive: ArchiveIcon,
	trash: Trash2Icon,
	settings: Settings2Icon,
	'quick-create': SquarePenIcon,
}

/** 从路径中提取语义 icon：优先匹配路径段，再处理 project 详情页 */
function resolveEntryIcon(path: string): LucideIcon {
	const segments = path.split(/[?#]/)[0]?.split('/').filter(Boolean) ?? []
	const last = segments[segments.length - 1] ?? ''

	if (PATH_ICON_MAP[last]) {
		return PATH_ICON_MAP[last]
	}

	if (segments.includes('project')) {
		return FolderIcon
	}

	return InboxIcon
}

/**
 * 收集当前应用会话内访问过的 Shell 路由，供 Header 的历史下拉使用。
 */
export function useShellRouteHistory({
	currentScope,
	currentSpaceId,
	spaces,
	projects,
	maxEntries = DEFAULT_MAX_HISTORY_ENTRIES,
}: UseShellRouteHistoryOptions) {
	const location = useLocation()
	const navigationType = useNavigationType()
	const navigate = useNavigate()
	const currentPath = `${location.pathname}${location.search}${location.hash}`
	const currentEntry = useMemo(
		() => buildShellRouteHistoryEntry(currentPath, currentScope, currentSpaceId, spaces, projects),
		[currentPath, currentScope, currentSpaceId, spaces, projects],
	)
	const [historyState, setHistoryState] = useState<ShellRouteHistoryState>({
		entries: [],
		currentIndex: -1,
	})

	useEffect(() => {
		setHistoryState((previous) =>
			reduceRouteHistory(previous, currentEntry, navigationType, maxEntries),
		)
	}, [currentEntry, maxEntries, navigationType])

	const currentHistoryEntry = historyState.entries[historyState.currentIndex] ?? currentEntry

	const goBack = () => {
		if (historyState.currentIndex <= 0) {
			return
		}

		startTransition(() => {
			navigate(-1)
		})
	}

	const goForward = () => {
		if (historyState.currentIndex >= historyState.entries.length - 1) {
			return
		}

		startTransition(() => {
			navigate(1)
		})
	}

	const navigateToHistoryEntry = (entry: ShellRouteHistoryEntry) => {
		if (entry.path === currentPath) {
			return
		}

		startTransition(() => {
			navigate(entry.path)
		})
	}

	return {
		entries: historyState.entries.filter((entry) => entry.path !== currentPath).reverse(),
		currentEntry: currentHistoryEntry,
		canGoBack: historyState.currentIndex > 0,
		canGoForward: historyState.currentIndex < historyState.entries.length - 1,
		goBack,
		goForward,
		navigateToHistoryEntry,
	}
}

export function buildShellRouteHistoryEntry(
	path: string,
	currentScope: Scope,
	currentSpaceId: string | null,
	spaces: Space[],
	projects: ShellProjectLink[],
): ShellRouteHistoryEntry {
	const pathname = path.split(/[?#]/)[0] || '/'
	const parts = compact(pathname.split('/'))

	if (parts[0] === 'quick-create') {
		return createHistoryEntry(path, '快捷创建', null, '所有空间')
	}

	if (isTaskShortcutPath(pathname)) {
		return createHistoryEntry(path, '任务详情', null, '所有空间')
	}

	if (isProjectShortcutPath(pathname)) {
		return createHistoryEntry(path, '项目详情', null, '所有空间')
	}

	const parsedScope = parseShellScopePath(pathname)
	if (!parsedScope) {
		return createHistoryEntry(path, '工作区', null, '所有空间')
	}

	if (parsedScope.type === 'all') {
		return createHistoryEntry(path, getSectionLabel(resolveShellSection(pathname)), null, '所有空间')
	}

	const spaceId = parsedScope.spaceId ?? currentSpaceId ?? (currentScope.type === 'space' ? currentScope.spaceId : null)
	const spaceLabel = getSpaceLabel(spaceId, spaces)
	const section = resolveShellSection(pathname)

	if (section === 'project') {
		const projectId = parts[3]
		const projectLabel = projects.find((project) => project.id === projectId)?.label
		return createHistoryEntry(path, projectLabel ?? '项目', spaceId, spaceLabel)
	}

	return createHistoryEntry(path, getSectionLabel(section), spaceId, spaceLabel)
}

function reduceRouteHistory(
	previous: ShellRouteHistoryState,
	nextEntry: ShellRouteHistoryEntry,
	navigationType: string,
	maxEntries: number,
): ShellRouteHistoryState {
	const currentEntry = previous.entries[previous.currentIndex]

	if (currentEntry?.path === nextEntry.path) {
		const nextEntries = [...previous.entries]
		nextEntries[previous.currentIndex] = nextEntry
		return { entries: nextEntries, currentIndex: previous.currentIndex }
	}

	if (navigationType === 'POP') {
		const existingIndex = previous.entries.findIndex((entry) => entry.path === nextEntry.path)

		if (existingIndex >= 0) {
			return {
				entries: replaceEntry(previous.entries, existingIndex, nextEntry),
				currentIndex: existingIndex,
			}
		}
	}

	if (navigationType === 'REPLACE' && previous.currentIndex >= 0) {
		const nextEntries = replaceEntry(previous.entries, previous.currentIndex, nextEntry)
		return { entries: nextEntries, currentIndex: previous.currentIndex }
	}

	const baseEntries =
		previous.currentIndex >= 0 ? previous.entries.slice(0, previous.currentIndex + 1) : []
	const dedupedEntries = baseEntries.filter((entry) => entry.path !== nextEntry.path)
	const appendedEntries = [...dedupedEntries, nextEntry]
	const entries = appendedEntries.slice(-maxEntries)

	return {
		entries,
		currentIndex: entries.length - 1,
	}
}

function replaceEntry(
	entries: ShellRouteHistoryEntry[],
	index: number,
	nextEntry: ShellRouteHistoryEntry,
) {
	const nextEntries = [...entries]
	nextEntries[index] = nextEntry
	return nextEntries
}

function createHistoryEntry(
	path: string,
	label: string,
	spaceId: string | null,
	spaceName: string,
): ShellRouteHistoryEntry {
	return { path, label, spaceId, spaceName, entryIcon: resolveEntryIcon(path) }
}

import { startTransition, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useNavigationType } from 'react-router-dom'

import { isRememberableShellPath, normalizeShellMemoryPath, parseShellRoute } from '@/app/routing'
import type { ShellRoute } from '@/app/routing'
import { getSectionLabel, getSpaceLabel, type ShellProjectLink } from '@/app/layouts/shell/config'
import type { Scope, Space } from '@/shared/types'
import {
	ArchiveIcon,
	BoxIcon,
	FolderIcon,
	InboxIcon,
	Layers2Icon,
	ListTodoIcon,
	SparklesIcon,
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
	currentRoute?: ShellRoute
	spaces: Space[]
	projects: ShellProjectLink[]
	maxEntries?: number
}

const DEFAULT_MAX_HISTORY_ENTRIES = 8

const SECTION_ICON_MAP: Record<string, LucideIcon> = {
	tasks: ListTodoIcon,
	views: Layers2Icon,
	projects: BoxIcon,
	noProject: SparklesIcon,
	archive: ArchiveIcon,
	trash: Trash2Icon,
	inbox: InboxIcon,
}

function resolveEntryIcon(route: ShellRoute): LucideIcon {
	if (route.kind === 'task') {
		return ListTodoIcon
	}

	if (route.kind === 'project') {
		return FolderIcon
	}

	return SECTION_ICON_MAP[route.section] ?? InboxIcon
}

/**
 * 收集当前应用会话内访问过的 Shell 路由，供 Header 的历史下拉使用。
 */
export function useShellRouteHistory({
	currentScope,
	currentSpaceId,
	currentRoute,
	spaces,
	projects,
	maxEntries = DEFAULT_MAX_HISTORY_ENTRIES,
}: UseShellRouteHistoryOptions) {
	const location = useLocation()
	const navigationType = useNavigationType()
	const navigate = useNavigate()
	const locationRoute = useMemo(
		() =>
			parseShellRoute({
				pathname: location.pathname,
				search: location.search,
				hash: location.hash,
			}),
		[location.hash, location.pathname, location.search],
	)
	const route = currentRoute ?? locationRoute
	const currentPath = normalizeShellMemoryPath(route.fullPath)
	const currentEntry = useMemo(
		() => buildShellRouteHistoryEntry(route, currentScope, currentSpaceId, spaces, projects),
		[route, currentScope, currentSpaceId, spaces, projects],
	)
	const [historyState, setHistoryState] = useState<ShellRouteHistoryState>({
		entries: [],
		currentIndex: -1,
	})

	useEffect(() => {
		if (!isTrackableRouteHistoryEntry(currentEntry)) {
			return
		}

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
	routeOrPath: ShellRoute | string,
	currentScope: Scope,
	currentSpaceId: string | null,
	spaces: Space[],
	projects: ShellProjectLink[],
): ShellRouteHistoryEntry {
	const route = typeof routeOrPath === 'string' ? parseShellRoute(routeOrPath) : routeOrPath
	const path = normalizeShellMemoryPath(route.fullPath)

	if (!isRememberableShellPath(path)) {
		return createHistoryEntry(path, '工作区', null, '所有空间', InboxIcon)
	}

	if (route.kind === 'task') {
		const spaceId = route.spaceId
		return createHistoryEntry(
			path,
			'任务详情',
			spaceId,
			getSpaceLabel(spaceId, spaces),
			resolveEntryIcon(route),
		)
	}

	if (route.kind === 'project') {
		const spaceId = route.spaceId
		const projectLabel = projects.find((project) => project.id === route.projectId)?.label
		return createHistoryEntry(
			path,
			projectLabel ?? '项目',
			spaceId,
			getSpaceLabel(spaceId, spaces),
			resolveEntryIcon(route),
		)
	}

	if (!route.scope) {
		return createHistoryEntry(path, '工作区', null, '所有空间', resolveEntryIcon(route))
	}

	if (route.scope.type === 'all') {
		return createHistoryEntry(
			path,
			getSectionLabel(route.section),
			null,
			'所有空间',
			resolveEntryIcon(route),
		)
	}

	const spaceId =
		route.scope.spaceId ??
		currentSpaceId ??
		(currentScope.type === 'space' ? currentScope.spaceId : null)
	const spaceLabel = getSpaceLabel(spaceId, spaces)
	const section = route.section

	return createHistoryEntry(
		path,
		getSectionLabel(section),
		spaceId,
		spaceLabel,
		resolveEntryIcon(route),
	)
}

function reduceRouteHistory(
	previous: ShellRouteHistoryState,
	nextEntry: ShellRouteHistoryEntry,
	navigationType: string,
	maxEntries: number,
): ShellRouteHistoryState {
	const currentEntry = previous.entries[previous.currentIndex]

	if (currentEntry?.path === nextEntry.path) {
		if (isSameHistoryEntry(currentEntry, nextEntry)) {
			return previous
		}

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
	entryIcon: LucideIcon,
): ShellRouteHistoryEntry {
	return { path, label, spaceId, spaceName, entryIcon }
}

function isTrackableRouteHistoryEntry(entry: ShellRouteHistoryEntry) {
	return isRememberableShellPath(entry.path)
}

function isSameHistoryEntry(left: ShellRouteHistoryEntry, right: ShellRouteHistoryEntry) {
	return (
		left.path === right.path &&
		left.label === right.label &&
		left.spaceId === right.spaceId &&
		left.spaceName === right.spaceName &&
		left.entryIcon === right.entryIcon
	)
}

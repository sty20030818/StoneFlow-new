import { parseShellRoute, type ShellRoute } from '@/app/navigation/shellRoute'
import { isRememberableShellPath, normalizeShellMemoryPath } from '@/app/navigation/routeMemory'
import { getSectionLabel, getSpaceLabel, type ShellProjectLink } from '@/layout/config'
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

/**
 * 会话最近浏览条目的纯函数：建 entry、归约列表。
 * Hook 与 browser history 副作用见 sessionRouteHistory.ts。
 */

export type ShellRouteHistoryEntry = {
	path: string
	label: string
	spaceId: string | null
	spaceName: string
	entryIcon: LucideIcon
}

export type ShellRouteHistoryState = {
	entries: ShellRouteHistoryEntry[]
	currentIndex: number
}

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

export function reduceRouteHistory(
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

	const existingIndex = previous.entries.findIndex((entry) => entry.path === nextEntry.path)

	if (existingIndex >= 0 && (navigationType === 'POP' || existingIndex !== previous.currentIndex)) {
		return {
			entries: replaceEntry(previous.entries, existingIndex, nextEntry),
			currentIndex: existingIndex,
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

export function isTrackableRouteHistoryEntry(entry: ShellRouteHistoryEntry) {
	return isRememberableShellPath(entry.path)
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

function isSameHistoryEntry(left: ShellRouteHistoryEntry, right: ShellRouteHistoryEntry) {
	return (
		left.path === right.path &&
		left.label === right.label &&
		left.spaceId === right.spaceId &&
		left.spaceName === right.spaceName &&
		left.entryIcon === right.entryIcon
	)
}

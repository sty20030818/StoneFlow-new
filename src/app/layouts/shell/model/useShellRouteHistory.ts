import { startTransition, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useNavigationType } from 'react-router-dom'

import { getSectionLabel, getSpaceLabel, type ShellProjectLink } from '@/app/layouts/shell/config'
import type { ShellSectionKey } from '@/app/layouts/shell/types'

export type ShellRouteHistoryEntry = {
	id: string
	path: string
	label: string
	description: string
}

type ShellRouteHistoryState = {
	entries: ShellRouteHistoryEntry[]
	currentIndex: number
}

type UseShellRouteHistoryOptions = {
	currentSpaceId: string
	projects: ShellProjectLink[]
	maxEntries?: number
}

const DEFAULT_MAX_HISTORY_ENTRIES = 8

/**
 * 收集当前应用会话内访问过的 Shell 路由，供 Header 的历史下拉使用。
 */
export function useShellRouteHistory({
	currentSpaceId,
	projects,
	maxEntries = DEFAULT_MAX_HISTORY_ENTRIES,
}: UseShellRouteHistoryOptions) {
	const location = useLocation()
	const navigationType = useNavigationType()
	const navigate = useNavigate()
	const currentPath = `${location.pathname}${location.search}${location.hash}`
	const currentEntry = useMemo(
		() => buildShellRouteHistoryEntry(currentPath, currentSpaceId, projects),
		[currentPath, currentSpaceId, projects],
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
	currentSpaceId: string,
	projects: ShellProjectLink[],
): ShellRouteHistoryEntry {
	const pathname = path.split(/[?#]/)[0] || '/'
	const parts = pathname.split('/').filter(Boolean)

	if (parts[0] === 'quick-capture') {
		return createHistoryEntry(path, 'Quick Capture', '快速捕获')
	}

	if (parts[0] !== 'space') {
		return createHistoryEntry(path, 'Workspace', path)
	}

	const spaceId = parts[1] ?? currentSpaceId
	const section = parts[2]
	const spaceLabel = getSpaceLabel(spaceId)

	if (section === 'project') {
		const projectId = parts[3]
		const projectLabel = projects.find((project) => project.id === projectId)?.label

		return createHistoryEntry(path, projectLabel ?? 'Projects', spaceLabel)
	}

	return createHistoryEntry(
		path,
		getSectionLabel((section ?? 'inbox') as ShellSectionKey),
		spaceLabel,
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
	description: string,
): ShellRouteHistoryEntry {
	return {
		id: path,
		path,
		label,
		description,
	}
}

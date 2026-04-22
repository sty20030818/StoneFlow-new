import type { KeyboardEvent as ReactKeyboardEvent, RefObject } from 'react'
import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react'

import {
	selectProjectDataVersion,
	selectTaskDataVersion,
	useShellLayoutStore,
} from '@/app/layouts/shell/model/useShellLayoutStore'
import {
	searchWorkspace,
	type WorkspaceProjectSearchItem,
	type WorkspaceSearchResult,
	type WorkspaceTaskSearchItem,
} from '@/features/global-search/api/searchWorkspace'

type SearchResultItem =
	| ({ kind: 'task' } & WorkspaceTaskSearchItem)
	| ({ kind: 'project' } & WorkspaceProjectSearchItem)

type UseGlobalSearchOptions = {
	currentSpaceId: string
	onOpenTask: (taskId: string) => void
	onOpenProject: (projectId: string) => void
}

type UseGlobalSearchResult = {
	rootRef: RefObject<HTMLDivElement | null>
	inputRef: RefObject<HTMLInputElement | null>
	query: string
	isOpen: boolean
	isLoading: boolean
	errorMessage: string | null
	highlightedIndex: number
	taskItems: Array<{ index: number; item: WorkspaceTaskSearchItem }>
	projectItems: Array<{ index: number; item: WorkspaceProjectSearchItem }>
	setQuery: (value: string) => void
	setIsFocused: (value: boolean) => void
	setHighlightedIndex: (value: number) => void
	handleInputKeyDown: (event: ReactKeyboardEvent<HTMLInputElement>) => void
	handleSelectItem: (item: SearchResultItem) => void
	clearSearch: () => void
}

const EMPTY_RESULTS: WorkspaceSearchResult = {
	tasks: [],
	projects: [],
}

const SEARCH_LIMIT = 5

/**
 * 管理 Header 全局搜索的输入、实时结果与键盘导航。
 */
export function useGlobalSearch({
	currentSpaceId,
	onOpenTask,
	onOpenProject,
}: UseGlobalSearchOptions): UseGlobalSearchResult {
	const taskDataVersion = useShellLayoutStore(selectTaskDataVersion)
	const projectDataVersion = useShellLayoutStore(selectProjectDataVersion)
	const rootRef = useRef<HTMLDivElement>(null)
	const inputRef = useRef<HTMLInputElement>(null)
	const requestIdRef = useRef(0)
	const [query, setQuery] = useState('')
	const [results, setResults] = useState<WorkspaceSearchResult>(EMPTY_RESULTS)
	const [isFocused, setIsFocused] = useState(false)
	const [isLoading, setIsLoading] = useState(false)
	const [errorMessage, setErrorMessage] = useState<string | null>(null)
	const [highlightedIndex, setHighlightedIndex] = useState(0)
	const normalizedQuery = query.trim()
	const taskItems = useMemo(
		() =>
			results.tasks.map((item, index) => ({
				index,
				item,
			})),
		[results.tasks],
	)
	const projectItems = useMemo(
		() =>
			results.projects.map((item, index) => ({
				index: results.tasks.length + index,
				item,
			})),
		[results.projects, results.tasks.length],
	)
	const flatItems = useMemo<SearchResultItem[]>(
		() => [
			...results.tasks.map((item) => ({ kind: 'task' as const, ...item })),
			...results.projects.map((item) => ({ kind: 'project' as const, ...item })),
		],
		[results.projects, results.tasks],
	)
	const isOpen = isFocused && normalizedQuery.length > 0

	const dismissSearch = (shouldClear: boolean) => {
		if (shouldClear) {
			setQuery('')
			setResults(EMPTY_RESULTS)
			setErrorMessage(null)
			setHighlightedIndex(0)
		}

		setIsFocused(false)
		inputRef.current?.blur()
	}

	const loadResults = useEffectEvent(async (nextQuery: string, currentRequestId: number) => {
		try {
			const payload = await searchWorkspace({
				spaceSlug: currentSpaceId,
				query: nextQuery,
				limit: SEARCH_LIMIT,
			})

			if (requestIdRef.current !== currentRequestId) {
				return
			}

			setResults(payload)
			setHighlightedIndex(0)
		} catch (error) {
			if (requestIdRef.current !== currentRequestId) {
				return
			}

			setResults(EMPTY_RESULTS)
			setErrorMessage(toErrorMessage(error))
		} finally {
			if (requestIdRef.current === currentRequestId) {
				setIsLoading(false)
			}
		}
	})

	useEffect(() => {
		if (normalizedQuery.length === 0) {
			requestIdRef.current += 1
			setResults(EMPTY_RESULTS)
			setErrorMessage(null)
			setIsLoading(false)
			setHighlightedIndex(0)
			return
		}

		const currentRequestId = requestIdRef.current + 1
		requestIdRef.current = currentRequestId
		setIsLoading(true)
		setErrorMessage(null)

		const timerId = window.setTimeout(() => {
			void loadResults(normalizedQuery, currentRequestId)
		}, 120)

		return () => {
			window.clearTimeout(timerId)
		}
	}, [currentSpaceId, normalizedQuery, projectDataVersion, taskDataVersion])

	useEffect(() => {
		setQuery('')
		setResults(EMPTY_RESULTS)
		setErrorMessage(null)
		setIsFocused(false)
		setHighlightedIndex(0)
		requestIdRef.current += 1
	}, [currentSpaceId])

	useEffect(() => {
		const handleMouseDown = (event: MouseEvent) => {
			if (!rootRef.current?.contains(event.target as Node)) {
				setIsFocused(false)
			}
		}

		window.addEventListener('mousedown', handleMouseDown)

		return () => {
			window.removeEventListener('mousedown', handleMouseDown)
		}
	}, [])

	useEffect(() => {
		const handleKeyDown = (event: globalThis.KeyboardEvent) => {
			if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) {
				return
			}

			if (isTextInputTarget(event.target)) {
				return
			}

			if (event.key === '/') {
				event.preventDefault()
				setIsFocused(true)
				inputRef.current?.focus()
			}
		}

		window.addEventListener('keydown', handleKeyDown)

		return () => {
			window.removeEventListener('keydown', handleKeyDown)
		}
	}, [])

	const handleSelectItem = (item: SearchResultItem) => {
		if (item.kind === 'task') {
			onOpenTask(item.id)
		} else {
			onOpenProject(item.id)
		}

		dismissSearch(true)
	}

	const moveHighlight = (direction: 1 | -1) => {
		if (flatItems.length === 0) {
			return
		}

		setHighlightedIndex((currentIndex) => {
			const nextIndex = currentIndex + direction

			if (nextIndex < 0) {
				return flatItems.length - 1
			}

			if (nextIndex >= flatItems.length) {
				return 0
			}

			return nextIndex
		})
	}

	const handleInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
		switch (event.key) {
			case 'Escape':
				event.preventDefault()
				dismissSearch(true)
				return
			case 'ArrowDown':
				event.preventDefault()
				moveHighlight(1)
				return
			case 'ArrowUp':
				event.preventDefault()
				moveHighlight(-1)
				return
			case 'Enter': {
				if (!isOpen) {
					return
				}

				const activeItem = flatItems[highlightedIndex]
				if (!activeItem) {
					return
				}

				event.preventDefault()
				handleSelectItem(activeItem)
				return
			}
			default:
				return
		}
	}

	return {
		rootRef,
		inputRef,
		query,
		isOpen,
		isLoading,
		errorMessage,
		highlightedIndex,
		taskItems,
		projectItems,
		setQuery,
		setIsFocused,
		setHighlightedIndex,
		handleInputKeyDown,
		handleSelectItem,
		clearSearch: () => dismissSearch(true),
	}
}

function isTextInputTarget(target: EventTarget | null) {
	if (!(target instanceof HTMLElement)) {
		return false
	}

	return (
		target.isContentEditable ||
		target.tagName === 'INPUT' ||
		target.tagName === 'TEXTAREA' ||
		target.tagName === 'SELECT'
	)
}

function toErrorMessage(error: unknown) {
	return error instanceof Error ? error.message : '搜索失败，请稍后重试。'
}

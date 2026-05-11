import { useEffect, useMemo, useRef, useState } from 'react'

import { selectSearchFocusRequestVersion, useSearchFocusIntentStore } from '@/features/global-search/model/useSearchFocusIntentStore'
import { useGlobalSearch } from '@/features/global-search/model/useGlobalSearch'
import { GlobalSearchResults } from '@/features/global-search/ui/GlobalSearchResults'
import type { SearchProjectItem, SearchTaskItem } from '@/shared/types'
import { InputGroup, InputGroupAddon } from '@/shared/ui/base/input-group'
import { Kbd } from '@/shared/ui/base/kbd'
import { globalSearchInputShellClass } from '@/shared/ui/patterns/global-search'
import { SearchIcon } from 'lucide-react'

type GlobalSearchInputProps = {
	onOpenTask: (task: SearchTaskItem) => void
	onOpenProject: (project: SearchProjectItem) => void
}

export function GlobalSearchInput({ onOpenTask, onOpenProject }: GlobalSearchInputProps) {
	const rootRef = useRef<HTMLDivElement>(null)
	const inputRef = useRef<HTMLInputElement>(null)
	const lastKeyboardMoveAtRef = useRef(0)
	const focusRequestVersion = useSearchFocusIntentStore(selectSearchFocusRequestVersion)
	const [query, setQuery] = useState('')
	const [isFocused, setIsFocused] = useState(false)
	const [highlightedIndex, setHighlightedIndex] = useState(0)
	const normalizedQuery = query.trim()
	const { result, errorMessage, hasResolvedQuery } = useGlobalSearch(query)
	const taskItems = useMemo(
		() => [...result.tasks, ...result.completedTasks].map((item, index) => ({ index, item })),
		[result.completedTasks, result.tasks],
	)
	const projectItems = useMemo(
		() =>
			[...result.projects, ...result.completedProjects].map((item, index) => ({
				index: taskItems.length + index,
				item,
			})),
		[result.completedProjects, result.projects, taskItems.length],
	)
	const flatItems = useMemo(
		() => [
			...taskItems.map(({ item }) => ({ kind: 'task' as const, item })),
			...projectItems.map(({ item }) => ({ kind: 'project' as const, item })),
		],
		[projectItems, taskItems],
	)
	const isOpen = isFocused && normalizedQuery.length > 0
	const shouldShowClearHint = isOpen || normalizedQuery.length > 0
	const shouldShowResults =
		isOpen && (flatItems.length > 0 || Boolean(errorMessage) || hasResolvedQuery)

	useEffect(() => {
		if (!isOpen) {
			setHighlightedIndex(0)
			return
		}

		setHighlightedIndex((currentIndex) => {
			if (flatItems.length === 0) {
				return 0
			}
			return currentIndex >= flatItems.length ? 0 : currentIndex
		})
	}, [flatItems.length, isOpen])

	useEffect(() => {
		if (!normalizedQuery) {
			setHighlightedIndex(0)
		}
	}, [normalizedQuery])

	useEffect(() => {
		if (!isOpen || flatItems.length > 0) {
			return
		}

		const timer = window.setTimeout(() => {
			setHighlightedIndex(0)
		}, 120)

		return () => {
			window.clearTimeout(timer)
		}
	}, [flatItems.length, isOpen])

	useEffect(() => {
		const handleDocumentPointerDown = (event: PointerEvent) => {
			const target = event.target
			if (!(target instanceof HTMLElement)) {
				return
			}

			if (rootRef.current?.contains(target)) {
				return
			}

			setIsFocused(false)
		}

		document.addEventListener('pointerdown', handleDocumentPointerDown)
		return () => {
			document.removeEventListener('pointerdown', handleDocumentPointerDown)
		}
	}, [])

	useEffect(() => {
		if (focusRequestVersion === 0) {
			return
		}

		inputRef.current?.focus()
		setIsFocused(true)
	}, [focusRequestVersion])

	function clearSearch() {
		setQuery('')
		setIsFocused(false)
		setHighlightedIndex(0)
		inputRef.current?.blur()
	}

	function selectHighlightedItem() {
		const activeItem = flatItems[highlightedIndex]
		if (!activeItem) {
			return
		}

		if (activeItem.kind === 'task') {
			onOpenTask(activeItem.item)
		} else {
			onOpenProject(activeItem.item)
		}

		clearSearch()
	}

	function handleInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
		if (event.key === 'Escape') {
			event.preventDefault()
			clearSearch()
			return
		}

		if (!flatItems.length) {
			return
		}

		if (event.key === 'ArrowDown') {
			event.preventDefault()
			if (shouldThrottleKeyboardMove(lastKeyboardMoveAtRef)) {
				return
			}
			setHighlightedIndex((currentIndex) => (currentIndex + 1) % flatItems.length)
			return
		}

		if (event.key === 'ArrowUp') {
			event.preventDefault()
			if (shouldThrottleKeyboardMove(lastKeyboardMoveAtRef)) {
				return
			}
			setHighlightedIndex(
				(currentIndex) => (currentIndex - 1 + flatItems.length) % flatItems.length,
			)
			return
		}

		if (event.key === 'Enter') {
			event.preventDefault()
			selectHighlightedItem()
		}
	}

	return (
		<div className='relative mx-auto w-full min-w-0 max-w-100' data-sf-search-root='true'>
			<div ref={rootRef}>
				<InputGroup className={globalSearchInputShellClass}>
					<InputGroupAddon align='inline-start' className='px-2.5 text-sf-icon-subtle'>
						<SearchIcon className='size-3.5' />
					</InputGroupAddon>

					<input
						aria-expanded={isOpen}
						aria-label='全局搜索'
						autoComplete='off'
						className='flex h-full min-w-0 flex-1 bg-transparent px-0 py-1 text-[12.5px] text-foreground outline-none placeholder:text-sf-text-quaternary'
						data-slot='input-group-control'
						onChange={(event) => {
							setQuery(event.target.value)
							setIsFocused(true)
						}}
						onFocus={() => {
							setIsFocused(true)
						}}
						onKeyDown={handleInputKeyDown}
						placeholder='搜索任务、项目...'
						ref={inputRef}
						spellCheck={false}
						value={query}
					/>

					<InputGroupAddon align='inline-end' className='px-2.5'>
						{shouldShowClearHint ? (
							<button
								aria-label='清空并关闭搜索'
								className='flex items-center'
								onClick={clearSearch}
								type='button'
							>
								<Kbd>Esc</Kbd>
							</button>
						) : (
							<Kbd>/</Kbd>
						)}
					</InputGroupAddon>
				</InputGroup>
			</div>

			{shouldShowResults ? (
				<GlobalSearchResults
					errorMessage={errorMessage}
					highlightedIndex={highlightedIndex}
					projectItems={projectItems}
					taskItems={taskItems}
					onHighlightIndex={setHighlightedIndex}
					onSelectProject={(item) => {
						onOpenProject(item)
						clearSearch()
					}}
					onSelectTask={(item) => {
						onOpenTask(item)
						clearSearch()
					}}
				/>
			) : null}
		</div>
	)
}

const KEYBOARD_NAV_THROTTLE_MS = 100

function shouldThrottleKeyboardMove(lastKeyboardMoveAtRef: React.MutableRefObject<number>) {
	const now = performance.now()
	if (now - lastKeyboardMoveAtRef.current < KEYBOARD_NAV_THROTTLE_MS) {
		return true
	}

	lastKeyboardMoveAtRef.current = now
	return false
}

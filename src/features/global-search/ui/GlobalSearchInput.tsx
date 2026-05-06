import { useEffect, useMemo, useRef, useState } from 'react'

import type { SearchProjectItem, SearchTaskItem } from '@/shared/types'
import { GlobalSearchResults } from '@/features/global-search/ui/GlobalSearchResults'
import { InputGroup, InputGroupAddon } from '@/shared/ui/base/input-group'
import { Kbd } from '@/shared/ui/base/kbd'
import { globalSearchInputShellClass } from '@/shared/ui/patterns/global-search'
import { SearchIcon } from 'lucide-react'

type GlobalSearchInputProps = {
	currentSpaceId: string | null
	onOpenTask: (taskId: string) => void
	onOpenProject: (projectId: string) => void
}

// TODO: 接入真实搜索 API（后端需要 search_entities 命令）
// 当前搜索结果固定返回空，保留 UI 壳层。

function emptySearchResults(_query: string) {
	return {
		tasks: [] as SearchTaskItem[],
		projects: [] as SearchProjectItem[],
	}
}

export function GlobalSearchInput({
	currentSpaceId: _currentSpaceId,
	onOpenTask,
	onOpenProject,
}: GlobalSearchInputProps) {
	const rootRef = useRef<HTMLDivElement>(null)
	const inputRef = useRef<HTMLInputElement>(null)
	const [query, setQuery] = useState('')
	const [isFocused, setIsFocused] = useState(false)
	const [highlightedIndex, setHighlightedIndex] = useState(0)
	const [isLoading, setIsLoading] = useState(false)
	const normalizedQuery = query.trim()
	const searchResult = useMemo(() => emptySearchResults(query), [query])
	const taskItems = useMemo(
		() => searchResult.tasks.map((item, index) => ({ index, item })),
		[searchResult.tasks],
	)
	const projectItems = useMemo(
		() =>
			searchResult.projects.map((item, index) => ({
				index: taskItems.length + index,
				item,
			})),
		[searchResult.projects, taskItems.length],
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

	useEffect(() => {
		if (!normalizedQuery) {
			setIsLoading(false)
			setHighlightedIndex(0)
			return
		}

		setIsLoading(true)
		const timer = window.setTimeout(() => {
			setIsLoading(false)
			setHighlightedIndex(0)
		}, 120)

		return () => {
			window.clearTimeout(timer)
		}
	}, [normalizedQuery])

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
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) {
				return
			}

			const target = event.target
			if (
				target instanceof HTMLElement &&
				(target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
			) {
				return
			}

			event.preventDefault()
			inputRef.current?.focus()
			setIsFocused(true)
		}

		window.addEventListener('keydown', handleKeyDown)
		return () => {
			window.removeEventListener('keydown', handleKeyDown)
		}
	}, [])

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
			onOpenTask(activeItem.item.id)
		} else {
			onOpenProject(activeItem.item.id)
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
			setHighlightedIndex((currentIndex) => (currentIndex + 1) % flatItems.length)
			return
		}

		if (event.key === 'ArrowUp') {
			event.preventDefault()
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
		<div className='relative w-full min-w-0 max-w-100' data-sf-search-root='true'>
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

			{isOpen ? (
				<GlobalSearchResults
					errorMessage={null}
					highlightedIndex={highlightedIndex}
					isLoading={isLoading}
					projectItems={projectItems}
					taskItems={taskItems}
					onHighlightIndex={setHighlightedIndex}
					onSelectProject={(item) => {
						onOpenProject(item.id)
						clearSearch()
					}}
					onSelectTask={(item) => {
						onOpenTask(item.id)
						clearSearch()
					}}
				/>
			) : null}
		</div>
	)
}

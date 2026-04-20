import { useGlobalSearch } from '@/features/global-search/model/useGlobalSearch'
import { InputGroup, InputGroupAddon } from '@/shared/ui/base/input-group'
import { Kbd } from '@/shared/ui/base/kbd'
import { SearchIcon } from 'lucide-react'

import { GlobalSearchResults } from './GlobalSearchResults'

type GlobalSearchInputProps = {
	currentSpaceId: string
	onOpenTask: (taskId: string) => void
	onOpenProject: (projectId: string) => void
}

/**
 * Header 中间的真实搜索框，只负责实时搜索 Task / Project。
 */
export function GlobalSearchInput({
	currentSpaceId,
	onOpenTask,
	onOpenProject,
}: GlobalSearchInputProps) {
	const {
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
		clearSearch,
	} = useGlobalSearch({
		currentSpaceId,
		onOpenTask,
		onOpenProject,
	})
	const shouldShowClearHint = isOpen || query.trim().length > 0

	return (
		<div className='relative w-full max-w-[34rem]' data-sf-search-root='true'>
			<div ref={rootRef}>
				<InputGroup className='h-8 border-black/9 bg-background/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.42)] transition-colors hover:border-black/12 focus-within:border-black/14'>
					<InputGroupAddon align='inline-start' className='px-2.5 text-(--sf-color-shell-tertiary)'>
						<SearchIcon className='size-3.5' />
					</InputGroupAddon>

					<input
						aria-expanded={isOpen}
						aria-label='全局搜索'
						autoComplete='off'
						className='flex h-full min-w-0 flex-1 bg-transparent px-0 py-1 text-[12.5px] text-foreground outline-none placeholder:text-(--sf-color-shell-tertiary)'
						data-slot='input-group-control'
						onChange={(event) => {
							setQuery(event.target.value)
							setIsFocused(true)
						}}
						onFocus={() => {
							setIsFocused(true)
						}}
						onBlur={() => {
							setIsFocused(false)
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
					errorMessage={errorMessage}
					highlightedIndex={highlightedIndex}
					isLoading={isLoading}
					projectItems={projectItems}
					taskItems={taskItems}
					onHighlightIndex={setHighlightedIndex}
					onSelectProject={(item) => handleSelectItem({ kind: 'project', ...item })}
					onSelectTask={(item) => handleSelectItem({ kind: 'task', ...item })}
				/>
			) : null}
		</div>
	)
}

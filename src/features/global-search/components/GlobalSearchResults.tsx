import { useEffect, useRef } from 'react'

import type { SearchProjectItem, SearchTaskItem } from '@/shared/types'
import { cn } from '@/shared/lib/utils'
import { AppScrollArea } from '@/shared/components/AppScrollArea'
import { formatTaskPriorityLabel } from '@/features/task'
import { formatTaskStatusLabel } from '@/features/task'
import { PriorityIcon } from '@/features/task'
import { TaskStatusIndicator } from '@/features/task'
import {
	globalSearchGroupHeadingClass,
	globalSearchResultsPopoverClass,
	globalSearchStateMutedClass,
} from '@/shared/components/patterns/global-search'
import {
	ROW_SHELL_ACTIVE_CLASS,
	ROW_SHELL_BASE_CLASS,
	ROW_SHELL_IDLE_CLASS,
} from '@/shared/components/patterns/row-tokens'
import { FolderIcon, SearchIcon } from 'lucide-react'

type GlobalSearchResultsProps = {
	errorMessage: string | null
	highlightedIndex: number
	taskItems: Array<{ index: number; item: SearchTaskItem }>
	projectItems: Array<{ index: number; item: SearchProjectItem }>
	onHighlightIndex: (index: number) => void
	onSelectTask: (item: SearchTaskItem) => void
	onSelectProject: (item: SearchProjectItem) => void
}

export function GlobalSearchResults({
	errorMessage,
	highlightedIndex,
	taskItems,
	projectItems,
	onHighlightIndex,
	onSelectTask,
	onSelectProject,
}: GlobalSearchResultsProps) {
	const rootRef = useRef<HTMLDivElement>(null)
	const hasResults = taskItems.length > 0 || projectItems.length > 0

	useEffect(() => {
		const target = rootRef.current?.querySelector<HTMLElement>(
			`[data-search-index="${highlightedIndex}"]`,
		)
		target?.scrollIntoView({ block: 'nearest' })
	}, [highlightedIndex])

	return (
		<div className={globalSearchResultsPopoverClass}>
			<AppScrollArea className='max-h-96' ref={rootRef} viewportClassName='p-2.5'>
				{errorMessage && !hasResults ? (
					<SearchPanelState label={errorMessage} tone='danger' />
				) : !hasResults ? (
					<SearchPanelState label='没有匹配的任务或项目' />
				) : (
					<div className='space-y-3'>
						{errorMessage ? <SearchPanelState label={errorMessage} tone='danger' /> : null}

						{taskItems.length > 0 ? (
							<section className='space-y-1'>
								<SearchGroupHeading title='任务' />
								<div className='space-y-0.5'>
									{taskItems.map(({ index, item }) => (
										<SearchTaskResultRow
											isActive={highlightedIndex === index}
											key={item.id}
											task={item}
											taskIndex={index}
											onHighlight={() => onHighlightIndex(index)}
											onSelect={() => onSelectTask(item)}
										/>
									))}
								</div>
							</section>
						) : null}

						{projectItems.length > 0 ? (
							<section className='space-y-1'>
								<SearchGroupHeading title='项目' />
								<div className='space-y-0.5'>
									{projectItems.map(({ index, item }) => (
										<SearchProjectResultRow
											isActive={highlightedIndex === index}
											key={item.id}
											project={item}
											projectIndex={index}
											onHighlight={() => onHighlightIndex(index)}
											onSelect={() => onSelectProject(item)}
										/>
									))}
								</div>
							</section>
						) : null}
					</div>
				)}
			</AppScrollArea>
		</div>
	)
}

type SearchTaskResultRowProps = {
	task: SearchTaskItem
	taskIndex: number
	isActive: boolean
	onHighlight: () => void
	onSelect: () => void
}

function SearchTaskResultRow({
	task,
	taskIndex,
	isActive,
	onHighlight,
	onSelect,
}: SearchTaskResultRowProps) {
	const placementLabel = task.projectName ?? (task.inboxAt ? 'Inbox' : '独立事项')

	return (
		<button
			aria-label={`打开任务 ${task.title}`}
			className={cn(
				ROW_SHELL_BASE_CLASS,
				'h-11 w-full gap-2.5 px-3',
				isActive ? ROW_SHELL_ACTIVE_CLASS : ROW_SHELL_IDLE_CLASS,
			)}
			data-search-index={taskIndex}
			onClick={onSelect}
			onMouseEnter={onHighlight}
			type='button'
		>
			<div className='flex min-w-0 flex-1 items-center gap-2.5'>
				<EntityLabel label='任务' />
				<span
					aria-label={`优先级 ${formatTaskPriorityLabel(task.priority)}`}
					className='flex shrink-0 items-center justify-center text-sf-shell-text-secondary'
				>
					<PriorityIcon priority={task.priority} size='sm' />
				</span>
				<span
					aria-label={`状态 ${formatTaskStatusLabel(task.status)}`}
					className='flex shrink-0 items-center justify-center'
				>
					<TaskStatusIndicator status={task.status} />
				</span>
				<div className='min-w-0 flex-1'>
					<div className='truncate text-[13px] font-medium text-foreground'>{task.title}</div>
				</div>
			</div>
			<div className='ml-auto hidden shrink-0 items-center gap-1.5 md:flex'>
				<ContextPill label={placementLabel} />
				<ContextPill label={task.spaceName} />
			</div>
		</button>
	)
}

type SearchProjectResultRowProps = {
	project: SearchProjectItem
	projectIndex: number
	isActive: boolean
	onHighlight: () => void
	onSelect: () => void
}

function SearchProjectResultRow({
	project,
	projectIndex,
	isActive,
	onHighlight,
	onSelect,
}: SearchProjectResultRowProps) {
	return (
		<button
			aria-label={`打开项目 ${project.name}`}
			className={cn(
				ROW_SHELL_BASE_CLASS,
				'h-11 w-full gap-2.5 px-3',
				isActive ? ROW_SHELL_ACTIVE_CLASS : ROW_SHELL_IDLE_CLASS,
			)}
			data-search-index={projectIndex}
			onClick={onSelect}
			onMouseEnter={onHighlight}
			type='button'
		>
			<div className='flex min-w-0 flex-1 items-center gap-2.5'>
				<EntityLabel label='项目' />
				<span className='flex shrink-0 items-center justify-center text-sf-shell-text-secondary'>
					<FolderIcon className='size-3.5' />
				</span>
				<div className='min-w-0 flex-1'>
					<div className='truncate text-[13px] font-medium text-foreground'>{project.name}</div>
				</div>
			</div>
			<div className='ml-auto hidden shrink-0 items-center gap-1.5 md:flex'>
				{project.completedAt ? <ContextPill label='已完成' /> : null}
				<ContextPill label={project.spaceName} />
			</div>
		</button>
	)
}

function SearchGroupHeading({ title }: { title: string }) {
	return <div className={globalSearchGroupHeadingClass}>{title}</div>
}

function SearchPanelState({ label, tone = 'muted' }: { label: string; tone?: 'muted' | 'danger' }) {
	return (
		<div
			className={cn(
				'flex items-center gap-2 rounded-lg border px-3 py-3 text-[12px]',
				tone === 'danger'
					? 'border-sf-danger-surface-border bg-sf-danger-surface text-sf-danger-surface-text'
					: globalSearchStateMutedClass,
			)}
		>
			<SearchIcon className='size-3.5 shrink-0' />
			<span>{label}</span>
		</div>
	)
}

function EntityLabel({ label }: { label: string }) {
	return (
		<span className='shrink-0 text-[10px] font-medium tracking-[0.08em] text-sf-shell-text-secondary uppercase'>
			{label}
		</span>
	)
}

function ContextPill({ label }: { label: string }) {
	return (
		<span className='inline-flex max-w-36 items-center truncate rounded-md bg-sf-list-section-bg px-2 py-1 text-[11px] font-medium text-sf-shell-text-secondary'>
			{label}
		</span>
	)
}

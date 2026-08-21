import { useEffect, useRef } from 'react'

import { ListView } from '@heroui-pro/react'
import { Surface } from '@heroui/react'

import type { SearchProjectItem, SearchTaskItem } from '@/shared/types'
import { cn } from '@/shared/lib/utils'
import {
	formatTaskPriorityLabel,
	formatTaskStatusLabel,
	PriorityIcon,
	TaskStatusIndicator,
} from '@/features/task'
import { OverflowTooltip } from '@/shared/components/tooltip'
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
		<Surface
			className='absolute left-1/2 top-full z-40 mt-1.5 w-[max(32rem,50vw)] max-w-[calc(100vw-2rem)] -translate-x-1/2 overflow-hidden'
			data-global-search-results='true'
			id='global-search-results'
			variant='secondary'
		>
			<div className='max-h-96 overflow-y-auto p-2' ref={rootRef}>
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
								<ListView aria-label='任务搜索结果' variant='secondary'>
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
								</ListView>
							</section>
						) : null}

						{projectItems.length > 0 ? (
							<section className='space-y-1'>
								<SearchGroupHeading title='项目' />
								<ListView aria-label='项目搜索结果' variant='secondary'>
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
								</ListView>
							</section>
						) : null}
					</div>
				)}
			</div>
		</Surface>
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
	const placementLabel = task.projectName ?? '独立事项'

	return (
		<ListView.Item
			aria-current={isActive ? 'true' : undefined}
			aria-label={`打开任务 ${task.title}`}
			className='w-full'
			data-search-index={taskIndex}
			id={`task:${task.id}`}
			onAction={onSelect}
			onHoverStart={onHighlight}
			textValue={task.title}
		>
			<ListView.ItemContent>
				<span
					aria-label={`优先级 ${formatTaskPriorityLabel(task.priority)}`}
					className='flex shrink-0 items-center justify-center text-muted'
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
					<OverflowTooltip className='text-[13px] font-medium text-foreground' content={task.title}>
						{task.title}
					</OverflowTooltip>
				</div>
			</ListView.ItemContent>
			<ListView.ItemAction className='hidden shrink-0 md:flex'>
				<ContextPill label={placementLabel} />
				<ContextPill label={task.spaceName} />
			</ListView.ItemAction>
		</ListView.Item>
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
		<ListView.Item
			aria-current={isActive ? 'true' : undefined}
			aria-label={`打开项目 ${project.name}`}
			className='w-full'
			data-search-index={projectIndex}
			id={`project:${project.id}`}
			onAction={onSelect}
			onHoverStart={onHighlight}
			textValue={project.name}
		>
			<ListView.ItemContent>
				<span className='flex shrink-0 items-center justify-center text-muted'>
					<FolderIcon className='size-3.5' />
				</span>
				<div className='min-w-0 flex-1'>
					<OverflowTooltip
						className='text-[13px] font-medium text-foreground'
						content={project.name}
					>
						{project.name}
					</OverflowTooltip>
				</div>
			</ListView.ItemContent>
			<ListView.ItemAction className='hidden shrink-0 md:flex'>
				{project.completedAt ? <ContextPill label='已完成' /> : null}
				<ContextPill label={project.spaceName} />
			</ListView.ItemAction>
		</ListView.Item>
	)
}

function SearchGroupHeading({ title }: { title: string }) {
	return (
		<div className='px-1 text-[10.5px] font-medium tracking-[0.06em] text-muted uppercase'>
			{title}
		</div>
	)
}

function SearchPanelState({ label, tone = 'muted' }: { label: string; tone?: 'muted' | 'danger' }) {
	return (
		<Surface variant='tertiary'>
			<div
				className={cn(
					'flex items-center gap-2 px-3 py-2.5 text-[12px]',
					tone === 'danger' ? 'text-danger' : 'text-muted',
				)}
			>
				<SearchIcon className='size-3.5 shrink-0' />
				<span>{label}</span>
			</div>
		</Surface>
	)
}

function ContextPill({ label }: { label: string }) {
	return (
		<OverflowTooltip
			className='inline-flex max-w-36 items-center rounded-md bg-surface-secondary px-2 py-1 text-[11px] font-medium text-muted'
			content={label}
		>
			{label}
		</OverflowTooltip>
	)
}

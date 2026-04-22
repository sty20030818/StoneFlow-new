import type {
	WorkspaceProjectSearchItem,
	WorkspaceTaskSearchItem,
} from '@/features/global-search/api/searchWorkspace'
import { cn } from '@/shared/lib/utils'
import { SearchIcon } from 'lucide-react'

type GlobalSearchResultsProps = {
	isLoading: boolean
	errorMessage: string | null
	highlightedIndex: number
	taskItems: Array<{ index: number; item: WorkspaceTaskSearchItem }>
	projectItems: Array<{ index: number; item: WorkspaceProjectSearchItem }>
	onHighlightIndex: (index: number) => void
	onSelectTask: (item: WorkspaceTaskSearchItem) => void
	onSelectProject: (item: WorkspaceProjectSearchItem) => void
}

/**
 * 渲染 Header 搜索面板，按 Tasks / Projects 分组输出。
 */
export function GlobalSearchResults({
	isLoading,
	errorMessage,
	highlightedIndex,
	taskItems,
	projectItems,
	onHighlightIndex,
	onSelectTask,
	onSelectProject,
}: GlobalSearchResultsProps) {
	const hasResults = taskItems.length > 0 || projectItems.length > 0

	return (
		<div className='absolute inset-x-0 top-full z-40 mt-1.5 overflow-hidden rounded-xl border border-(--sf-color-border-secondary) bg-popover/98 shadow-(--sf-shadow-popover) backdrop-blur'>
			<div className='max-h-[24rem] overflow-y-auto p-2.5'>
				{isLoading && !hasResults ? (
					<SearchPanelState label='正在搜索任务与项目...' />
				) : errorMessage ? (
					<SearchPanelState label={errorMessage} tone='danger' />
				) : !hasResults ? (
					<SearchPanelState label='没有匹配结果' />
				) : (
					<div className='space-y-3'>
						{taskItems.length > 0 ? (
							<section className='space-y-1.5'>
								<SearchGroupHeading title='Tasks' />
								<div className='space-y-1'>
									{taskItems.map(({ index, item }) => (
										<SearchResultButton
											context={buildTaskContext(item)}
											isActive={highlightedIndex === index}
											key={item.id}
											note={item.note}
											title={item.title}
											typeLabel='Task'
											onHighlight={() => onHighlightIndex(index)}
											onSelect={() => onSelectTask(item)}
										/>
									))}
								</div>
							</section>
						) : null}

						{projectItems.length > 0 ? (
							<section className='space-y-1.5'>
								<SearchGroupHeading title='Projects' />
								<div className='space-y-1'>
									{projectItems.map(({ index, item }) => (
										<SearchResultButton
											context={buildProjectContext(item)}
											isActive={highlightedIndex === index}
											key={item.id}
											note={item.note}
											title={item.name}
											typeLabel='Project'
											onHighlight={() => onHighlightIndex(index)}
											onSelect={() => onSelectProject(item)}
										/>
									))}
								</div>
							</section>
						) : null}

						{isLoading ? (
							<div className='px-1 text-[11px] text-(--sf-color-shell-tertiary)'>
								正在更新结果...
							</div>
						) : null}
					</div>
				)}
			</div>
		</div>
	)
}

type SearchResultButtonProps = {
	typeLabel: string
	title: string
	context: string
	note: string | null
	isActive: boolean
	onHighlight: () => void
	onSelect: () => void
}

function SearchResultButton({
	typeLabel,
	title,
	context,
	note,
	isActive,
	onHighlight,
	onSelect,
}: SearchResultButtonProps) {
	return (
		<button
			className={cn(
				'flex w-full flex-col gap-1.5 rounded-lg border px-3 py-2.5 text-left transition-colors',
				isActive
					? 'border-(--sf-color-accent-soft-border) bg-accent shadow-[inset_2px_0_0_var(--primary)]'
					: 'border-transparent hover:border-(--sf-color-border-subtle) hover:bg-(--sf-color-bg-surface-hover)',
			)}
			onClick={onSelect}
			onMouseDown={(event) => {
				event.preventDefault()
				event.stopPropagation()
			}}
			onMouseEnter={onHighlight}
			type='button'
		>
			<div className='flex items-center justify-between gap-3 text-[11px] text-(--sf-color-shell-secondary)'>
				<span>{typeLabel}</span>
				<span className='truncate'>{context}</span>
			</div>
			<div className='truncate text-[13px] font-medium text-foreground'>{title}</div>
			{note?.trim() ? (
				<div className='truncate text-[12px] text-(--sf-color-shell-tertiary)'>
					{toSnippet(note)}
				</div>
			) : null}
		</button>
	)
}

function SearchGroupHeading({ title }: { title: string }) {
	return (
		<div className='px-1 text-[10.5px] font-medium tracking-[0.06em] text-(--sf-color-shell-secondary) uppercase'>
			{title}
		</div>
	)
}

function SearchPanelState({ label, tone = 'muted' }: { label: string; tone?: 'muted' | 'danger' }) {
	return (
		<div
			className={cn(
				'flex items-center gap-2 rounded-lg border px-3 py-3 text-[12px]',
				tone === 'danger'
					? 'border-(--sf-color-danger-soft-border) bg-(--sf-color-danger-soft) text-(--sf-color-danger-soft-text)'
					: 'border-(--sf-color-border-subtle) bg-muted/60 text-(--sf-color-shell-secondary)',
			)}
		>
			<SearchIcon className='size-3.5 shrink-0' />
			<span>{label}</span>
		</div>
	)
}

function buildTaskContext(item: WorkspaceTaskSearchItem) {
	return `${formatPriority(item.priority)} / ${item.projectName ?? 'Inbox'}`
}

function buildProjectContext(item: WorkspaceProjectSearchItem) {
	return formatProjectStatus(item.status)
}

function formatPriority(priority: string | null) {
	switch (priority) {
		case 'urgent':
			return '紧急'
		case 'high':
			return '高优先级'
		case 'medium':
			return '中优先级'
		case 'low':
			return '低优先级'
		default:
			return '未设优先级'
	}
}

function formatProjectStatus(status: string) {
	switch (status) {
		case 'active':
			return '进行中'
		default:
			return status
	}
}

function toSnippet(value: string) {
	const normalized = value.trim().replace(/\s+/g, ' ')

	return normalized.length > 72 ? `${normalized.slice(0, 72)}...` : normalized
}

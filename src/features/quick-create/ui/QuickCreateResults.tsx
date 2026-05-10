import type { ReactNode } from 'react'
import { FolderIcon, LoaderCircleIcon, SearchIcon } from 'lucide-react'

import { useQuickCreate } from '@/features/quick-create/model/QuickCreateProvider'
import type { QuickCreateResultItem, QuickCreateTaskItem } from '@/features/quick-create/model/types'
import { cn } from '@/shared/lib/utils'

export function QuickCreateResults() {
	const { derived, state } = useQuickCreate()

	if (state.isBootstrapping) {
		return <PanelState icon={<LoaderCircleIcon className='size-4 animate-spin' />} label='正在初始化 Quick Create...' />
	}

	if (derived.isShowingRecent) {
		if (derived.displayTasks.length === 0 && derived.displayProjects.length === 0) {
			return <PanelState icon={<SearchIcon className='size-4' />} label='还没有最近任务或项目' />
		}

		return (
			<div className='min-h-0 flex-1 overflow-y-auto py-2'>
				<ResultSection title='最近任务'>
					{derived.displayTasks.map((item, index) => (
						<ResultRow
							index={index}
							item={{ kind: 'task', ...item }}
							key={item.id}
						/>
					))}
				</ResultSection>
				<ResultSection title='最近项目'>
					{derived.displayProjects.map((item, index) => (
						<ResultRow
							index={derived.displayTasks.length + index}
							item={{ kind: 'project', ...item }}
							key={item.id}
						/>
					))}
				</ResultSection>
			</div>
		)
	}

	if (state.isSearching && derived.flatItems.length === 0) {
		return <PanelState icon={<LoaderCircleIcon className='size-4 animate-spin' />} label='正在搜索任务与项目...' />
	}

	if (derived.flatItems.length === 0) {
		return <PanelState icon={<SearchIcon className='size-4' />} label={`没有匹配结果，按 Enter 创建“${state.draft.title.trim()}”。`} />
	}

	return (
		<div className='min-h-0 flex-1 overflow-y-auto py-2'>
			<ResultSection title='任务'>
				{derived.displayTasks.map((item, index) => (
					<ResultRow index={index} item={{ kind: 'task', ...item }} key={item.id} />
				))}
			</ResultSection>
			<ResultSection title='项目'>
				{derived.displayProjects.map((item, index) => (
					<ResultRow
						index={derived.displayTasks.length + index}
						item={{ kind: 'project', ...item }}
						key={item.id}
					/>
				))}
			</ResultSection>
		</div>
	)
}

function ResultSection({ title, children }: { title: string; children: ReactNode }) {
	const items = Array.isArray(children) ? children.filter(Boolean) : children
	const hasItems = Array.isArray(items) ? items.length > 0 : Boolean(items)

	if (!hasItems) {
		return null
	}

	return (
		<section className='border-b border-sf-divider last:border-b-0'>
			<div className='px-4 pb-1 pt-2 text-[10.5px] font-medium tracking-[0.06em] text-sf-text-quaternary uppercase'>
				{title}
			</div>
			<div>{items}</div>
		</section>
	)
}

function ResultRow({ index, item }: { index: number; item: QuickCreateResultItem }) {
	const { actions, derived } = useQuickCreate()
	const isActive = derived.activeResultIndex === index
	const title = item.kind === 'task' ? item.title : item.name
	const subtitle = getResultSubtitle(item)

	return (
		<button
			aria-label={`${item.kind === 'task' ? '打开任务' : '打开项目'} ${title}`}
			className={cn(
				'relative flex w-full items-center gap-3 px-4 py-2 text-left transition-colors',
				isActive ? 'bg-accent' : 'hover:bg-accent/65',
			)}
			onClick={() => void actions.openResult(item)}
			onMouseEnter={() => actions.focusResult(index)}
			type='button'
		>
			{isActive ? <span className='absolute inset-y-0 left-0 w-0.75 rounded-r-sm bg-primary' /> : null}
			<span
				className={cn(
					'flex size-7 shrink-0 items-center justify-center rounded-md',
					item.kind === 'task'
						? 'bg-primary/10 text-primary'
						: 'bg-sf-success-surface text-sf-success-surface-text',
				)}
			>
				<FolderIcon className='size-3.5' />
			</span>
			<span className='min-w-0 flex-1'>
				<span className='block truncate text-[12.5px] text-foreground'>{title}</span>
				<span className='mt-0.5 block truncate text-[11px] text-sf-text-quaternary'>{subtitle}</span>
			</span>
			{item.kind === 'task' && item.priority > 0 ? (
				<span className='rounded bg-muted px-1.5 py-0.5 font-mono text-[10.5px] text-sf-text-secondary'>
					{priorityCode(item.priority)}
				</span>
			) : null}
			<span className='rounded border border-sf-border-subtle px-1.5 py-0.5 text-[10.5px] text-sf-text-quaternary'>
				{item.kind === 'task' ? '任务' : '项目'}
			</span>
		</button>
	)
}

function PanelState({ icon, label }: { icon: ReactNode; label: string }) {
	return (
		<div className='flex min-h-44 flex-1 items-center justify-center px-5'>
			<div className='flex items-center gap-2 rounded-full border border-sf-border-subtle bg-muted/50 px-3 py-2 text-[12px] text-sf-text-secondary'>
				{icon}
				<span>{label}</span>
			</div>
		</div>
	)
}

function getResultSubtitle(item: QuickCreateResultItem) {
	if (item.kind === 'project') {
		return item.spaceName
	}

	if (item.projectName) {
		return `${item.spaceName} / ${item.projectName}`
	}

	return `${item.spaceName} / ${item.inboxAt ? 'Inbox' : '独立事项'}`
}

function priorityCode(priority: QuickCreateTaskItem['priority']) {
	switch (priority) {
		case 4:
			return 'P0'
		case 3:
			return 'P1'
		case 2:
			return 'P2'
		case 1:
			return 'P3'
		default:
			return '—'
	}
}

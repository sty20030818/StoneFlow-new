import {
	selectCurrentSpaceId,
	useShellLayoutStore,
} from '@/app/layouts/shell/model/useShellLayoutStore'
import { formatInboxPriorityLabel, INBOX_PRIORITY_OPTIONS } from '@/features/inbox/model/constants'
import { useInboxTasks } from '@/features/inbox/model/useInboxTasks'
import { Badge } from '@/shared/ui/base/badge'
import { Button } from '@/shared/ui/base/button'
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/shared/ui/base/select'
import { PanelSurface } from '@/shared/ui/PanelSurface'
import { cn } from '@/shared/lib/utils'
import { RefreshCwIcon } from 'lucide-react'

const TASK_CARD_BASE_CLASS = 'rounded-lg border p-4 transition-colors'
const TASK_CARD_IDLE_CLASS =
	'border-(--sf-color-border-subtle) bg-card hover:border-(--sf-color-border) hover:bg-(--sf-color-bg-surface-hover)'
const TASK_CARD_ACTIVE_CLASS =
	'border-(--sf-color-accent-soft-border) bg-accent shadow-[inset_3px_0_0_var(--primary)]'
const TASK_CARD_EMPTY_CLASS =
	'rounded-lg border border-dashed border-(--sf-color-border) bg-muted/30'

export function InboxPage() {
	const currentSpaceId = useShellLayoutStore(selectCurrentSpaceId)
	const activeDrawerId = useShellLayoutStore((state) => state.activeDrawerId)
	const activeDrawerKind = useShellLayoutStore((state) => state.activeDrawerKind)
	const openDrawer = useShellLayoutStore((state) => state.openDrawer)
	const openProjectCreateDialog = useShellLayoutStore((state) => state.openProjectCreateDialog)
	const {
		tasks,
		projects,
		isLoading,
		loadError,
		feedback,
		getDraft,
		updateDraft,
		refresh,
		submitTriage,
	} = useInboxTasks(currentSpaceId)

	return (
		<div className='p-4'>
			<PanelSurface
				actions={
					<div className='flex flex-wrap items-center gap-2'>
						<Button
							className='rounded-md'
							onClick={() => openProjectCreateDialog()}
							size='sm'
							variant='secondary'
						>
							创建项目
						</Button>
						<Button disabled={isLoading} onClick={() => void refresh()} size='sm' variant='outline'>
							<RefreshCwIcon data-icon='inline-start' />
							刷新列表
						</Button>
					</div>
				}
				description='补齐项目和优先级后，任务才会真正离开 Inbox。'
				eyebrow='Inbox'
				title='待整理队列'
			>
				{!isLoading && !loadError && tasks.length > 0 && projects.length === 0 ? (
					<div className='mb-3 flex flex-col gap-3 rounded-lg border border-(--sf-color-warning-soft-border) bg-(--sf-color-warning-soft) px-4 py-4'>
						<div className='flex flex-col gap-1'>
							<p className='text-sm font-medium text-foreground'>当前 Space 还没有项目可选</p>
							<p className='text-sm leading-6 text-muted-foreground'>
								先补一个 Project，任务才能在补齐优先级后离开 Inbox。
							</p>
						</div>
						<div>
							<Button className='rounded-md' onClick={() => openProjectCreateDialog()} size='sm'>
								创建项目
							</Button>
						</div>
					</div>
				) : null}

				{feedback ? (
					<p
						className='mb-3 rounded-lg border border-(--sf-color-success-soft-border) bg-(--sf-color-success-soft) px-3 py-2 text-sm text-(--sf-color-success-soft-text)'
						role='status'
					>
						{feedback}
					</p>
				) : null}

				{loadError ? (
					<div className='rounded-lg border border-(--sf-color-danger-soft-border) bg-(--sf-color-danger-soft) p-4'>
						<p className='text-sm text-destructive' role='alert'>
							{loadError}
						</p>
					</div>
				) : null}

				{isLoading ? (
					<p className='py-8 text-sm text-muted-foreground' role='status'>
						正在加载 Inbox...
					</p>
				) : null}

				{!isLoading && !loadError && tasks.length === 0 ? (
					<div className={cn(TASK_CARD_EMPTY_CLASS, 'px-4 py-8 text-center')}>
						<p className='text-sm font-medium text-foreground'>当前 Inbox 已清空</p>
						<p className='mt-2 text-sm text-muted-foreground'>
							新捕获的任务会先进入这里，补齐项目和优先级后再离开。
						</p>
					</div>
				) : null}

				{!isLoading && !loadError && tasks.length > 0 ? (
					<div className='flex flex-col gap-3'>
						{tasks.map((task) => {
							const draft = getDraft(task.id)

							return (
								<InboxTaskRow
									key={task.id}
									draft={draft}
									isActive={activeDrawerKind === 'task' && activeDrawerId === task.id}
									onOpenTask={() => openDrawer('task', task.id)}
									onProjectChange={(projectId) => updateDraft(task.id, { projectId, error: null })}
									onSubmit={() => void submitTriage(task.id)}
									onPriorityChange={(priority) => updateDraft(task.id, { priority, error: null })}
									projects={projects}
									task={task}
								/>
							)
						})}
					</div>
				) : null}
			</PanelSurface>
		</div>
	)
}

type InboxTaskRowProps = {
	task: {
		id: string
		projectId: string | null
		title: string
		note: string | null
		priority: string | null
	}
	projects: Array<{
		id: string
		name: string
	}>
	draft: {
		projectId: string
		priority: string
		isSubmitting: boolean
		error: string | null
	}
	isActive: boolean
	onProjectChange: (projectId: string) => void
	onPriorityChange: (priority: string) => void
	onSubmit: () => void
	onOpenTask: () => void
}

const EMPTY_PRIORITY_VALUE = '__inbox-priority-empty__'
const EMPTY_PROJECT_VALUE = '__inbox-project-empty__'

function InboxTaskRow({
	task,
	projects,
	draft,
	isActive,
	onOpenTask,
	onProjectChange,
	onPriorityChange,
	onSubmit,
}: InboxTaskRowProps) {
	const currentProjectName =
		projects.find((project) => project.id === (draft.projectId || task.projectId))?.name ??
		'待归类项目'
	const projectChanged = (draft.projectId || null) !== task.projectId
	const priorityChanged = (draft.priority || null) !== task.priority
	const canSubmit = projectChanged || priorityChanged

	return (
		<article
			className={cn(
				TASK_CARD_BASE_CLASS,
				'grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px_auto] lg:items-start',
				isActive ? TASK_CARD_ACTIVE_CLASS : TASK_CARD_IDLE_CLASS,
				draft.isSubmitting ? 'opacity-75' : null,
			)}
			data-shell-task-card='true'
			data-task-id={task.id}
		>
			<div className='min-w-0 space-y-3'>
				<div className='flex flex-wrap items-center gap-2'>
					<button
						className='cursor-pointer text-left text-sm font-semibold text-foreground transition-colors hover:text-primary'
						onClick={onOpenTask}
						type='button'
					>
						{task.title}
					</button>
					<Badge variant='outline'>
						{formatInboxPriorityLabel(draft.priority || task.priority)}
					</Badge>
					<Badge variant='secondary'>{currentProjectName}</Badge>
				</div>
				<p className='text-sm leading-6 text-muted-foreground'>
					{task.note?.trim() || '这条任务还没有补充备注，建议尽快完成最小归类后再继续处理。'}
				</p>
				{draft.error ? (
					<p className='text-sm text-destructive' role='alert'>
						{draft.error}
					</p>
				) : null}
			</div>

			<label className='flex flex-col gap-1 text-xs font-medium text-muted-foreground'>
				优先级
				<Select
					aria-label={`${task.title} 优先级`}
					disabled={draft.isSubmitting}
					onValueChange={(value) => onPriorityChange(value === EMPTY_PRIORITY_VALUE ? '' : value)}
					value={draft.priority || EMPTY_PRIORITY_VALUE}
				>
					<SelectTrigger
						aria-label={`${task.title} 优先级`}
						className='h-9 w-full rounded-md bg-card'
					>
						<SelectValue placeholder='待补齐' />
					</SelectTrigger>
					<SelectContent position='popper'>
						<SelectGroup>
							<SelectItem value={EMPTY_PRIORITY_VALUE}>待补齐</SelectItem>
							{INBOX_PRIORITY_OPTIONS.map((option) => (
								<SelectItem key={option.value} value={option.value}>
									{option.label}
								</SelectItem>
							))}
						</SelectGroup>
					</SelectContent>
				</Select>
			</label>

			<label className='flex flex-col gap-1 text-xs font-medium text-muted-foreground'>
				项目
				<Select
					aria-label={`${task.title} 项目`}
					disabled={draft.isSubmitting}
					onValueChange={(value) => onProjectChange(value === EMPTY_PROJECT_VALUE ? '' : value)}
					value={draft.projectId || EMPTY_PROJECT_VALUE}
				>
					<SelectTrigger
						aria-label={`${task.title} 项目`}
						className='h-9 w-full rounded-md bg-card'
					>
						<SelectValue placeholder='待补齐' />
					</SelectTrigger>
					<SelectContent position='popper'>
						<SelectGroup>
							<SelectItem value={EMPTY_PROJECT_VALUE}>待补齐</SelectItem>
							{projects.map((project) => (
								<SelectItem key={project.id} value={project.id}>
									{project.name}
								</SelectItem>
							))}
						</SelectGroup>
					</SelectContent>
				</Select>
			</label>

			<div className='flex items-start justify-end'>
				<Button disabled={draft.isSubmitting || !canSubmit} onClick={onSubmit} size='sm'>
					{draft.isSubmitting ? '整理中...' : '整理'}
				</Button>
			</div>
		</article>
	)
}

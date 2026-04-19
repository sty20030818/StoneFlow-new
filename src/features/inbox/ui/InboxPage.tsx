import {
	selectCurrentSpaceId,
	useShellLayoutStore,
} from '@/app/layouts/shell/model/useShellLayoutStore'
import { formatInboxPriorityLabel, INBOX_PRIORITY_OPTIONS } from '@/features/inbox/model/constants'
import { useInboxTasks } from '@/features/inbox/model/useInboxTasks'
import { Badge } from '@/shared/ui/base/badge'
import { Button } from '@/shared/ui/base/button'
import { PanelSurface } from '@/shared/ui/PanelSurface'
import { RefreshCwIcon } from 'lucide-react'

export function InboxPage() {
	const currentSpaceId = useShellLayoutStore(selectCurrentSpaceId)
	const openDrawer = useShellLayoutStore((state) => state.openDrawer)
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
					<Button disabled={isLoading} onClick={() => void refresh()} size='sm' variant='outline'>
						<RefreshCwIcon data-icon='inline-start' />
						刷新列表
					</Button>
				}
				description='补齐项目和优先级后，任务才会真正离开 Inbox。'
				eyebrow='Inbox'
				title='待整理队列'
			>
				{feedback ? (
					<p
						className='mb-3 rounded-xl border border-emerald-500/30 bg-emerald-500/8 px-3 py-2 text-sm text-emerald-700'
						role='status'
					>
						{feedback}
					</p>
				) : null}

				{loadError ? (
					<div className='rounded-2xl border border-destructive/30 bg-destructive/5 p-4'>
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
					<div className='rounded-2xl border border-dashed border-border/80 bg-muted/20 px-4 py-8 text-center'>
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
	onProjectChange: (projectId: string) => void
	onPriorityChange: (priority: string) => void
	onSubmit: () => void
	onOpenTask: () => void
}

function InboxTaskRow({
	task,
	projects,
	draft,
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
		<article className='grid gap-3 rounded-2xl border border-border/70 bg-background/80 p-4 lg:grid-cols-[minmax(0,1fr)_180px_180px_auto] lg:items-start'>
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
				<select
					aria-label={`${task.title} 优先级`}
					className='h-9 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-ring'
					disabled={draft.isSubmitting}
					onChange={(event) => onPriorityChange(event.target.value)}
					value={draft.priority}
				>
					<option value=''>待补齐</option>
					{INBOX_PRIORITY_OPTIONS.map((option) => (
						<option key={option.value} value={option.value}>
							{option.label}
						</option>
					))}
				</select>
			</label>

			<label className='flex flex-col gap-1 text-xs font-medium text-muted-foreground'>
				项目
				<select
					aria-label={`${task.title} 项目`}
					className='h-9 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-ring'
					disabled={draft.isSubmitting}
					onChange={(event) => onProjectChange(event.target.value)}
					value={draft.projectId}
				>
					<option value=''>待补齐</option>
					{projects.map((project) => (
						<option key={project.id} value={project.id}>
							{project.name}
						</option>
					))}
				</select>
			</label>

			<div className='flex items-start justify-end'>
				<Button disabled={draft.isSubmitting || !canSubmit} onClick={onSubmit} size='sm'>
					{draft.isSubmitting ? '整理中...' : '整理'}
				</Button>
			</div>
		</article>
	)
}

import {
	selectCurrentSpaceId,
	useShellLayoutStore,
} from '@/app/layouts/shell/model/useShellLayoutStore'
import { useInboxTasks } from '@/features/inbox/model/useInboxTasks'
import { useTaskSelection } from '@/features/task/model/useTaskSelection'
import {
	TaskLeadRail,
	TaskPrioritySelect,
	TaskSelectionCheckbox,
	TaskStatusSelect,
} from '@/features/task/ui/TaskMetadataSelect'
import { Button } from '@/shared/ui/base/button'
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyPage,
	EmptyTitle,
} from '@/shared/ui/base/empty'
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/shared/ui/base/select'
import { StatusNotice } from '@/shared/ui/StatusNotice'
import { ToastFeedbackBridge } from '@/shared/ui/ToastFeedbackBridge'
import { cn } from '@/shared/lib/utils'
import {
	LINEAR_CARD_ACTIVE_CLASS,
	LINEAR_CARD_BASE_CLASS,
	LINEAR_CARD_IDLE_CLASS,
} from '@/shared/ui/linearSurface'
import {
	MainCardGhostAction,
	MainCardHeader,
	MainCardLayout,
	MainCardToolbar,
} from '@/app/layouts/main-card/MainCardLayout'
import { TaskContextMenu } from '@/features/task/ui/TaskContextMenu'
import { InboxIcon, PlusIcon } from 'lucide-react'

export function InboxPage() {
	const currentSpaceId = useShellLayoutStore(selectCurrentSpaceId)
	const activeDrawerId = useShellLayoutStore((state) => state.activeDrawerId)
	const activeDrawerKind = useShellLayoutStore((state) => state.activeDrawerKind)
	const openDrawer = useShellLayoutStore((state) => state.openDrawer)
	const openProjectCreateDialog = useShellLayoutStore((state) => state.openProjectCreateDialog)
	const openTaskCreateDialog = useShellLayoutStore((state) => state.openTaskCreateDialog)
	const {
		tasks,
		projects,
		isLoading,
		loadError,
		feedback,
		getDraft,
		updateDraft,
		refresh,
		updateTaskStatus,
		submitTriage,
		moveTaskToTrash,
	} = useInboxTasks(currentSpaceId)
	const { selectedTaskIdSet, toggleTaskSelection } = useTaskSelection(tasks.map((task) => task.id))

	return (
		<MainCardLayout
			header={
				<MainCardHeader
					action={
						<MainCardGhostAction aria-label='创建项目' onClick={() => openProjectCreateDialog()}>
							<PlusIcon />
						</MainCardGhostAction>
					}
					title='Inbox'
				/>
			}
			toolbar={
				<MainCardToolbar
					onRefresh={() => void refresh()}
					pills={[
						{ label: 'All issues', active: true },
						{ label: 'Untriaged' },
						{ label: 'Ready' },
					]}
					refreshDisabled={isLoading}
				/>
			}
		>
			<div className='flex min-h-0 flex-1 flex-col'>
				<ToastFeedbackBridge feedback={feedback} />

				{!isLoading && !loadError && tasks.length > 0 && projects.length === 0 ? (
					<StatusNotice
						actions={
							<Button onClick={() => openProjectCreateDialog()} size='sm'>
								创建项目
							</Button>
						}
						className='mb-3'
						description='先补一个 Project，任务才能在补齐优先级后离开 Inbox。'
						title='当前 Space 还没有项目可选'
						variant='warning'
					/>
				) : null}

				{loadError ? (
					<StatusNotice className='mb-3' role='alert' variant='danger'>
						<p className='text-sm'>{loadError}</p>
					</StatusNotice>
				) : null}

				<div className='flex min-h-0 flex-1 flex-col'>
					{isLoading ? (
						<p className='py-8 text-sm text-muted-foreground' role='status'>
							正在加载 Inbox...
						</p>
					) : null}

					{!isLoading && !loadError && tasks.length === 0 ? (
						<EmptyPage>
							<Empty>
								<EmptyHeader>
									<EmptyMedia variant='icon'>
										<InboxIcon />
									</EmptyMedia>
									<EmptyTitle>当前 Inbox 已清空</EmptyTitle>
									<EmptyDescription>
										新捕获的任务会先进入这里，补齐项目和优先级后再离开。
									</EmptyDescription>
								</EmptyHeader>
								<EmptyContent>
									<Button onClick={() => openTaskCreateDialog()} type='button'>
										创建任务
									</Button>
								</EmptyContent>
							</Empty>
						</EmptyPage>
					) : null}

					{!isLoading && !loadError && tasks.length > 0 ? (
						<div className='flex min-h-0 flex-1 flex-col gap-3'>
							{tasks.map((task) => {
								const draft = getDraft(task.id)

								return (
									<InboxTaskRow
										key={task.id}
										draft={draft}
										isActive={activeDrawerKind === 'task' && activeDrawerId === task.id}
										onMoveTaskToTrash={() => void moveTaskToTrash(task.id)}
										onPriorityChange={(priority) => updateDraft(task.id, { priority, error: null })}
										onProjectChange={(projectId) =>
											updateDraft(task.id, { projectId, error: null })
										}
										onStatusChange={(status) => void updateTaskStatus(task.id, status)}
										onSubmit={() => void submitTriage(task.id)}
										onOpenTask={() => openDrawer('task', task.id)}
										onToggleTaskSelection={() => toggleTaskSelection(task.id)}
										projects={projects}
										selected={selectedTaskIdSet.has(task.id)}
										task={task}
									/>
								)
							})}
						</div>
					) : null}
				</div>
			</div>
		</MainCardLayout>
	)
}

type InboxTaskRowProps = {
	task: {
		id: string
		projectId: string | null
		title: string
		note: string | null
		priority: string | null
		status: string
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
	selected: boolean
	onProjectChange: (projectId: string) => void
	onPriorityChange: (priority: string) => void
	onStatusChange: (status: 'todo' | 'done') => void
	onSubmit: () => void
	onOpenTask: () => void
	onMoveTaskToTrash: () => void
	onToggleTaskSelection: () => void
}

const EMPTY_PROJECT_VALUE = '__inbox-project-empty__'

function InboxTaskRow({
	task,
	projects,
	draft,
	isActive,
	selected,
	onPriorityChange,
	onProjectChange,
	onStatusChange,
	onSubmit,
	onOpenTask,
	onMoveTaskToTrash,
	onToggleTaskSelection,
}: InboxTaskRowProps) {
	const projectChanged = (draft.projectId || null) !== task.projectId
	const priorityChanged = (draft.priority || null) !== task.priority
	const canSubmit = projectChanged || priorityChanged

	return (
		<TaskContextMenu
			isBusy={draft.isSubmitting}
			onMoveToTrash={onMoveTaskToTrash}
			onOpenDetails={onOpenTask}
		>
			<article
				className={cn(
					LINEAR_CARD_BASE_CLASS,
					'group grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_auto] lg:items-start',
					isActive ? LINEAR_CARD_ACTIVE_CLASS : LINEAR_CARD_IDLE_CLASS,
					draft.isSubmitting ? 'opacity-75' : null,
				)}
				data-shell-task-card='true'
				data-task-id={task.id}
			>
				<div className='min-w-0 space-y-3'>
					<div className='flex min-w-0 items-start gap-2.5'>
						<TaskLeadRail className='pt-0.5'>
							<TaskSelectionCheckbox
								ariaLabel={`选择任务 ${task.title}`}
								checked={selected}
								disabled={draft.isSubmitting}
								onCheckedChange={onToggleTaskSelection}
							/>
							<TaskPrioritySelect
								ariaLabel={`${task.title} 优先级`}
								disabled={draft.isSubmitting}
								onValueChange={onPriorityChange}
								value={draft.priority || task.priority}
							/>
							<TaskStatusSelect
								ariaLabel={`${task.title} 状态`}
								disabled={draft.isSubmitting}
								onValueChange={onStatusChange}
								value={task.status === 'done' ? 'done' : 'todo'}
							/>
						</TaskLeadRail>
						<div className='min-w-0 space-y-2'>
							<button
								className='cursor-pointer text-left text-sm font-semibold text-foreground transition-colors hover:text-primary group-hover:text-primary'
								onClick={onOpenTask}
								type='button'
							>
								{task.title}
							</button>
							<p className='text-sm leading-6 text-muted-foreground'>
								{task.note?.trim() || '这条任务还没有补充备注，建议尽快完成最小归类后再继续处理。'}
							</p>
						</div>
					</div>
					{draft.error ? (
						<p className='text-sm text-(--sf-color-danger-soft-text)' role='alert'>
							{draft.error}
						</p>
					) : null}
				</div>

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
		</TaskContextMenu>
	)
}

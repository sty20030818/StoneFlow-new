import { useNavigate, useParams } from 'react-router-dom'

import {
	selectActiveDrawerId,
	selectActiveDrawerKind,
	useShellLayoutStore,
} from '@/app/layouts/shell/model/useShellLayoutStore'
import { useProjectExecution } from '@/features/project/model/useProjectExecution'
import type { ProjectExecutionTask } from '@/features/project/model/types'
import { Badge } from '@/shared/ui/base/badge'
import { Button } from '@/shared/ui/base/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/shared/ui/base/dropdown-menu'
import { StatusNotice } from '@/shared/ui/StatusNotice'
import { getProjectStatusBadgeVariant, getTaskStatusBadgeVariant } from '@/shared/ui/badgeSemantics'
import { cn } from '@/shared/lib/utils'
import {
	LINEAR_CARD_ACTIVE_CLASS,
	LINEAR_CARD_BASE_CLASS,
	LINEAR_CARD_DONE_CLASS,
	LINEAR_CARD_IDLE_CLASS,
	LINEAR_EMPTY_STATE_CLASS,
} from '@/shared/ui/linearSurface'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from '@/shared/ui/base/breadcrumb'
import {
	MainCardGhostAction,
	MainCardHeader,
	MainCardLayout,
	MainCardToolbar,
} from '@/app/layouts/main-card/MainCardLayout'
import { FolderOpenDotIcon, MoreHorizontalIcon, PlusIcon, Trash2Icon } from 'lucide-react'

const TASK_CARD_INTERACTIVE_CLASS = 'group cursor-pointer'
const TASK_CARD_GRID_CLASS = 'flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between'

export function ProjectPage() {
	const { projectId = 'stoneflow-v1', spaceId = 'work' } = useParams()
	const navigate = useNavigate()
	const activeDrawerKind = useShellLayoutStore(selectActiveDrawerKind)
	const activeDrawerId = useShellLayoutStore(selectActiveDrawerId)
	const openDrawer = useShellLayoutStore((state) => state.openDrawer)
	const openProjectCreateDialog = useShellLayoutStore((state) => state.openProjectCreateDialog)
	const {
		view,
		isLoading,
		loadError,
		feedback,
		pendingTaskId,
		isDeletingProject,
		refresh,
		toggleTaskStatus,
		deleteCurrentProject,
	} = useProjectExecution(spaceId, projectId)
	const todoTasks = view?.tasks.filter((task) => task.status === 'todo') ?? []
	const doneTasks = view?.tasks.filter((task) => task.status === 'done') ?? []
	const handleDeleteProject = async () => {
		const deleted = await deleteCurrentProject()

		if (deleted) {
			navigate(`/space/${spaceId}/trash`)
		}
	}

	return (
		<MainCardLayout
			header={
				<MainCardHeader
					action={
						view ? (
							<MainCardGhostAction
								aria-label='子项目'
								onClick={() => openProjectCreateDialog(view.project.id)}
							>
								<PlusIcon />
							</MainCardGhostAction>
						) : null
					}
					breadcrumb={<ProjectBreadcrumb projectName={view?.project.name ?? projectId} />}
				/>
			}
			toolbar={
				<MainCardToolbar
					onRefresh={() => void refresh()}
					pills={[{ label: 'All issues', active: true }, { label: 'Active' }, { label: 'Backlog' }]}
					refreshDisabled={isLoading}
				/>
			}
		>
			<div className='flex flex-col gap-5 pt-4'>
				{feedback ? (
					<StatusNotice className='mb-3 text-sm' role='status' size='sm' variant='success'>
						{feedback}
					</StatusNotice>
				) : null}

				{loadError ? (
					<StatusNotice
						actions={
							<Button
								className='rounded-md'
								onClick={() => void refresh()}
								size='sm'
								variant='outline'
							>
								重试
							</Button>
						}
						role='alert'
						variant='danger'
					>
						<p className='text-sm'>{loadError}</p>
					</StatusNotice>
				) : null}

				{isLoading ? (
					<p className='text-sm text-muted-foreground' role='status'>
						正在加载 Project 执行视图...
					</p>
				) : view ? (
					<section className='flex flex-wrap items-center justify-between gap-3'>
						<div className='flex min-w-0 flex-wrap items-center gap-2'>
							<h2 className='sr-only'>项目工作区 · {view.project.name}</h2>
							<Badge variant={getProjectStatusBadgeVariant(view.project.status)}>
								{view.project.status}
							</Badge>
							<Badge variant='outline'>{view.tasks.length} tasks</Badge>
							<Badge variant='secondary'>待执行 {todoTasks.length}</Badge>
							<Badge variant='success'>已完成 {doneTasks.length}</Badge>
						</div>
						<ProjectMoreActions
							isDeletingProject={isDeletingProject}
							onDeleteProject={handleDeleteProject}
							onRefresh={refresh}
						/>
					</section>
				) : null}

				{view?.childProjects.length ? (
					<section className='flex flex-col gap-3'>
						<div>
							<h2 className='text-sm font-semibold text-foreground'>子项目</h2>
							<p className='mt-1 text-sm text-muted-foreground'>
								子项目用于继续拆分当前项目下的执行块，保持主项目视图清晰。
							</p>
						</div>
						<div className='grid gap-2 sm:grid-cols-2'>
							{view.childProjects.map((project) => (
								<button
									className='group flex min-h-16 items-center gap-3 rounded-lg border border-(--sf-color-border-subtle) bg-card px-3 py-3 text-left transition-colors hover:border-(--sf-color-border) hover:bg-(--sf-color-bg-surface-hover)'
									key={project.id}
									onClick={() => navigate(`/space/${spaceId}/project/${project.id}`)}
									type='button'
								>
									<span className='flex size-8 shrink-0 items-center justify-center rounded-md border border-(--sf-color-border-subtle) bg-muted text-(--sf-color-text-secondary)'>
										<FolderOpenDotIcon className='size-4' />
									</span>
									<span className='min-w-0 flex-1'>
										<span className='block truncate text-sm font-medium text-foreground transition-colors group-hover:text-primary'>
											{project.name}
										</span>
										<span className='mt-1 block text-xs text-muted-foreground'>
											{project.status}
										</span>
									</span>
								</button>
							))}
						</div>
					</section>
				) : null}

				<section className='flex flex-col gap-3'>
					<div>
						<h2 className='text-sm font-semibold text-foreground'>待执行</h2>
						<p className='mt-1 text-sm text-muted-foreground'>
							这里保留当前项目下还未完成的执行项，点击任务标题可直接打开右侧详情。
						</p>
					</div>
					<ProjectTaskGroup
						emptyMessage='当前 Project 还没有待执行任务。'
						activeTaskId={activeDrawerKind === 'task' ? activeDrawerId : null}
						onOpenTask={(taskId) => openDrawer('task', taskId)}
						pendingTaskId={pendingTaskId}
						tasks={todoTasks}
						onToggleTaskStatus={toggleTaskStatus}
					/>
				</section>

				<section className='flex flex-col gap-3'>
					<div>
						<h2 className='text-sm font-semibold text-foreground'>已完成</h2>
						<p className='mt-1 text-sm text-muted-foreground'>
							已完成任务会沉到底部，便于回看最近的推进结果和关闭情况。
						</p>
					</div>
					<ProjectTaskGroup
						emptyMessage='还没有完成的任务。'
						activeTaskId={activeDrawerKind === 'task' ? activeDrawerId : null}
						onOpenTask={(taskId) => openDrawer('task', taskId)}
						pendingTaskId={pendingTaskId}
						tasks={doneTasks}
						onToggleTaskStatus={toggleTaskStatus}
					/>
				</section>
			</div>
		</MainCardLayout>
	)
}

function ProjectBreadcrumb({ projectName }: { projectName: string }) {
	return (
		<Breadcrumb>
			<BreadcrumbList className='text-[1.0625rem] font-semibold'>
				<BreadcrumbItem>
					<span className='text-foreground'>Projects</span>
				</BreadcrumbItem>
				<BreadcrumbSeparator />
				<BreadcrumbItem className='min-w-0'>
					<BreadcrumbPage className='flex min-w-0 items-center gap-2 font-semibold'>
						<FolderOpenDotIcon className='size-4 shrink-0 text-(--sf-color-text-tertiary)' />
						<span className='truncate'>{projectName}</span>
					</BreadcrumbPage>
				</BreadcrumbItem>
			</BreadcrumbList>
		</Breadcrumb>
	)
}

type ProjectMoreActionsProps = {
	isDeletingProject: boolean
	onRefresh: () => Promise<void>
	onDeleteProject: () => Promise<void>
}

function ProjectMoreActions({
	isDeletingProject,
	onRefresh,
	onDeleteProject,
}: ProjectMoreActionsProps) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button aria-label='更多项目操作' size='icon-sm' variant='ghost'>
					<MoreHorizontalIcon />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align='end'>
				<DropdownMenuGroup>
					<DropdownMenuItem onSelect={() => void onRefresh()}>刷新执行视图</DropdownMenuItem>
					<DropdownMenuItem disabled>点击任务标题可打开详情 Drawer</DropdownMenuItem>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuItem
						disabled={isDeletingProject}
						onSelect={() => void onDeleteProject()}
						variant='destructive'
					>
						<Trash2Icon />
						{isDeletingProject ? '移入中...' : '移入回收站'}
					</DropdownMenuItem>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}

type ProjectTaskGroupProps = {
	tasks: ProjectExecutionTask[]
	pendingTaskId: string | null
	activeTaskId: string | null
	emptyMessage: string
	onToggleTaskStatus: (task: ProjectExecutionTask) => Promise<void>
	onOpenTask: (taskId: string) => void
}

function ProjectTaskGroup({
	tasks,
	pendingTaskId,
	activeTaskId,
	emptyMessage,
	onToggleTaskStatus,
	onOpenTask,
}: ProjectTaskGroupProps) {
	if (tasks.length === 0) {
		return (
			<div className={cn(LINEAR_EMPTY_STATE_CLASS, 'px-4 py-6 text-sm text-muted-foreground')}>
				{emptyMessage}
			</div>
		)
	}

	return (
		<div className='flex flex-col gap-3'>
			{tasks.map((task) => (
				<div
					aria-label={`打开任务 ${task.title}`}
					className={cn(
						LINEAR_CARD_BASE_CLASS,
						TASK_CARD_INTERACTIVE_CLASS,
						TASK_CARD_GRID_CLASS,
						task.status === 'done' ? LINEAR_CARD_DONE_CLASS : LINEAR_CARD_IDLE_CLASS,
						activeTaskId === task.id ? LINEAR_CARD_ACTIVE_CLASS : null,
						pendingTaskId === task.id ? 'opacity-75' : null,
					)}
					data-shell-task-card='true'
					data-task-id={task.id}
					key={task.id}
					onClick={() => onOpenTask(task.id)}
					onKeyDown={(event) => {
						if (event.key === 'Enter' || event.key === ' ') {
							event.preventDefault()
							onOpenTask(task.id)
						}
					}}
					role='button'
					tabIndex={0}
				>
					<div className='space-y-2'>
						<div className='flex flex-wrap items-center gap-2'>
							<div
								className={cn(
									'text-left text-sm font-semibold transition-colors group-hover:text-primary',
									task.status === 'done' ? 'text-muted-foreground line-through' : 'text-foreground',
								)}
							>
								{task.title}
							</div>
							<Badge variant='outline'>{task.priority}</Badge>
							<Badge variant={getTaskStatusBadgeVariant(task.status)}>
								{task.status === 'todo' ? '待执行' : '已完成'}
							</Badge>
						</div>
						<p className='text-sm leading-6 text-muted-foreground'>
							{task.note?.trim() || '当前任务没有补充备注，可直接在 Project 中推进执行。'}
						</p>
						{task.completedAt ? (
							<p className='text-xs text-muted-foreground'>
								完成于 {new Date(task.completedAt).toLocaleString('zh-CN')}
							</p>
						) : null}
					</div>

					<div className='flex shrink-0 items-start'>
						<Button
							disabled={pendingTaskId === task.id}
							onClick={(event) => {
								event.stopPropagation()
								void onToggleTaskStatus(task)
							}}
							size='sm'
							variant='outline'
						>
							{pendingTaskId === task.id
								? '更新中...'
								: task.status === 'todo'
									? '标记完成'
									: '恢复待执行'}
						</Button>
					</div>
				</div>
			))}
		</div>
	)
}

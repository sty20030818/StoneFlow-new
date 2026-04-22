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
import { PanelSurface } from '@/shared/ui/PanelSurface'
import { cn } from '@/shared/lib/utils'
import { FolderOpenDotIcon, MoreHorizontalIcon, PlusIcon, Trash2Icon } from 'lucide-react'

export function ProjectPage() {
	const { projectId = 'stoneflow-v1', spaceId = 'default' } = useParams()
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
		<div className='flex flex-col gap-5 p-4'>
			<PanelSurface
				actions={
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button className='rounded-xl' size='icon-sm' variant='outline'>
								<MoreHorizontalIcon />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align='end'>
							<DropdownMenuGroup>
								<DropdownMenuItem onSelect={() => void refresh()}>刷新执行视图</DropdownMenuItem>
								<DropdownMenuItem disabled>点击任务标题可打开详情 Drawer</DropdownMenuItem>
							</DropdownMenuGroup>
							<DropdownMenuSeparator />
							<DropdownMenuGroup>
								<DropdownMenuItem
									disabled={isDeletingProject}
									onSelect={() => void handleDeleteProject()}
									variant='destructive'
								>
									<Trash2Icon />
									{isDeletingProject ? '移入中...' : '移入回收站'}
								</DropdownMenuItem>
							</DropdownMenuGroup>
						</DropdownMenuContent>
					</DropdownMenu>
				}
				eyebrow='Project'
				title={`项目工作区 · ${view?.project.name ?? projectId}`}
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
					<div className='flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-3 sm:flex-row sm:items-center sm:justify-between'>
						<p className='text-sm text-destructive' role='alert'>
							{loadError}
						</p>
						<Button className='rounded-xl' onClick={() => void refresh()} size='sm' variant='outline'>
							重试
						</Button>
					</div>
				) : null}

				{isLoading ? (
					<p className='text-sm text-muted-foreground' role='status'>
						正在加载 Project 执行视图...
					</p>
				) : view ? (
					<div className='flex flex-wrap items-center gap-2'>
						<Badge>{view.project.status}</Badge>
						<Badge variant='outline'>{view.tasks.length} tasks</Badge>
						<Badge variant='secondary'>待执行 {todoTasks.length}</Badge>
						<Badge variant='secondary'>已完成 {doneTasks.length}</Badge>
						<Button
							className='rounded-xl'
							onClick={() => void refresh()}
							size='sm'
							variant='outline'
						>
							刷新
						</Button>
						{view ? (
							<Button
								className='rounded-xl'
								onClick={() => openProjectCreateDialog(view.project.id)}
								size='sm'
								variant='secondary'
							>
								<PlusIcon data-icon='inline-start' />
								子项目
							</Button>
						) : null}
					</div>
				) : null}
			</PanelSurface>

			{view?.childProjects.length ? (
				<PanelSurface eyebrow='Project' title='子项目'>
					<div className='grid gap-2 sm:grid-cols-2'>
						{view.childProjects.map((project) => (
							<button
								className='flex min-h-16 items-center gap-3 rounded-xl border border-border/70 bg-background/80 px-3 py-3 text-left transition-colors hover:border-border hover:bg-background'
								key={project.id}
								onClick={() => navigate(`/space/${spaceId}/project/${project.id}`)}
								type='button'
							>
								<span className='flex size-8 shrink-0 items-center justify-center rounded-lg bg-black/6 text-muted-foreground'>
									<FolderOpenDotIcon className='size-4' />
								</span>
								<span className='min-w-0 flex-1'>
									<span className='block truncate text-sm font-medium text-foreground'>
										{project.name}
									</span>
									<span className='mt-1 block text-xs text-muted-foreground'>{project.status}</span>
								</span>
							</button>
						))}
					</div>
				</PanelSurface>
			) : null}

			<PanelSurface eyebrow='Execution' title='待执行'>
				<ProjectTaskGroup
					emptyMessage='当前 Project 还没有待执行任务。'
					activeTaskId={activeDrawerKind === 'task' ? activeDrawerId : null}
					onOpenTask={(taskId) => openDrawer('task', taskId)}
					pendingTaskId={pendingTaskId}
					tasks={todoTasks}
					onToggleTaskStatus={toggleTaskStatus}
				/>
			</PanelSurface>

			<PanelSurface eyebrow='Execution' title='已完成'>
				<ProjectTaskGroup
					emptyMessage='还没有完成的任务。'
					activeTaskId={activeDrawerKind === 'task' ? activeDrawerId : null}
					onOpenTask={(taskId) => openDrawer('task', taskId)}
					pendingTaskId={pendingTaskId}
					tasks={doneTasks}
					onToggleTaskStatus={toggleTaskStatus}
				/>
			</PanelSurface>
		</div>
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
			<div className='rounded-2xl border border-dashed border-border/80 bg-muted/20 px-4 py-6 text-sm text-muted-foreground'>
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
						'flex cursor-pointer flex-col gap-3 rounded-2xl border p-4 transition-colors lg:flex-row lg:items-start lg:justify-between',
						task.status === 'done'
							? 'border-border/60 bg-muted/30 text-muted-foreground'
							: 'border-border/70 bg-background/80 hover:border-border hover:bg-background',
						activeTaskId === task.id
							? 'border-primary/45 bg-primary/6 shadow-[inset_3px_0_0_var(--primary)]'
							: null,
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
							<Badge variant='secondary'>{task.status === 'todo' ? '待执行' : '已完成'}</Badge>
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

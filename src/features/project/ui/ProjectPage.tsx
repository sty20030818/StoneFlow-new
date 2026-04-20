import { useParams } from 'react-router-dom'

import { useShellLayoutStore } from '@/app/layouts/shell/model/useShellLayoutStore'
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
import { MoreHorizontalIcon } from 'lucide-react'

export function ProjectPage() {
	const { projectId = 'stoneflow-v1', spaceId = 'default' } = useParams()
	const openDrawer = useShellLayoutStore((state) => state.openDrawer)
	const { view, isLoading, loadError, feedback, pendingTaskId, refresh, toggleTaskStatus } =
		useProjectExecution(spaceId, projectId)
	const todoTasks = view?.tasks.filter((task) => task.status === 'todo') ?? []
	const doneTasks = view?.tasks.filter((task) => task.status === 'done') ?? []

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
								<DropdownMenuItem disabled variant='destructive'>
									归档预览
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
					<p
						className='rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive'
						role='alert'
					>
						{loadError}
					</p>
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
					</div>
				) : null}
			</PanelSurface>

			<PanelSurface eyebrow='Execution' title='待执行'>
				<ProjectTaskGroup
					emptyMessage='当前 Project 还没有待执行任务。'
					onOpenTask={(taskId) => openDrawer('task', taskId)}
					pendingTaskId={pendingTaskId}
					tasks={todoTasks}
					onToggleTaskStatus={toggleTaskStatus}
				/>
			</PanelSurface>

			<PanelSurface eyebrow='Execution' title='已完成'>
				<ProjectTaskGroup
					emptyMessage='还没有完成的任务。'
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
	emptyMessage: string
	onToggleTaskStatus: (task: ProjectExecutionTask) => Promise<void>
	onOpenTask: (taskId: string) => void
}

function ProjectTaskGroup({
	tasks,
	pendingTaskId,
	emptyMessage,
	onToggleTaskStatus,
	onOpenTask,
}: ProjectTaskGroupProps) {
	if (tasks.length === 0) {
		return <p className='text-sm text-muted-foreground'>{emptyMessage}</p>
	}

	return (
		<div className='flex flex-col gap-3'>
			{tasks.map((task) => (
				<div
					aria-label={`打开任务 ${task.title}`}
					className='flex cursor-pointer flex-col gap-3 rounded-2xl border border-border/70 bg-background/80 p-4 transition-colors hover:border-border hover:bg-background lg:flex-row lg:items-start lg:justify-between'
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
							<div className='text-left text-sm font-semibold text-foreground transition-colors group-hover:text-primary'>
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

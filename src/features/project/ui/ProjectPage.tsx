import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { buildScopedSectionPath } from '@/app/layouts/shell/config'
import {
	MainCardHeader,
	MainCardLayout,
	MainCardToolbar,
} from '@/app/layouts/main-card/MainCardLayout'
import { useDrawerStore } from '@/app/layouts/shell/model/useDrawerStore'
import { selectProjectDetail, useProjectStore } from '@/features/project/model/useProjectStore'
import { ProjectTaskBoard } from '@/features/project/ui/ProjectTaskBoard'
import { useScopeRoute } from '@/features/space/model/scopeRoute'
import { useTaskListController } from '@/features/task/model/useTaskListController'
import { formatTaskStatusLabel } from '@/features/task/model/taskStatus'
import { useTaskSelection } from '@/features/task/model/useTaskSelection'
import { TaskBulkActionBar } from '@/features/task/ui/TaskBulkActionBar'
import { CommandIcon } from 'lucide-react'
import { selectTaskList, useTaskStore } from '@/features/task/model/useTaskStore'
import type { TaskStatus } from '@/shared/types'
import { Button } from '@/shared/ui/base/button'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from '@/shared/ui/base/breadcrumb'
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyPage,
	EmptyTitle,
} from '@/shared/ui/base/empty'
import { BoxIcon, FolderIcon } from 'lucide-react'

type ProjectTaskFilter = 'all' | TaskStatus

const PROJECT_TASK_FILTERS: ProjectTaskFilter[] = [
	'all',
	'doing',
	'todo',
	'waiting',
	'done',
	'canceled',
]

export function ProjectPage() {
	const navigate = useNavigate()
	const { projectId = '' } = useParams()
	const { scope, spaceId } = useScopeRoute()
	const openDrawer = useDrawerStore((state) => state.openDrawer)
	const activeDrawerId = useDrawerStore((state) => state.activeDrawerId)
	const activeDrawerKind = useDrawerStore((state) => state.activeDrawerKind)
	const detail = useProjectStore(selectProjectDetail)
	const loadDetail = useProjectStore((state) => state.loadDetail)
	const clearDetail = useProjectStore((state) => state.clearDetail)
	const completeProject = useProjectStore((state) => state.completeProject)
	const reopenProject = useProjectStore((state) => state.reopenProject)
	const archiveProject = useProjectStore((state) => state.archiveProject)
	const deleteProject = useProjectStore((state) => state.deleteProject)
	const taskList = useTaskStore(selectTaskList)
	const loadTaskList = useTaskStore((state) => state.loadList)
	const {
		pendingTaskId,
		updateTaskStatus,
		updateTaskPriority,
		toggleTaskStatus,
		archiveListTask,
		deleteListTask,
	} = useTaskListController()
	const [busyAction, setBusyAction] = useState<string | null>(null)
	const [taskFilter, setTaskFilter] = useState<ProjectTaskFilter>('all')

	useEffect(() => {
		if (projectId) {
			void loadDetail(projectId)
			void loadTaskList({
				scope,
				viewKey: 'all',
				placement: {
					kind: 'project',
					projectId,
				},
			})
		}
		return () => {
			clearDetail()
		}
	}, [clearDetail, loadDetail, loadTaskList, projectId, scope])

	const visibleTasks = useMemo(
		() => taskList.items.filter((task) => task.archivedAt === null),
		[taskList.items],
	)
	const filteredTasks = useMemo(
		() =>
			taskFilter === 'all'
				? visibleTasks
				: visibleTasks.filter((task) => task.status === taskFilter),
		[taskFilter, visibleTasks],
	)
	const { selectedTaskIdSet, selectedCount, toggleTaskSelection, clearTaskSelection } =
		useTaskSelection(filteredTasks.map((task) => task.id))

	async function runAction(action: string, runner: () => Promise<unknown>) {
		setBusyAction(action)
		try {
			await runner()
		} finally {
			setBusyAction(null)
		}
	}

	const project = detail.item

	return (
		<MainCardLayout
			header={
				<MainCardHeader
					breadcrumb={<ProjectBreadcrumb projectName={project?.name ?? 'Project'} />}
					action={
						project ? (
							<div className='flex items-center gap-2'>
								<Button
									disabled={busyAction !== null}
									onClick={() => {
										void runAction(project.completedAt ? 'reopen' : 'complete', async () => {
											if (project.completedAt) {
												await reopenProject(project.id)
												return
											}
											await completeProject(project.id)
										})
									}}
									size='sm'
									variant='outline'
								>
									{project.completedAt ? '重开' : '完成'}
								</Button>
								<Button
									disabled={busyAction !== null}
									onClick={() => {
										void runAction('archive', async () => {
											await archiveProject(project.id)
											navigate(buildScopedSectionPath(scope, 'projects', spaceId))
										})
									}}
									size='sm'
									variant='outline'
								>
									归档
								</Button>
								<Button
									disabled={busyAction !== null}
									onClick={() => {
										void runAction('delete', async () => {
											await deleteProject(project.id)
											navigate(buildScopedSectionPath(scope, 'projects', spaceId))
										})
									}}
									size='sm'
									variant='outline'
								>
									删除
								</Button>
							</div>
						) : null
					}
				/>
			}
			toolbar={
				<MainCardToolbar
					onRefresh={() => {
						if (!projectId) {
							return
						}
						void loadDetail(projectId)
						void loadTaskList({
							scope,
							viewKey: 'all',
							placement: {
								kind: 'project',
								projectId,
							},
						})
					}}
					pills={PROJECT_TASK_FILTERS.map((filter) => ({
						label: filter === 'all' ? '所有任务' : formatTaskStatusLabel(filter),
						active: taskFilter === filter,
						onClick: () => setTaskFilter(filter),
					}))}
				/>
			}
		>
			<div className='flex min-h-0 flex-1 flex-col gap-3'>
				{!project ? (
					<EmptyPage>
						<Empty>
							<EmptyHeader>
								<EmptyMedia variant='icon'>
									<FolderIcon />
								</EmptyMedia>
								<EmptyTitle>当前 Project 不可见</EmptyTitle>
								<EmptyDescription>它可能已被归档、删除，或当前 Scope 已切走。</EmptyDescription>
							</EmptyHeader>
							<EmptyContent>
								<Button
									onClick={() => navigate(buildScopedSectionPath(scope, 'projects', spaceId))}
									type='button'
								>
									返回 Project Overview
								</Button>
							</EmptyContent>
						</Empty>
					</EmptyPage>
				) : (
					<>
						<ProjectTaskBoard
							activeTaskId={activeDrawerKind === 'task' ? activeDrawerId : null}
							onArchiveTask={archiveListTask}
							onDeleteTask={deleteListTask}
							onOpenTask={(taskId) => openDrawer('task', taskId)}
							onToggleTaskSelection={toggleTaskSelection}
							onToggleTaskStatus={toggleTaskStatus}
							onUpdateTaskPriority={updateTaskPriority}
							onUpdateTaskStatus={updateTaskStatus}
							pendingTaskId={pendingTaskId}
							projectId={project.id}
							selectedTaskIdSet={selectedTaskIdSet}
							tasks={filteredTasks}
						/>
						<TaskBulkActionBar
							action={
								<Button
									className='border-(--sf-color-border) bg-white text-(--sf-color-sidebar-action-foreground) hover:border-(--sf-color-border-strong) hover:bg-(--sf-color-bg-surface-muted) hover:text-(--sf-color-sidebar-action-foreground)'
									size='sm'
									variant='outline'
								>
									<CommandIcon className='size-3.5' />
									批量操作
								</Button>
							}
							onClear={clearTaskSelection}
							selectedCount={selectedCount}
						/>
					</>
				)}
			</div>
		</MainCardLayout>
	)
}

function ProjectBreadcrumb({ projectName }: { projectName: string }) {
	return (
		<Breadcrumb>
			<BreadcrumbList className='text-sm font-semibold leading-5'>
				<BreadcrumbItem>
					<span className='inline-flex items-center gap-1.5 text-foreground'>
						<BoxIcon aria-hidden className='size-4 shrink-0 text-(--sf-color-text-tertiary)' />
						项目总览
					</span>
				</BreadcrumbItem>
				<BreadcrumbSeparator />
				<BreadcrumbItem className='min-w-0'>
					<BreadcrumbPage className='truncate'>{projectName}</BreadcrumbPage>
				</BreadcrumbItem>
			</BreadcrumbList>
		</Breadcrumb>
	)
}

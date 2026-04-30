import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { buildScopedSectionPath, getScopeLabel } from '@/app/layouts/shell/config'
import {
	MainCardHeader,
	MainCardLayout,
	MainCardToolbar,
} from '@/app/layouts/main-card/MainCardLayout'
import { useDrawerStore } from '@/app/layouts/shell/model/useDrawerStore'
import { selectProjectDetail, useProjectStore } from '@/features/project/model/useProjectStore'
import { ProjectTaskBoard } from '@/features/project/ui/ProjectTaskBoard'
import { useScopeRoute } from '@/features/space/model/scopeRoute'
import { selectSpaces, useSpaceStore } from '@/features/space/model/useSpaceStore'
import { useTaskSelection } from '@/features/task/model/useTaskSelection'
import { selectTaskList, useTaskStore } from '@/features/task/model/useTaskStore'
import type { TaskListItem } from '@/shared/types'
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
import { StatusNotice } from '@/shared/ui/StatusNotice'
import { FolderIcon } from 'lucide-react'

export function ProjectPage() {
	const navigate = useNavigate()
	const { projectId = '' } = useParams()
	const { scope, spaceId } = useScopeRoute()
	const spaces = useSpaceStore(selectSpaces)
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
	const updateTask = useTaskStore((state) => state.updateTask)
	const archiveTask = useTaskStore((state) => state.archiveTask)
	const [busyAction, setBusyAction] = useState<string | null>(null)
	const [pendingTaskId, setPendingTaskId] = useState<string | null>(null)

	useEffect(() => {
		if (projectId) {
			void loadDetail(projectId)
			void loadTaskList({
				scope,
				projectId,
				viewKey: 'all',
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
	const { selectedTaskIdSet, toggleTaskSelection } = useTaskSelection(
		visibleTasks.map((task) => task.id),
	)

	async function runAction(action: string, runner: () => Promise<unknown>) {
		setBusyAction(action)
		try {
			await runner()
		} finally {
			setBusyAction(null)
		}
	}

	async function runTaskAction(taskId: string, runner: () => Promise<unknown>) {
		setPendingTaskId(taskId)
		try {
			await runner()
		} finally {
			setPendingTaskId(null)
		}
	}

	async function handleUpdateTaskStatus(task: TaskListItem, status: TaskListItem['status']) {
		await runTaskAction(task.id, () =>
			updateTask({
				taskId: task.id,
				status,
			}),
		)
	}

	async function handleUpdateTaskPriority(task: TaskListItem, priority: TaskListItem['priority']) {
		await runTaskAction(task.id, () =>
			updateTask({
				taskId: task.id,
				priority,
			}),
		)
	}

	async function handleToggleTaskStatus(task: TaskListItem) {
		await handleUpdateTaskStatus(
			task,
			task.status === 'done' || task.status === 'canceled' ? 'todo' : 'done',
		)
	}

	async function handleArchiveTask(task: TaskListItem) {
		await runTaskAction(task.id, () => archiveTask(task.id))
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
							projectId,
							viewKey: 'all',
						})
					}}
					pills={[
						{
							label: 'Project tasks',
							active: true,
						},
					]}
				/>
			}
		>
			<div className='flex min-h-0 flex-1 flex-col gap-3'>
				{detail.error ? (
					<StatusNotice role='alert' size='sm' variant='danger'>
						{detail.error}
					</StatusNotice>
				) : (
					<StatusNotice size='sm'>当前 Scope：{getScopeLabel(scope, spaces)}</StatusNotice>
				)}

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
					<ProjectTaskBoard
						activeTaskId={activeDrawerKind === 'task' ? activeDrawerId : null}
						onArchiveTask={handleArchiveTask}
						onOpenTask={(taskId) => openDrawer('task', taskId)}
						onToggleTaskSelection={toggleTaskSelection}
						onToggleTaskStatus={handleToggleTaskStatus}
						onUpdateTaskPriority={handleUpdateTaskPriority}
						onUpdateTaskStatus={handleUpdateTaskStatus}
						pendingTaskId={pendingTaskId}
						projectId={project.id}
						selectedTaskIdSet={selectedTaskIdSet}
						tasks={visibleTasks}
					/>
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
						<FolderIcon aria-hidden className='size-4 shrink-0 text-(--sf-color-text-tertiary)' />
						Projects
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

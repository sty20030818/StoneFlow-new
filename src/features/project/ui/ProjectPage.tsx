import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { EntityScene } from '@/app/layouts/entity-scene'
import { buildScopedSectionPath } from '@/app/layouts/shell/config'
import { useDialogStore } from '@/app/layouts/shell/model/useDialogStore'
import { useDrawerStore } from '@/app/layouts/shell/model/useDrawerStore'
import { selectProjectDetail, useProjectStore } from '@/features/project/model/useProjectStore'
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
	breadcrumbLeadForegroundClass,
	breadcrumbLeadIconClass,
} from '@/shared/ui/patterns/breadcrumb'
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
import { TASK_BULK_ACTION_BUTTON_CLASS } from '@/shared/ui/patterns/task-row'

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
	const openTaskCreateDialog = useDialogStore((state) => state.openTaskCreateDialog)
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
		<EntityScene
			board={{
				boardKind: 'task',
				boardConfig: {
					variant: 'project-detail',
					...(project
						? {
								emptyActionLabel: '创建任务',
								emptyDescription: '创建第一个任务来推进项目叭。',
								emptyTitle: '当前项目没有任务',
							}
						: {}),
					hideEmptySections: true,
					rowVariant: 'project',
					sectionVariant: 'project',
					statusOrder: ['doing', 'todo', 'waiting', 'done', 'canceled'],
				},
				boardData: {
					items: project ? filteredTasks : [],
					activeItemId: activeDrawerKind === 'task' ? activeDrawerId : null,
					pendingItemId: pendingTaskId,
					selectedTaskIdSet,
				},
				boardActions: {
					onArchiveTask: archiveListTask,
					onDeleteTask: deleteListTask,
					onEmptyAction: () => openTaskCreateDialog({ projectId }),
					onOpenTask: (taskId) => openDrawer('task', taskId),
					onToggleTaskSelection: toggleTaskSelection,
					onToggleTaskStatus: toggleTaskStatus,
					onUpdateTaskPriority: updateTaskPriority,
					onUpdateTaskStatus: updateTaskStatus,
				},
			}}
			breadcrumb={<ProjectBreadcrumb projectName={project?.name ?? '项目'} />}
			beforeBoard={
				!project ? (
					<EmptyPage>
						<Empty>
							<EmptyHeader>
								<EmptyMedia variant='icon'>
									<FolderIcon />
								</EmptyMedia>
								<EmptyTitle>当前项目不可见</EmptyTitle>
								<EmptyDescription>它可能已被归档、删除，或当前 Scope 已切走。</EmptyDescription>
							</EmptyHeader>
							<EmptyContent>
								<Button
									onClick={() => navigate(buildScopedSectionPath(scope, 'projects', spaceId))}
									type='button'
								>
									返回项目总览
								</Button>
							</EmptyContent>
						</Empty>
					</EmptyPage>
				) : null
			}
			bulkActions={
				project ? (
					<TaskBulkActionBar
						action={
							<Button className={TASK_BULK_ACTION_BUTTON_CLASS} size='sm' variant='outline'>
								<CommandIcon className='size-3.5' />
								批量操作
							</Button>
						}
						onClear={clearTaskSelection}
						selectedCount={selectedCount}
					/>
				) : null
			}
			headerActions={
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
			sceneVariant='project-detail'
			toolbarPills={PROJECT_TASK_FILTERS.map((filter) => ({
				label: filter === 'all' ? '所有任务' : formatTaskStatusLabel(filter),
				active: taskFilter === filter,
				onClick: () => setTaskFilter(filter),
			}))}
		/>
	)
}

function ProjectBreadcrumb({ projectName }: { projectName: string }) {
	return (
		<Breadcrumb>
			<BreadcrumbList className='text-sm leading-5'>
				<BreadcrumbItem>
					<span className={breadcrumbLeadForegroundClass}>
						<BoxIcon aria-hidden className={breadcrumbLeadIconClass} />
						项目总览
					</span>
				</BreadcrumbItem>
				<BreadcrumbSeparator />
				<BreadcrumbItem className='min-w-0'>
					<BreadcrumbPage className='truncate font-semibold'>{projectName}</BreadcrumbPage>
				</BreadcrumbItem>
			</BreadcrumbList>
		</Breadcrumb>
	)
}

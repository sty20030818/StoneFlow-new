import { useMemo, useState } from 'react'

import { EntityScene } from '@/app/layouts/entity-scene'
import { useNavigate, useParams } from '@/app/routing/tanstackCompat'
import { buildCanonicalSectionPath, useShellRoute } from '@/app/routing'
import { useDialogStore } from '@/app/layouts/shell/model/useDialogStore'
import { useEntityDetailController } from '@/features/entity-detail'
import { useDangerConfirm } from '@/features/danger-confirm'
import {
	useRegisterPageFilterController,
	useTaskPageFilterController,
} from '@/features/filter/model'
import {
	useArchiveProjectMutation,
	useCompleteProjectMutation,
	useDeleteProjectMutation,
	useProjectDetailData,
	useProjectOptions,
	useReopenProjectMutation,
} from '@/features/project/query'
import { useSpaces } from '@/features/space/query'
import { buildTaskCommandSelection, useRegisterCommandSelection } from '@/features/selection/model'
import { useTaskListController } from '@/features/task/model/useTaskListController'
import { formatTaskStatusLabel } from '@/features/task/model/taskStatus'
import { getTaskBoardVisualOrderIds } from '@/features/task/model/taskBoardOrder'
import { useTaskSelection } from '@/features/task/model/useTaskSelection'
import { BulkActionBar, BulkCommandMenuAction } from '@/features/bulk-action'
import { useRegisterTaskPreviewSource, useTaskPreviewController } from '@/features/task/detail'
import { useTaskListData } from '@/features/task/query'
import type { Scope, TaskStatus } from '@/shared/types'
import { Button } from '@/shared/ui/base/button'
import { AppBreadcrumb } from '@/shared/ui/AppBreadcrumb'
import { resolveBreadcrumb } from '@/shared/ui/breadcrumbResolver'
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyPage,
	EmptyTitle,
} from '@/shared/ui/base/empty'
import { FolderIcon } from 'lucide-react'

const PROJECT_TASK_FILTERS: Array<'all' | TaskStatus> = [
	'all',
	'doing',
	'todo',
	'waiting',
	'done',
	'canceled',
]

const ALL_SCOPE = { type: 'all' } as const

type ProjectPageProps = {
	scopeOverride?: Scope
}

export function ProjectPage({ scopeOverride }: ProjectPageProps = {}) {
	const navigate = useNavigate()
	const { projectId = '' } = useParams()
	const shellRoute = useShellRoute()
	const scope = scopeOverride ?? shellRoute.scope ?? ALL_SCOPE
	const spaceId = scope.type === 'space' ? scope.spaceId : null
	const { requestDangerConfirm } = useDangerConfirm()
	const openTaskCreateDialog = useDialogStore((state) => state.openTaskCreateDialog)
	const entityDetailController = useEntityDetailController()
	const activeDetail = entityDetailController.activeDetail
	const openEntityDrawer = entityDetailController.openDrawer
	const taskPreviewController = useTaskPreviewController()
	const detail = useProjectDetailData(projectId)
	const projectOptions = useProjectOptions(scope)
	const { spaces } = useSpaces()
	const completeProject = useCompleteProjectMutation()
	const reopenProject = useReopenProjectMutation()
	const archiveProject = useArchiveProjectMutation()
	const deleteProject = useDeleteProjectMutation()
	const listInput = useMemo(
		() => ({
			scope,
			viewKey: 'all' as const,
			placement: {
				kind: 'project' as const,
				projectId,
			},
		}),
		[projectId, scope],
	)
	const taskList = useTaskListData(listInput)
	const taskBoardStatus = taskList.status
	const taskSourceItems = taskList.items
	const {
		pendingTaskId,
		updateTaskStatus,
		updateTaskPriority,
		updateTaskDueDate,
		updateTaskScheduledAt,
		updateTaskReminderAt,
		updateTaskPlacement,
		toggleTaskStatus,
		archiveListTask,
		deleteListTask,
	} = useTaskListController()
	const [busyAction, setBusyAction] = useState<string | null>(null)

	const visibleTasks = useMemo(
		() => taskSourceItems.filter((task) => task.archivedAt === null),
		[taskSourceItems],
	)
	const { controller, filteredTasks } = useTaskPageFilterController({
		tasks: visibleTasks,
		capabilities: {
			supportsPriority: true,
			supportsStatus: true,
			supportsDate: true,
			supportsProject: false,
			supportsToggleCompleted: true,
			supportsClearAll: true,
		},
	})
	useRegisterPageFilterController(controller)
	const project = detail.projectId === projectId ? detail.item : null
	const isProjectLoading = detail.status === 'loading' || detail.projectId !== projectId
	const breadcrumbItems = useMemo(
		() =>
			resolveBreadcrumb({
				route: shellRoute,
				projectDetail: project
					? {
							id: project.id,
							name: project.name,
						}
					: projectId
						? {
								id: projectId,
								name: '',
							}
						: null,
			}),
		[project, projectId, shellRoute],
	)
	const projectMoveOptions = useMemo(
		() =>
			project
				? projectOptions.filter((option) => option.spaceId === project.spaceId)
				: projectOptions,
		[project, projectOptions],
	)
	const taskSelectionOrderIds = useMemo(
		() => getTaskBoardVisualOrderIds(filteredTasks),
		[filteredTasks],
	)
	const {
		selectedTaskIdSet,
		selectionSnapshot,
		selectedCount,
		focusedTaskId,
		toggleTaskSelection,
		clearTaskSelection,
		setFocusedTaskId,
		moveFocus,
		selectTaskIds,
	} = useTaskSelection(taskSelectionOrderIds)
	const commandSelection = useMemo(
		() =>
			buildTaskCommandSelection({
				selectedIds: selectionSnapshot.ids,
				tasks: filteredTasks,
				fallbackSubtitle: project?.name ?? '当前项目',
				focusedTaskId,
				clearSelection: clearTaskSelection,
			}),
		[clearTaskSelection, filteredTasks, focusedTaskId, project?.name, selectionSnapshot.ids],
	)
	useRegisterCommandSelection(commandSelection)
	useRegisterTaskPreviewSource({
		tasks: filteredTasks,
		focusedTaskId,
		activeTaskId: activeDetail?.kind === 'task' ? activeDetail.id : null,
	})

	async function runAction(action: string, runner: () => Promise<unknown>) {
		setBusyAction(action)
		try {
			await runner()
		} finally {
			setBusyAction(null)
		}
	}

	return (
		<EntityScene
			board={{
				boardKind: 'task',
				boardConfig: {
					variant: 'project-detail',
					...(project
						? {
								emptyActionLabel: '创建任务',
								emptyDescription:
									'这个项目里还没有任务，所以现在还看不到进展内容。点「创建任务」先放进第一项，项目就能开始往前推进了。',
								emptyTitle: '当前项目没有任务',
							}
						: {}),
					hideEmptySections: true,
				},
				boardData: {
					items: project ? filteredTasks : [],
					status: project ? taskBoardStatus : isProjectLoading ? 'loading' : 'ready',
					activeItemId: activeDetail?.kind === 'task' ? activeDetail.id : null,
					pendingItemId: pendingTaskId,
					selectedTaskIdSet,
					focusedTaskId,
				},
				boardActions: {
					onArchiveTask: archiveListTask,
					onClearTaskSelection: clearTaskSelection,
					onDeleteTask: deleteListTask,
					onEmptyAction: () => openTaskCreateDialog({ projectId }),
					onOpenTask: (taskId) => {
						taskPreviewController.closePreview()
						openEntityDrawer({ kind: 'task', id: taskId })
					},
					onPeekTask: (taskId, source) => {
						if (activeDetail?.kind === 'task') {
							return
						}
						taskPreviewController.openPreview(taskId, source)
					},
					onSelectAllTasks: selectTaskIds,
					onSetFocusedTask: setFocusedTaskId,
					onMoveTaskFocus: moveFocus,
					onSelectPlacement: (task, target) => void updateTaskPlacement(task, target),
					onToggleTaskSelection: toggleTaskSelection,
					onToggleTaskStatus: toggleTaskStatus,
					onUpdateTaskDueDate: updateTaskDueDate,
					onUpdateTaskScheduledAt: updateTaskScheduledAt,
					onUpdateTaskReminderAt: updateTaskReminderAt,
					onUpdateTaskPriority: updateTaskPriority,
					onUpdateTaskStatus: updateTaskStatus,
					projectOptions: projectMoveOptions,
					spaces,
				},
			}}
			breadcrumb={<AppBreadcrumb items={breadcrumbItems} />}
			beforeBoard={
				!project && !isProjectLoading ? (
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
									onClick={() => navigate(buildCanonicalSectionPath(scope, 'projects', spaceId))}
									type='button'
								>
									返回项目总览
								</Button>
							</EmptyContent>
						</Empty>
					</EmptyPage>
				) : null
			}
			bulkBar={
				project ? (
					<BulkActionBar
						action={<BulkCommandMenuAction />}
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
										await reopenProject.mutateAsync(project.id)
										return
									}
									await completeProject.mutateAsync(project.id)
								})
							}}
							size='sm'
							variant='outline'
						>
							{project.completedAt ? '重开' : '完成'}
						</Button>
						<Button
							disabled={busyAction !== null}
							onClick={async () => {
								const confirmed = await requestDangerConfirm({
									intent: 'archive',
									entityType: 'project',
									count: 1,
									entityLabel: project.name,
								})
								if (!confirmed) {
									return
								}
								void runAction('archive', async () => {
									await archiveProject.mutateAsync(project.id)
									navigate(buildCanonicalSectionPath(scope, 'projects', spaceId))
								})
							}}
							size='sm'
							variant='outline'
						>
							归档
						</Button>
						<Button
							disabled={busyAction !== null}
							onClick={async () => {
								const confirmed = await requestDangerConfirm({
									intent: 'trash',
									entityType: 'project',
									count: 1,
									entityLabel: project.name,
								})
								if (!confirmed) {
									return
								}
								void runAction('delete', async () => {
									await deleteProject.mutateAsync(project.id)
									navigate(buildCanonicalSectionPath(scope, 'projects', spaceId))
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
				void detail.refetch()
				void taskList.refetch()
			}}
			sceneVariant='project-detail'
			toolbarPills={PROJECT_TASK_FILTERS.map((filter) => ({
				label: filter === 'all' ? '所有任务' : formatTaskStatusLabel(filter),
				active:
					filter === 'all'
						? controller.state.statusValues.length === 0
						: controller.state.statusValues.length === 1 &&
							controller.state.statusValues[0] === filter,
				onClick: () =>
					controller.actions.applyFilter({
						kind: 'status',
						values: filter === 'all' ? [] : [filter],
					}),
			}))}
		/>
	)
}

import { useMemo, useState } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'

import { EntityScene } from '@/layout/entity-scene'
import { useCurrentShellRoute } from '@/layout/model/ShellRouteContext'
import { openSection } from '@/app/navigation/intents'
import { resolveShellRouteScope } from '@/app/navigation/scope'
import { useDialogStore } from '@/layout/model/useDialogStore'
import {
	applyTaskDisplayOptionsToTasks,
	createTaskDisplayApplyContext,
} from '@/features/display-options/adapters/task'
import { useTaskDisplayOptions } from '@/features/display-options/model'
import { DisplayOptionsButton } from '@/features/display-options/components'
import { useEntityDetailController } from '@/features/entity-detail'
import { useDangerConfirm } from '@/features/danger-confirm'
import { useRegisterPageFilterController, useTaskPageFilterController } from '@/features/filter'
import {
	useArchiveProjectMutation,
	useCompleteProjectMutation,
	useDeleteProjectMutation,
	useProjectOptions,
	useReopenProjectMutation,
	useSuspenseProjectDetailQuery,
} from '@/features/project/hooks'
import { useSpaces } from '@/features/space'
import { buildTaskCommandSelection, useRegisterCommandSelection } from '@/features/selection'
import { useTaskListController } from '@/features/task'
import { formatTaskStatusLabel } from '@/features/task'
import { useTaskSelection } from '@/features/task'
import { BulkActionBar, BulkCommandMenuAction } from '@/features/bulk-action'
import { useRegisterTaskPreviewSource, useTaskPreviewController } from '@/features/task'
import { useTaskListData } from '@/features/task'
import type { Scope, TaskStatus } from '@/shared/types'
import { Button } from '@/shared/components/base/button'
import { AppBreadcrumb } from '@/shared/components/AppBreadcrumb'
import { resolveBreadcrumb } from '@/app/navigation/breadcrumbResolver'
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyPage,
	EmptyTitle,
} from '@/shared/components/base/empty'
import { FolderIcon } from 'lucide-react'

const PROJECT_TASK_FILTERS: Array<'all' | TaskStatus> = [
	'all',
	'doing',
	'todo',
	'waiting',
	'done',
	'canceled',
]

const PROJECT_DETAIL_DISPLAY_PAGE_KEY = 'task:project-detail'

type ProjectPageProps = {
	scopeOverride?: Scope
}

export function ProjectPage({ scopeOverride }: ProjectPageProps = {}) {
	const navigate = useNavigate({ from: '/' })
	const { projectId = '' } = useParams({ strict: false }) as { projectId?: string }
	const shellRoute = useCurrentShellRoute()
	const scope = scopeOverride ?? resolveShellRouteScope(shellRoute)
	const spaceId = scope.type === 'space' ? scope.spaceId : null
	const { requestDangerConfirm } = useDangerConfirm()
	const openTaskCreateDialog = useDialogStore((state) => state.openTaskCreateDialog)
	const entityDetailController = useEntityDetailController()
	const activeDetail = entityDetailController.activeDetail
	const openEntityDrawer = entityDetailController.openDrawer
	const taskPreviewController = useTaskPreviewController()
	const { data: project } = useSuspenseProjectDetailQuery(projectId)
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
	const display = useTaskDisplayOptions(PROJECT_DETAIL_DISPLAY_PAGE_KEY)
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
	const displayResult = useMemo(
		() =>
			applyTaskDisplayOptionsToTasks({
				items: filteredTasks,
				options: display.options,
				context: createTaskDisplayApplyContext(PROJECT_DETAIL_DISPLAY_PAGE_KEY),
			}),
		[display.options, filteredTasks],
	)
	const taskSelectionOrderIds = displayResult.selectionOrderIds
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
					customSections: displayResult.boardPatch.customSections,
					...(project
						? {
								emptyActionLabel: '创建任务',
								emptyDescription:
									'这个项目里还没有任务，所以现在还看不到进展内容。点「创建任务」先放进第一项，项目就能开始往前推进了。',
								emptyTitle: '当前项目没有任务',
							}
						: {}),
					hideEmptySections: displayResult.boardPatch.hideEmptySections ?? true,
					statusOrder: displayResult.boardPatch.statusOrder,
					visibleProperties: displayResult.visibleProperties,
				},
				boardData: {
					items: project ? displayResult.orderedItems : [],
					status: project ? taskBoardStatus : 'ready',
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
									onClick={() =>
										void navigate({ to: openSection(scope, 'projects', spaceId) as never })
									}
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
									void navigate({ to: openSection(scope, 'projects', spaceId) as never })
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
									void navigate({ to: openSection(scope, 'projects', spaceId) as never })
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
			sceneVariant='project-detail'
			toolbarDisplayAction={<DisplayOptionsButton pageKey={PROJECT_DETAIL_DISPLAY_PAGE_KEY} />}
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

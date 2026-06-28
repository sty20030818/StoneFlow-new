import { useMemo } from 'react'

import { EntityScene } from '@/app/layouts/entity-scene'
import { MainCard } from '@/app/layouts/main-card/MainCardLayout'
import { useCurrentShellRoute } from '@/app/layouts/shell/model/ShellRouteContext'
import { resolveShellRouteScope } from '@/app/navigation/scope'
import { applyTaskDisplayOptionsToTasks, createTaskDisplayApplyContext } from '@/features/display-options/adapters/task'
import { DisplayOptionsButton } from '@/features/display-options/ui'
import { useEntityDetailController } from '@/features/entity-detail'
import { useDialogStore } from '@/app/layouts/shell/model/useDialogStore'
import { useTaskDisplayOptions } from '@/features/display-options/model'
import {
	useRegisterPageFilterController,
	useTaskPageFilterController,
} from '@/features/filter/model'
import { useProjectOptions } from '@/features/project/query'
import { buildTaskCommandSelection, useRegisterCommandSelection } from '@/features/selection/model'
import { useTaskSelection } from '@/features/task/model/useTaskSelection'
import { useTaskListController } from '@/features/task/model/useTaskListController'
import { BulkActionBar, BulkCommandMenuAction } from '@/features/bulk-action'
import { formatTaskStatusLabel } from '@/features/task/model/taskStatus'
import { useTaskListData } from '@/features/task/query'
import { useRegisterTaskPreviewSource, useTaskPreviewController } from '@/features/task/detail'
import { useSpaces } from '@/features/space/query'
import type { TaskStatus } from '@/shared/types'
import { AppBreadcrumb } from '@/shared/ui/AppBreadcrumb'
import { resolveBreadcrumb } from '@/shared/ui/breadcrumbResolver'
import { PlusIcon } from 'lucide-react'

const TASK_FILTERS: Array<'all' | 'noProject' | TaskStatus> = [
	'all',
	'noProject',
	'doing',
	'todo',
	'waiting',
	'done',
	'canceled',
]

const ALL_TASKS_DISPLAY_PAGE_KEY = 'task:all'

export function AllTasksPage() {
	const shellRoute = useCurrentShellRoute()
	const scope = resolveShellRouteScope(shellRoute)
	const openTaskCreateDialog = useDialogStore((state) => state.openTaskCreateDialog)
	const entityDetailController = useEntityDetailController()
	const activeDetail = entityDetailController.activeDetail
	const openEntityDrawer = entityDetailController.openDrawer
	const taskPreviewController = useTaskPreviewController()
	const listInput = useMemo(
		() => ({
			scope,
			viewKey: 'all' as const,
			placement: { kind: 'all' as const },
		}),
		[scope],
	)
	const taskList = useTaskListData(listInput)
	const taskBoardStatus = taskList.status
	const taskSourceItems = taskBoardStatus === 'loading' ? [] : taskList.items
	const {
		pendingTaskId,
		updateTaskStatus,
		updateTaskPriority,
		updateTaskDueDate,
		updateTaskScheduledAt,
		updateTaskReminderAt,
		toggleTaskStatus,
		archiveListTask,
		deleteListTask,
		updateTaskPlacement,
	} = useTaskListController()
	const breadcrumbItems = useMemo(() => resolveBreadcrumb({ route: shellRoute }), [shellRoute])
	const projectOptions = useProjectOptions(scope)
	const { spaces } = useSpaces()
	const display = useTaskDisplayOptions(ALL_TASKS_DISPLAY_PAGE_KEY)
	const { controller, filteredTasks } = useTaskPageFilterController({
		tasks: taskSourceItems,
		projects: projectOptions,
		capabilities: {
			supportsPriority: true,
			supportsStatus: true,
			supportsDate: true,
			supportsProject: true,
			supportsToggleCompleted: true,
			supportsClearAll: true,
		},
	})
	useRegisterPageFilterController(controller)
	const displayResult = useMemo(
		() =>
			applyTaskDisplayOptionsToTasks({
				items: filteredTasks,
				options: display.options,
				context: createTaskDisplayApplyContext(ALL_TASKS_DISPLAY_PAGE_KEY),
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
				fallbackSubtitle: (task) => (task.inboxAt ? '收件箱' : '独立事项'),
				focusedTaskId,
				clearSelection: clearTaskSelection,
			}),
		[clearTaskSelection, filteredTasks, focusedTaskId, selectionSnapshot.ids],
	)
	useRegisterCommandSelection(commandSelection)
	useRegisterTaskPreviewSource({
		tasks: filteredTasks,
		focusedTaskId,
		activeTaskId: activeDetail?.kind === 'task' ? activeDetail.id : null,
	})

	return (
		<EntityScene
			board={{
				boardKind: 'task',
				boardConfig: {
					variant: 'tasks',
					customSections: displayResult.boardPatch.customSections,
					emptyActionLabel: '创建任务',
					emptyDescription:
						'这里本来会显示符合当前条件的任务，不过现在还是空的。点「创建任务」先记下一项，后面再慢慢整理也来得及。',
					emptyTitle: '当前没有任务',
					hideEmptySections: displayResult.boardPatch.hideEmptySections ?? true,
					statusOrder: displayResult.boardPatch.statusOrder,
				},
				boardData: {
					items: displayResult.orderedItems,
					status: taskBoardStatus,
					activeItemId: activeDetail?.kind === 'task' ? activeDetail.id : null,
					pendingItemId: pendingTaskId,
					selectedTaskIdSet,
					focusedTaskId,
				},
				boardActions: {
					onArchiveTask: archiveListTask,
					onClearTaskSelection: clearTaskSelection,
					onDeleteTask: deleteListTask,
					onEmptyAction: () => openTaskCreateDialog({ status: 'todo' }),
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
					projectOptions,
					spaces,
				},
			}}
			breadcrumb={<AppBreadcrumb items={breadcrumbItems} />}
			bulkBar={
				<BulkActionBar
					action={<BulkCommandMenuAction />}
					onClear={clearTaskSelection}
					selectedCount={selectedCount}
				/>
			}
			headerActions={
				<MainCard.GhostAction
					aria-label='创建任务'
					onClick={() => openTaskCreateDialog({ status: 'todo' })}
				>
					<PlusIcon />
				</MainCard.GhostAction>
			}
			onRefresh={() => {
				void taskList.refetch()
			}}
			sceneVariant='tasks'
			toolbarDisplayAction={<DisplayOptionsButton pageKey={ALL_TASKS_DISPLAY_PAGE_KEY} />}
			toolbarPills={TASK_FILTERS.map((filter) => ({
				label:
					filter === 'all'
						? '所有任务'
						: filter === 'noProject'
							? '独立事项'
							: formatTaskStatusLabel(filter),
				active:
					filter === 'all'
						? controller.state.statusValues.length === 0 && !controller.state.projectlessOnly
						: filter === 'noProject'
							? controller.state.projectlessOnly
							: controller.state.statusValues.length === 1 &&
								controller.state.statusValues[0] === filter &&
								!controller.state.projectlessOnly,
				onClick: () => {
					if (filter === 'all') {
						controller.actions.applyFilter({ kind: 'status', values: [] })
						controller.actions.applyFilter({ kind: 'projectlessOnly', enabled: false })
						return
					}

					if (filter === 'noProject') {
						controller.actions.applyFilter({ kind: 'status', values: [] })
						controller.actions.applyFilter({ kind: 'projectlessOnly', enabled: true })
						return
					}

					controller.actions.applyFilter({ kind: 'projectlessOnly', enabled: false })
					controller.actions.applyFilter({ kind: 'status', values: [filter] })
				},
			}))}
		/>
	)
}

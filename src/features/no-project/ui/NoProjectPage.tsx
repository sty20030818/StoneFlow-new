import { useEffect, useMemo } from 'react'

import { EntityScene } from '@/app/layouts/entity-scene'
import { MainCard } from '@/app/layouts/main-card/MainCardLayout'
import { useShellRoute } from '@/app/routing'
import { useDialogStore } from '@/app/layouts/shell/model/useDialogStore'
import { useEntityDetailController } from '@/features/entity-detail'
import {
	useRegisterPageFilterController,
	useTaskPageFilterController,
} from '@/features/filter/model'
import { buildTaskCommandSelection, useRegisterCommandSelection } from '@/features/selection/model'
import { selectProjectOptions, useProjectStore } from '@/features/project/model/useProjectStore'
import { selectSpaces, useSpaceStore } from '@/features/space/model/useSpaceStore'
import { getTaskBoardVisualOrderIds } from '@/features/task/model/taskBoardOrder'
import { formatTaskStatusLabel } from '@/features/task/model/taskStatus'
import { useTaskListController } from '@/features/task/model/useTaskListController'
import { useTaskSelection } from '@/features/task/model/useTaskSelection'
import {
	isTaskListInputMatch,
	selectTaskList,
	useTaskStore,
} from '@/features/task/model/useTaskStore'
import { useRegisterTaskPreviewSource, useTaskPreviewController } from '@/features/task/detail'
import { BulkActionBar, BulkCommandMenuAction } from '@/features/bulk-action'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbList,
	BreadcrumbPage,
} from '@/shared/ui/base/breadcrumb'
import { breadcrumbLeadClass, breadcrumbLeadIconClass } from '@/shared/ui/patterns/breadcrumb'
import { Layers3Icon, PlusIcon, TargetIcon } from 'lucide-react'
import type { TaskStatus } from '@/shared/types'

const ALL_SCOPE = { type: 'all' } as const

const NO_PROJECT_FILTERS: Array<'all' | TaskStatus> = [
	'all',
	'doing',
	'todo',
	'waiting',
	'done',
	'canceled',
]

export function NoProjectPage() {
	const shellRoute = useShellRoute()
	const scope = shellRoute.scope ?? ALL_SCOPE
	const taskList = useTaskStore(selectTaskList)
	const loadList = useTaskStore((state) => state.loadList)
	const listInput = useMemo(
		() => ({
			scope,
			viewKey: 'all' as const,
			placement: { kind: 'noProject' as const },
		}),
		[scope],
	)
	const taskBoardStatus = isTaskListInputMatch(taskList.input, listInput)
		? taskList.status
		: 'loading'
	const taskSourceItems = taskBoardStatus === 'loading' ? [] : taskList.items
	const projectOptions = useProjectStore(selectProjectOptions)
	const spaces = useSpaceStore(selectSpaces)
	const entityDetailController = useEntityDetailController()
	const activeDetail = entityDetailController.activeDetail
	const openEntityDrawer = entityDetailController.openDrawer
	const taskPreviewController = useTaskPreviewController()
	const openTaskCreateDialog = useDialogStore((state) => state.openTaskCreateDialog)
	const {
		pendingTaskId,
		updateTaskPriority,
		updateTaskStatus,
		updateTaskDueDate,
		updateTaskScheduledAt,
		updateTaskReminderAt,
		toggleTaskStatus,
		archiveListTask,
		deleteListTask,
		updateTaskPlacement,
	} = useTaskListController()
	const { controller, filteredTasks } = useTaskPageFilterController({
		tasks: taskSourceItems,
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
				fallbackSubtitle: '独立事项',
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

	useEffect(() => {
		void loadList(listInput)
	}, [loadList, listInput])

	return (
		<EntityScene
			afterBoard={
				<div className='mt-auto flex items-center gap-2 px-1 text-[12px] text-sf-text-tertiary'>
					<Layers3Icon className='size-3.5' />
					这些任务已经离开 Inbox，但还没有归属到任何 Project。
				</div>
			}
			board={{
				boardKind: 'task',
				boardConfig: {
					variant: 'no-project',
					emptyActionLabel: '创建任务',
					emptyDescription: '这里展示已经离开 Inbox、但仍不属于任何 Project 的任务。',
					emptyTitle: '当前没有独立事项任务',
					hideEmptySections: true,
				},
				boardData: {
					items: filteredTasks,
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
					onEmptyAction: () => openTaskCreateDialog({ placement: 'noProject' }),
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
			breadcrumb={<NoProjectBreadcrumb />}
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
					onClick={() => openTaskCreateDialog({ placement: 'noProject' })}
				>
					<PlusIcon />
				</MainCard.GhostAction>
			}
			onRefresh={() => {
				void loadList(listInput)
			}}
			sceneVariant='no-project'
			toolbarPills={NO_PROJECT_FILTERS.map((filter) => ({
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

function NoProjectBreadcrumb() {
	return (
		<Breadcrumb>
			<BreadcrumbList className='text-sm font-semibold leading-5'>
				<BreadcrumbItem>
					<BreadcrumbPage className={breadcrumbLeadClass}>
						<TargetIcon aria-hidden className={breadcrumbLeadIconClass} />
						独立事项
					</BreadcrumbPage>
				</BreadcrumbItem>
			</BreadcrumbList>
		</Breadcrumb>
	)
}

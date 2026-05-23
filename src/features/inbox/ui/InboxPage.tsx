import { useEffect, useMemo } from 'react'

import { EntityScene } from '@/app/layouts/entity-scene'
import { MainCard } from '@/app/layouts/main-card/MainCardLayout'
import {
	useRegisterPageFilterController,
	useTaskPageFilterController,
} from '@/features/filter/model'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbList,
	BreadcrumbPage,
} from '@/shared/ui/base/breadcrumb'
import { breadcrumbLeadClass, breadcrumbLeadIconClass } from '@/shared/ui/patterns/breadcrumb'
import { useDialogStore } from '@/app/layouts/shell/model/useDialogStore'
import { useEntityDetailController } from '@/features/entity-detail'
import { selectProjectOptions, useProjectStore } from '@/features/project/model/useProjectStore'
import { buildTaskCommandSelection, useRegisterCommandSelection } from '@/features/selection/model'
import { useScopeRoute } from '@/features/space/model/scopeRoute'
import { useTaskListController } from '@/features/task/model/useTaskListController'
import {
	ACTIVE_TASK_BOARD_STATUS_ORDER,
	getTaskBoardVisualOrderIds,
} from '@/features/task/model/taskBoardOrder'
import { useTaskSelection } from '@/features/task/model/useTaskSelection'
import { BulkActionBar, BulkCommandMenuAction } from '@/features/bulk-action'
import { selectTaskList, useTaskStore } from '@/features/task/model/useTaskStore'
import {
	useRegisterTaskPreviewSource,
	useTaskPreviewController,
} from '@/features/task/detail'
import { InboxIcon, PlusIcon } from 'lucide-react'

export function InboxPage() {
	const { scope, spaceId } = useScopeRoute()
	const taskList = useTaskStore(selectTaskList)
	const loadList = useTaskStore((state) => state.loadList)
	const projectOptions = useProjectStore(selectProjectOptions)
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
		leaveListTaskToProject,
		leaveListTaskAsNoProject,
	} = useTaskListController()

	const inboxProjectOptions = useMemo(
		() =>
			spaceId ? projectOptions.filter((project) => project.spaceId === spaceId) : projectOptions,
		[projectOptions, spaceId],
	)
	const { controller, filteredTasks } = useTaskPageFilterController({
		tasks: taskList.items,
		projects: inboxProjectOptions,
		capabilities: {
			supportsPriority: true,
			supportsStatus: true,
			supportsDate: true,
			supportsProject: true,
			supportsToggleCompleted: true,
			supportsClearAll: true,
		},
		initialShowCompleted: false,
	})
	useRegisterPageFilterController(controller)
	const taskSelectionOrderIds = useMemo(
		() =>
			getTaskBoardVisualOrderIds(filteredTasks, {
				statusOrder: ACTIVE_TASK_BOARD_STATUS_ORDER,
			}),
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
				fallbackSubtitle: 'Inbox',
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
		void loadList({
			scope,
			viewKey: 'all',
			placement: { kind: 'inbox' },
		})
	}, [loadList, scope])

	return (
		<EntityScene
			board={{
				boardKind: 'task',
				boardConfig: {
					variant: 'inbox',
					emptyActionLabel: '创建任务',
					emptyDescription: '新捕获的任务会先进入 Inbox，补齐项目后再离开。',
					emptyTitle: '当前 Inbox 已清空',
					hideEmptySections: true,
					statusOrder: ACTIVE_TASK_BOARD_STATUS_ORDER,
				},
				boardData: {
					items: filteredTasks,
					activeItemId: activeDetail?.kind === 'task' ? activeDetail.id : null,
					pendingItemId: pendingTaskId,
					selectedTaskIdSet,
					focusedTaskId,
				},
				boardActions: {
					onArchiveTask: archiveListTask,
					onClearTaskSelection: clearTaskSelection,
					onDeleteTask: deleteListTask,
					onEmptyAction: () => openTaskCreateDialog(),
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
					onToggleTaskSelection: toggleTaskSelection,
					onToggleTaskStatus: toggleTaskStatus,
					onUpdateTaskDueDate: updateTaskDueDate,
					onUpdateTaskScheduledAt: updateTaskScheduledAt,
					onUpdateTaskReminderAt: updateTaskReminderAt,
					onUpdateTaskPriority: updateTaskPriority,
					onUpdateTaskStatus: updateTaskStatus,
					onSelectProject: (task, projectId) => void leaveListTaskToProject(task, projectId),
					onSelectNoProject: (task) => void leaveListTaskAsNoProject(task),
					projectOptions: inboxProjectOptions,
				},
			}}
			breadcrumb={<InboxBreadcrumb />}
			bulkBar={
				<BulkActionBar
					action={<BulkCommandMenuAction />}
					onClear={clearTaskSelection}
					selectedCount={selectedCount}
				/>
			}
			headerActions={
				<MainCard.GhostAction aria-label='创建任务' onClick={() => openTaskCreateDialog()}>
					<PlusIcon />
				</MainCard.GhostAction>
			}
			onRefresh={() => {
				void loadList({
					scope,
					viewKey: 'all',
					placement: { kind: 'inbox' },
				})
			}}
			sceneVariant='inbox'
			toolbarPills={[
				{
					label: `待整理 ${filteredTasks.length}`,
					active: true,
				},
			]}
		/>
	)
}

function InboxBreadcrumb() {
	return (
		<Breadcrumb>
			<BreadcrumbList className='text-sm font-semibold leading-5'>
				<BreadcrumbItem>
					<BreadcrumbPage className={breadcrumbLeadClass}>
						<InboxIcon aria-hidden className={breadcrumbLeadIconClass} />
						收件箱
					</BreadcrumbPage>
				</BreadcrumbItem>
			</BreadcrumbList>
		</Breadcrumb>
	)
}

import { useMemo } from 'react'

import { EntityScene } from '@/app/layouts/entity-scene'
import { MainCard } from '@/app/layouts/main-card/MainCardLayout'
import { useCurrentShellRoute } from '@/app/layouts/shell/model/ShellRouteContext'
import { resolveShellRouteScope } from '@/app/navigation/scope'
import {
	applyTaskDisplayOptionsToTasks,
	createTaskDisplayApplyContext,
} from '@/features/display-options/adapters/task'
import { useTaskDisplayOptions } from '@/features/display-options/model'
import { DisplayOptionsButton } from '@/features/display-options/ui'
import {
	useRegisterPageFilterController,
	useTaskPageFilterController,
} from '@/features/filter/model'
import { useDialogStore } from '@/app/layouts/shell/model/useDialogStore'
import { useEntityDetailController } from '@/features/entity-detail'
import { useProjectOptions } from '@/features/project/query'
import { useSpaces } from '@/features/space/query'
import { buildTaskCommandSelection, useRegisterCommandSelection } from '@/features/selection/model'
import { useTaskListController } from '@/features/task/model/useTaskListController'
import { useTaskSelection } from '@/features/task/model/useTaskSelection'
import { BulkActionBar, BulkCommandMenuAction } from '@/features/bulk-action'
import { useTaskListData } from '@/features/task/query'
import { useRegisterTaskPreviewSource, useTaskPreviewController } from '@/features/task/detail'
import { AppBreadcrumb } from '@/shared/ui/AppBreadcrumb'
import { resolveBreadcrumb } from '@/app/navigation/breadcrumbResolver'
import { PlusIcon } from 'lucide-react'

const INBOX_DISPLAY_PAGE_KEY = 'task:inbox'

export function InboxPage() {
	const shellRoute = useCurrentShellRoute()
	const scope = resolveShellRouteScope(shellRoute)
	const spaceId = shellRoute.spaceId
	const listInput = useMemo(
		() => ({
			scope,
			viewKey: 'all' as const,
			placement: { kind: 'inbox' as const },
		}),
		[scope],
	)
	const taskList = useTaskListData(listInput)
	const taskBoardStatus = taskList.status
	const taskSourceItems = taskBoardStatus === 'loading' ? [] : taskList.items
	const projectOptions = useProjectOptions(scope)
	const { spaces } = useSpaces()
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

	const inboxProjectOptions = useMemo(
		() =>
			spaceId ? projectOptions.filter((project) => project.spaceId === spaceId) : projectOptions,
		[projectOptions, spaceId],
	)
	const breadcrumbItems = useMemo(() => resolveBreadcrumb({ route: shellRoute }), [shellRoute])
	const display = useTaskDisplayOptions(INBOX_DISPLAY_PAGE_KEY)
	const { controller, filteredTasks } = useTaskPageFilterController({
		tasks: taskSourceItems,
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
	const displayResult = useMemo(
		() =>
			applyTaskDisplayOptionsToTasks({
				items: filteredTasks,
				options: display.options,
				context: createTaskDisplayApplyContext(INBOX_DISPLAY_PAGE_KEY),
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
				fallbackSubtitle: '收件箱',
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
					variant: 'inbox',
					customSections: displayResult.boardPatch.customSections,
					emptyActionLabel: '创建任务',
					emptyDescription:
						'新捕获的任务都会先来到这里，现在这一批已经整理完了。点「创建任务」也可以先记一条，之后再决定把它放去哪里。',
					emptyTitle: 'Inbox 已清空',
					hideEmptySections: displayResult.boardPatch.hideEmptySections ?? true,
					statusOrder: displayResult.boardPatch.statusOrder,
					visibleProperties: displayResult.visibleProperties,
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
					onSelectPlacement: (task, target) => void updateTaskPlacement(task, target),
					projectOptions: inboxProjectOptions,
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
				<MainCard.GhostAction aria-label='创建任务' onClick={() => openTaskCreateDialog()}>
					<PlusIcon />
				</MainCard.GhostAction>
			}
			sceneVariant='inbox'
			toolbarDisplayAction={<DisplayOptionsButton pageKey={INBOX_DISPLAY_PAGE_KEY} />}
			toolbarPills={[
				{
					label: `待整理 ${filteredTasks.length}`,
					active: true,
				},
			]}
		/>
	)
}

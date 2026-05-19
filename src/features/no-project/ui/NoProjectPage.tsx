import { useEffect, useMemo } from 'react'

import { EntityScene } from '@/app/layouts/entity-scene'
import { MainCard } from '@/app/layouts/main-card/MainCardLayout'
import { useDialogStore } from '@/app/layouts/shell/model/useDialogStore'
import { useDrawerStore } from '@/app/layouts/shell/model/useDrawerStore'
import {
	useRegisterPageFilterController,
	useTaskPageFilterController,
} from '@/features/filter/model'
import { buildTaskCommandSelection, useRegisterCommandSelection } from '@/features/selection/model'
import { getTaskBoardVisualOrderIds } from '@/features/task/model/taskBoardOrder'
import { formatTaskStatusLabel } from '@/features/task/model/taskStatus'
import { useTaskListController } from '@/features/task/model/useTaskListController'
import { useTaskSelection } from '@/features/task/model/useTaskSelection'
import { selectTaskList, useTaskStore } from '@/features/task/model/useTaskStore'
import { BulkActionBar, BulkCommandMenuAction } from '@/features/bulk-action'
import { useScopeRoute } from '@/features/space/model/scopeRoute'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbList,
	BreadcrumbPage,
} from '@/shared/ui/base/breadcrumb'
import { breadcrumbLeadClass, breadcrumbLeadIconClass } from '@/shared/ui/patterns/breadcrumb'
import { Layers3Icon, PlusIcon, TargetIcon } from 'lucide-react'
import type { TaskStatus } from '@/shared/types'

const NO_PROJECT_FILTERS: Array<'all' | TaskStatus> = [
	'all',
	'doing',
	'todo',
	'waiting',
	'done',
	'canceled',
]

export function NoProjectPage() {
	const { scope } = useScopeRoute()
	const taskList = useTaskStore(selectTaskList)
	const loadList = useTaskStore((state) => state.loadList)
	const openDrawer = useDrawerStore((state) => state.openDrawer)
	const activeDrawerId = useDrawerStore((state) => state.activeDrawerId)
	const activeDrawerKind = useDrawerStore((state) => state.activeDrawerKind)
	const openTaskCreateDialog = useDialogStore((state) => state.openTaskCreateDialog)
	const {
		pendingTaskId,
		updateTaskPriority,
		updateTaskStatus,
		toggleTaskStatus,
		archiveListTask,
		deleteListTask,
	} = useTaskListController()
	const { controller, filteredTasks } = useTaskPageFilterController({
		tasks: taskList.items,
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
				clearSelection: clearTaskSelection,
			}),
		[clearTaskSelection, filteredTasks, selectionSnapshot.ids],
	)
	useRegisterCommandSelection(commandSelection)

	useEffect(() => {
		void loadList({
			scope,
			viewKey: 'all',
			placement: { kind: 'noProject' },
		})
	}, [loadList, scope])

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
					activeItemId: activeDrawerKind === 'task' ? activeDrawerId : null,
					pendingItemId: pendingTaskId,
					selectedTaskIdSet,
					focusedTaskId,
				},
				boardActions: {
					onArchiveTask: archiveListTask,
					onClearTaskSelection: clearTaskSelection,
					onDeleteTask: deleteListTask,
					onEmptyAction: () => openTaskCreateDialog({ placement: 'noProject' }),
					onOpenTask: (taskId) => openDrawer('task', taskId),
					onSelectAllTasks: selectTaskIds,
					onSetFocusedTask: setFocusedTaskId,
					onMoveTaskFocus: moveFocus,
					onToggleTaskSelection: toggleTaskSelection,
					onToggleTaskStatus: toggleTaskStatus,
					onUpdateTaskPriority: updateTaskPriority,
					onUpdateTaskStatus: updateTaskStatus,
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
				void loadList({
					scope,
					viewKey: 'all',
					placement: { kind: 'noProject' },
				})
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

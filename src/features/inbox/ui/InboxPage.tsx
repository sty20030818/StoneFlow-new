import { useEffect, useMemo } from 'react'

import { EntityScene } from '@/app/layouts/entity-scene'
import { MainCard } from '@/app/layouts/main-card/MainCardLayout'
import { Button } from '@/shared/ui/base/button'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbList,
	BreadcrumbPage,
} from '@/shared/ui/base/breadcrumb'
import {
	breadcrumbLeadClass,
	breadcrumbLeadIconClass,
} from '@/shared/ui/patterns/breadcrumb'
import { useDialogStore } from '@/app/layouts/shell/model/useDialogStore'
import { useDrawerStore } from '@/app/layouts/shell/model/useDrawerStore'
import {
	selectProjectOptions,
	useProjectStore,
} from '@/features/project/model/useProjectStore'
import { useScopeRoute } from '@/features/space/model/scopeRoute'
import { useTaskListController } from '@/features/task/model/useTaskListController'
import { useTaskSelection } from '@/features/task/model/useTaskSelection'
import { useTaskSelectionEscape } from '@/features/task/shortcuts'
import { BulkActionBar } from '@/shared/ui/bulk-action-bar'
import { BULK_ACTION_BUTTON_CLASS } from '@/shared/ui/patterns/bulk-action'
import { selectTaskList, useTaskStore } from '@/features/task/model/useTaskStore'
import { InboxIcon, PlusIcon } from 'lucide-react'

const INBOX_STATUS_ORDER = ['todo', 'doing', 'waiting'] as const

export function InboxPage() {
	const { scope, spaceId } = useScopeRoute()
	const taskList = useTaskStore(selectTaskList)
	const loadList = useTaskStore((state) => state.loadList)
	const projectOptions = useProjectStore(selectProjectOptions)
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
		leaveListTaskToProject,
		leaveListTaskAsNoProject,
	} = useTaskListController()

	const inboxProjectOptions = useMemo(
		() =>
			spaceId
				? projectOptions.filter((project) => project.spaceId === spaceId)
				: projectOptions,
		[projectOptions, spaceId],
	)
	const { selectedTaskIdSet, selectedCount, toggleTaskSelection, clearTaskSelection } =
		useTaskSelection(taskList.items.map((task) => task.id))
	useTaskSelectionEscape({
		hasSelection: selectedCount > 0,
		clearSelection: clearTaskSelection,
	})

	useEffect(() => {
		void loadList({
			scope,
			viewKey: 'active',
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
					statusOrder: [...INBOX_STATUS_ORDER],
				},
				boardData: {
					items: taskList.items,
					activeItemId: activeDrawerKind === 'task' ? activeDrawerId : null,
					pendingItemId: pendingTaskId,
					selectedTaskIdSet,
				},
				boardActions: {
					onArchiveTask: archiveListTask,
					onDeleteTask: deleteListTask,
					onEmptyAction: () => openTaskCreateDialog(),
					onOpenTask: (taskId) => openDrawer('task', taskId),
					onToggleTaskSelection: toggleTaskSelection,
					onToggleTaskStatus: toggleTaskStatus,
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
					action={
						<Button className={BULK_ACTION_BUTTON_CLASS} size='sm' variant='outline'>
							批量操作
						</Button>
					}
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
					viewKey: 'active',
					placement: { kind: 'inbox' },
				})
			}}
			sceneVariant='inbox'
			toolbarPills={[
				{
					label: `待整理 ${taskList.items.length}`,
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

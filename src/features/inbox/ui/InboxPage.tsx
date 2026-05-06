import { useEffect } from 'react'

import { EntityScene } from '@/app/layouts/entity-scene'
import { MainCard } from '@/app/layouts/main-card/MainCardLayout'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbList,
	BreadcrumbPage,
} from '@/shared/ui/base/breadcrumb'
import {
	breadcrumbCaptionClass,
	breadcrumbLeadClass,
	breadcrumbLeadIconClass,
} from '@/shared/ui/patterns/breadcrumb'
import { useDialogStore } from '@/app/layouts/shell/model/useDialogStore'
import { useDrawerStore } from '@/app/layouts/shell/model/useDrawerStore'
import {
	selectProjectOptions,
	selectProjectSidebar,
	useProjectStore,
} from '@/features/project/model/useProjectStore'
import { useScopeRoute } from '@/features/space/model/scopeRoute'
import { useTaskListController } from '@/features/task/model/useTaskListController'
import { useTaskSelection } from '@/features/task/model/useTaskSelection'
import { selectTaskList, useTaskStore } from '@/features/task/model/useTaskStore'
import { Button } from '@/shared/ui/base/button'
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/shared/ui/base/select'
import { InboxIcon, PlusIcon } from 'lucide-react'

const INBOX_STATUS_ORDER = ['todo', 'doing', 'waiting'] as const

export function InboxPage() {
	const { scope } = useScopeRoute()
	const taskList = useTaskStore(selectTaskList)
	const loadList = useTaskStore((state) => state.loadList)
	const projectOptions = useProjectStore(selectProjectOptions)
	const projectSidebar = useProjectStore(selectProjectSidebar)
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
	const { selectedTaskIdSet, toggleTaskSelection } = useTaskSelection(
		taskList.items.map((task) => task.id),
	)

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
					renderRowActions: (task) => (
						<InboxPlacementActions
							isBusy={pendingTaskId === task.id}
							onLeaveAsNoProject={() => void leaveListTaskAsNoProject(task)}
							onLeaveToProject={(projectId) => void leaveListTaskToProject(task, projectId)}
							projects={projectOptions.filter((project) => project.spaceId === task.spaceId)}
							projectsLoading={projectSidebar.status === 'loading'}
						/>
					),
					rowVariant: 'stacked',
					sectionVariant: 'compact',
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
				},
			}}
			breadcrumb={<InboxBreadcrumb />}
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

function InboxPlacementActions({
	projects,
	projectsLoading,
	isBusy,
	onLeaveToProject,
	onLeaveAsNoProject,
}: {
	projects: Array<{ id: string; name: string }>
	projectsLoading: boolean
	isBusy: boolean
	onLeaveToProject: (projectId: string) => void
	onLeaveAsNoProject: () => void
}) {
	return (
		<div className='flex flex-wrap items-center gap-2'>
			<Select
				disabled={isBusy || projectsLoading || projects.length === 0}
				onValueChange={onLeaveToProject}
			>
				<SelectTrigger
					aria-label='整理到项目'
					className='h-8 w-36 rounded-md border-input bg-card text-[12px]'
				>
					<SelectValue placeholder={projectsLoading ? '读取项目中...' : '移到项目'} />
				</SelectTrigger>
				<SelectContent position='popper'>
					<SelectGroup>
						{projects.map((project) => (
							<SelectItem key={project.id} value={project.id}>
								{project.name}
							</SelectItem>
						))}
					</SelectGroup>
				</SelectContent>
			</Select>
			<Button
				className='h-8 rounded-md px-3 text-[12px]'
				disabled={isBusy}
				onClick={onLeaveAsNoProject}
				type='button'
				variant='outline'
			>
				设为独立事项
			</Button>
			<span className={breadcrumbCaptionClass}>
				<InboxIcon className='size-3' />
				离开 Inbox
			</span>
		</div>
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

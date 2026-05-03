import { useEffect, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import {
	MainCardGhostAction,
	MainCardHeader,
	MainCardLayout,
	MainCardToolbar,
} from '@/app/layouts/main-card/MainCardLayout'
import { buildScopedSectionPath } from '@/app/layouts/shell/config'
import { useDialogStore } from '@/app/layouts/shell/model/useDialogStore'
import { useDrawerStore } from '@/app/layouts/shell/model/useDrawerStore'
import { useScopeRoute } from '@/features/space/model/scopeRoute'
import { useTaskListController } from '@/features/task/model/useTaskListController'
import { useTaskSelection } from '@/features/task/model/useTaskSelection'
import { selectTaskList, useTaskStore } from '@/features/task/model/useTaskStore'
import { TaskBoard } from '@/features/task/ui/TaskBoard'
import { TaskBulkActionBar } from '@/features/task/ui/TaskBulkActionBar'
import { Button } from '@/shared/ui/base/button'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbList,
	BreadcrumbPage,
} from '@/shared/ui/base/breadcrumb'
import { Layers2Icon, PlusIcon } from 'lucide-react'

type SystemTaskViewKey = 'today' | 'focus' | 'upcoming' | 'overdue'

type SystemTaskViewConfig = {
	key: SystemTaskViewKey
	label: string
	emptyTitle: string
	emptyDescription: string
	sortHint: string
}

const DEFAULT_SYSTEM_TASK_VIEW_KEY: SystemTaskViewKey = 'today'

const SYSTEM_TASK_VIEW_CONFIG: SystemTaskViewConfig[] = [
	{
		key: 'today',
		label: 'Today',
		emptyTitle: '今天没有任务',
		emptyDescription: '今天计划、今天截止和已经逾期的任务会显示在这里。',
		sortHint: '逾期优先，然后是今天截止、今天计划，最后按优先级。',
	},
	{
		key: 'focus',
		label: 'Focus',
		emptyTitle: '当前没有需要聚焦的任务',
		emptyDescription: '高优先级且可执行的任务会显示在这里。',
		sortHint: '按优先级倒序，再按最近截止和计划时间排序。',
	},
	{
		key: 'upcoming',
		label: 'Upcoming',
		emptyTitle: '接下来没有待处理安排',
		emptyDescription: '未来计划和未来截止的任务会显示在这里。',
		sortHint: '按最近未来日期优先，再按优先级排序。',
	},
	{
		key: 'overdue',
		label: 'Overdue',
		emptyTitle: '当前没有逾期任务',
		emptyDescription: '已经逾期但尚未完成的任务会显示在这里。',
		sortHint: '按最早逾期的截止时间优先，再按优先级排序。',
	},
]

function isSystemTaskViewKey(value: string | null): value is SystemTaskViewKey {
	return SYSTEM_TASK_VIEW_CONFIG.some((item) => item.key === value)
}

export function ViewsPage() {
	const { scope, spaceId } = useScopeRoute()
	const navigate = useNavigate()
	const location = useLocation()
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

	const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search])
	const rawViewKey = searchParams.get('view')
	const activeViewKey = isSystemTaskViewKey(rawViewKey) ? rawViewKey : DEFAULT_SYSTEM_TASK_VIEW_KEY
	const activeView = useMemo(
		() =>
			SYSTEM_TASK_VIEW_CONFIG.find((item) => item.key === activeViewKey) ??
			SYSTEM_TASK_VIEW_CONFIG[0],
		[activeViewKey],
	)
	const { selectedTaskIdSet, selectedCount, toggleTaskSelection, clearTaskSelection } =
		useTaskSelection(taskList.items.map((task) => task.id))

	useEffect(() => {
		if (rawViewKey && isSystemTaskViewKey(rawViewKey)) {
			return
		}

		void navigate(
			{
				pathname: buildScopedSectionPath(scope, 'views', spaceId),
				search: `?view=${DEFAULT_SYSTEM_TASK_VIEW_KEY}`,
			},
			{ replace: true },
		)
	}, [navigate, rawViewKey, scope, spaceId])

	useEffect(() => {
		void loadList({
			scope,
			viewKey: activeView.key,
			placement: { kind: 'all' },
		})
	}, [activeView.key, loadList, scope])

	function navigateToView(viewKey: SystemTaskViewKey) {
		void navigate({
			pathname: buildScopedSectionPath(scope, 'views', spaceId),
			search: `?view=${viewKey}`,
		})
	}

	return (
		<MainCardLayout
			header={
				<MainCardHeader
					action={
						<MainCardGhostAction
							aria-label='创建任务'
							onClick={() => openTaskCreateDialog({ status: 'todo' })}
						>
							<PlusIcon />
						</MainCardGhostAction>
					}
					breadcrumb={<ViewsBreadcrumb />}
				/>
			}
			toolbar={
				<MainCardToolbar
					onRefresh={() => {
						void loadList({
							scope,
							viewKey: activeView.key,
							placement: { kind: 'all' },
						})
					}}
					pills={SYSTEM_TASK_VIEW_CONFIG.map((view) => ({
						label: view.label,
						active: view.key === activeView.key,
						onClick: () => navigateToView(view.key),
						role: 'tab',
					}))}
				/>
			}
		>
			<div className='flex min-h-0 flex-1 flex-col gap-3'>
				<TaskBoard
					activeTaskId={activeDrawerKind === 'task' ? activeDrawerId : null}
					emptyActionLabel='创建任务'
					emptyDescription={activeView.emptyDescription}
					emptyTitle={activeView.emptyTitle}
					hideEmptySections
					onArchiveTask={archiveListTask}
					onDeleteTask={deleteListTask}
					onEmptyAction={() => openTaskCreateDialog({ status: 'todo' })}
					onOpenTask={(taskId) => openDrawer('task', taskId)}
					onToggleTaskSelection={toggleTaskSelection}
					onToggleTaskStatus={toggleTaskStatus}
					onUpdateTaskPriority={updateTaskPriority}
					onUpdateTaskStatus={updateTaskStatus}
					pendingTaskId={pendingTaskId}
					rowVariant='project'
					selectedTaskIdSet={selectedTaskIdSet}
					sectionVariant='project'
					showProjectName
					statusOrder={['doing', 'todo', 'waiting', 'done', 'canceled']}
					tasks={taskList.items}
				/>
				<TaskBulkActionBar
					action={
						<Button
							className='border-(--sf-color-border) bg-white text-(--sf-color-sidebar-action-foreground) opacity-70'
							disabled
							size='sm'
							variant='outline'
						>
							批量能力后续接入
						</Button>
					}
					onClear={clearTaskSelection}
					selectedCount={selectedCount}
				/>
				<div className='mt-auto px-1 text-[12px] text-(--sf-color-text-tertiary)'>
					{activeView.sortHint}
				</div>
			</div>
		</MainCardLayout>
	)
}

function ViewsBreadcrumb() {
	return (
		<Breadcrumb>
			<BreadcrumbList className='text-sm font-semibold leading-5'>
				<BreadcrumbItem>
					<BreadcrumbPage className='inline-flex items-center gap-1.5'>
						<Layers2Icon aria-hidden className='size-4 shrink-0 text-(--sf-color-text-tertiary)' />
						视图
					</BreadcrumbPage>
				</BreadcrumbItem>
			</BreadcrumbList>
		</Breadcrumb>
	)
}

import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'

import { getScopeLabel } from '@/app/layouts/shell/config'
import {
	selectActiveDrawerId,
	selectActiveDrawerKind,
	useDrawerStore,
} from '@/app/layouts/shell/model/useDrawerStore'
import {
	MainCardHeader,
	MainCardLayout,
	MainCardToolbar,
} from '@/app/layouts/main-card/MainCardLayout'
import { TaskBulkActionBar } from '@/features/task/ui/TaskBulkActionBar'
import { ProjectTaskBoard } from '@/features/project/ui/ProjectTaskBoard'
import { useScopeRoute } from '@/features/space/model/scopeRoute'
import { selectSpaces, useSpaceStore } from '@/features/space/model/useSpaceStore'
import { useTaskSelection } from '@/features/task/model/useTaskSelection'
import type { ProjectExecutionTask } from '@/features/project/model/types'
import { PROJECT_RECORDS, getProjectTasks } from '@/features/workspace'
import { Button } from '@/shared/ui/base/button'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from '@/shared/ui/base/breadcrumb'
import { StatusNotice } from '@/shared/ui/StatusNotice'
import { Box, FolderIcon } from 'lucide-react'

export function ProjectPage() {
	const { projectId = 'shell-project-stoneflow' } = useParams()
	const { scope } = useScopeRoute()
	const spaces = useSpaceStore(selectSpaces)
	const activeDrawerKind = useDrawerStore(selectActiveDrawerKind)
	const activeDrawerId = useDrawerStore(selectActiveDrawerId)
	const openDrawer = useDrawerStore((state) => state.openDrawer)
	const project = PROJECT_RECORDS.find((item) => item.id === projectId) ?? PROJECT_RECORDS[0]
	const initialTasks = useMemo(
		() => toProjectExecutionTasks(getProjectTasks(project.id)),
		[project.id],
	)
	const [tasks, setTasks] = useState<ProjectExecutionTask[]>(initialTasks)
	const [bannerMessage, setBannerMessage] = useState(
		'Project 页面保留了面包屑、任务分栏和底部多选条外观，数据来自本地 mock。',
	)
	const { selectedTaskIdSet, selectedCount, toggleTaskSelection, clearTaskSelection } =
		useTaskSelection(tasks.map((task) => task.id))

	function updateTask(
		task: ProjectExecutionTask,
		updater: (currentTask: ProjectExecutionTask) => ProjectExecutionTask,
		message: string,
	) {
		setTasks((currentTasks) =>
			currentTasks.map((currentTask) =>
				currentTask.id === task.id ? updater(currentTask) : currentTask,
			),
		)
		setBannerMessage(message)
		return Promise.resolve()
	}

	function moveTaskToTrash(task: ProjectExecutionTask) {
		setTasks((currentTasks) => currentTasks.filter((currentTask) => currentTask.id !== task.id))
		setBannerMessage(`已从本地 mock Project board 中移除「${task.title}」。`)
		return Promise.resolve()
	}

	return (
		<MainCardLayout
			header={<MainCardHeader breadcrumb={<ProjectBreadcrumb projectName={project.name} />} />}
			toolbar={
				<MainCardToolbar
					onRefresh={() => {
						setTasks(toProjectExecutionTasks(getProjectTasks(project.id)))
						setBannerMessage('已刷新本地 mock Project board 数据。')
					}}
					pills={[{ label: 'All issues', active: true }, { label: 'Active' }, { label: 'Backlog' }]}
				/>
			}
		>
			<div className='flex min-h-0 flex-1 flex-col'>
				<StatusNotice className='mb-3' size='sm'>
					{bannerMessage} 当前 Scope：{getScopeLabel(scope, spaces)}。
				</StatusNotice>

				<div className='flex min-h-0 flex-1 flex-col'>
					<ProjectTaskBoard
						activeTaskId={activeDrawerKind === 'task' ? activeDrawerId : null}
						onMoveTaskToTrash={moveTaskToTrash}
						onOpenTask={(taskId) => openDrawer('task', taskId)}
						onToggleTaskSelection={toggleTaskSelection}
						onToggleTaskStatus={(task) =>
							updateTask(
								task,
								(currentTask) => ({
									...currentTask,
									status: currentTask.status === 'done' ? 'todo' : 'done',
								}),
								'已切换本地 mock 任务状态。',
							)
						}
						onUpdateTaskPriority={(task, priority) =>
							updateTask(
								task,
								(currentTask) => ({ ...currentTask, priority }),
								'已更新本地 mock 优先级。',
							)
						}
						onUpdateTaskStatus={(task, status) =>
							updateTask(
								task,
								(currentTask) => ({ ...currentTask, status }),
								'已更新本地 mock 状态。',
							)
						}
						pendingTaskId={null}
						projectId={project.id}
						selectedTaskIdSet={selectedTaskIdSet}
						tasks={tasks}
					/>
				</div>

				<TaskBulkActionBar
					action={
						<Button
							className='border-(--sf-color-border) bg-white text-(--sf-color-sidebar-action-foreground) hover:border-(--sf-color-border-strong) hover:bg-(--sf-color-bg-surface-muted) hover:text-(--sf-color-sidebar-action-foreground)'
							onClick={() => setBannerMessage('批量动作条已保留，真实批量命令将在后续阶段接回。')}
							size='sm'
							type='button'
							variant='outline'
						>
							<span
								aria-hidden
								className='text-sm leading-none text-(--sf-color-sidebar-action-foreground)'
							>
								⌘
							</span>
							指令
						</Button>
					}
					onClear={clearTaskSelection}
					selectedCount={selectedCount}
				/>
			</div>
		</MainCardLayout>
	)
}

function ProjectBreadcrumb({ projectName }: { projectName: string }) {
	return (
		<Breadcrumb>
			<BreadcrumbList className='text-sm font-semibold leading-5'>
				<BreadcrumbItem>
					<span className='inline-flex items-center gap-1.5 text-foreground'>
						<Box aria-hidden className='size-4 shrink-0 text-(--sf-color-text-tertiary)' />
						Projects
					</span>
				</BreadcrumbItem>
				<BreadcrumbSeparator />
				<BreadcrumbItem className='min-w-0'>
					<BreadcrumbPage className='flex min-w-0 items-center gap-2 font-semibold'>
						<FolderIcon className='size-4 shrink-0 text-(--sf-color-text-tertiary)' />
						<span className='truncate'>{projectName}</span>
					</BreadcrumbPage>
				</BreadcrumbItem>
			</BreadcrumbList>
		</Breadcrumb>
	)
}

function toProjectExecutionTasks(
	tasks: ReturnType<typeof getProjectTasks>,
): ProjectExecutionTask[] {
	return tasks.map((task, index) => ({
		id: task.id,
		title: task.title,
		note: task.note,
		priority: task.priority,
		status: task.status,
		tags: index === 0 ? ['UI shell', 'Mock data'] : ['Static'],
		dueAt: index === 0 ? '2026-04-30T10:00:00.000Z' : null,
		completedAt: task.status === 'done' ? '2026-04-28T20:00:00.000Z' : null,
		createdAt: `2026-04-2${index + 5}T09:00:00.000Z`,
		updatedAt: `2026-04-2${index + 7}T11:30:00.000Z`,
	}))
}

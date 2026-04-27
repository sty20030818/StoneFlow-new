import { useParams } from 'react-router-dom'

import {
	selectActiveDrawerId,
	selectActiveDrawerKind,
	useShellLayoutStore,
} from '@/app/layouts/shell/model/useShellLayoutStore'
import {
	MainCardHeader,
	MainCardLayout,
	MainCardToolbar,
} from '@/app/layouts/main-card/MainCardLayout'
import { useProjectExecution } from '@/features/project/model/useProjectExecution'
import { useTaskSelection } from '@/features/task/model/useTaskSelection'
import { TaskBulkActionBar } from '@/features/task/ui/TaskBulkActionBar'
import { ProjectTaskBoard } from '@/features/project/ui/ProjectTaskBoard'
import { Button } from '@/shared/ui/base/button'
import { EmptyPage } from '@/shared/ui/base/empty'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from '@/shared/ui/base/breadcrumb'
import { StatusNotice } from '@/shared/ui/StatusNotice'
import { ToastFeedbackBridge } from '@/shared/ui/ToastFeedbackBridge'
import { Box, FolderIcon } from 'lucide-react'

export function ProjectPage() {
	const { projectId = 'stoneflow-v1', spaceId = 'work' } = useParams()
	const activeDrawerKind = useShellLayoutStore(selectActiveDrawerKind)
	const activeDrawerId = useShellLayoutStore(selectActiveDrawerId)
	const openDrawer = useShellLayoutStore((state) => state.openDrawer)
	const {
		view,
		isLoading,
		loadError,
		feedback,
		pendingTaskId,
		refresh,
		updateTaskPriority,
		updateTaskStatus,
		toggleTaskStatus,
		moveTaskToTrash,
	} = useProjectExecution(spaceId, projectId)
	const { selectedTaskIdSet, selectedCount, toggleTaskSelection, clearTaskSelection } = useTaskSelection(
		view?.tasks.map((task) => task.id) ?? [],
	)

	return (
		<MainCardLayout
			header={
				<MainCardHeader
					breadcrumb={<ProjectBreadcrumb projectName={view?.project.name ?? projectId} />}
				/>
			}
			toolbar={
				<MainCardToolbar
					onRefresh={() => void refresh()}
					pills={[{ label: 'All issues', active: true }, { label: 'Active' }, { label: 'Backlog' }]}
					refreshDisabled={isLoading}
				/>
			}
		>
			<div className='flex min-h-0 flex-1 flex-col'>
				<ToastFeedbackBridge feedback={feedback} />

				{loadError ? (
					<StatusNotice
						actions={
							<Button
								className='rounded-md'
								onClick={() => void refresh()}
								size='sm'
								variant='outline'
							>
								重试
							</Button>
						}
						className='mb-3'
						role='alert'
						variant='danger'
					>
						<p className='text-sm'>{loadError}</p>
					</StatusNotice>
				) : null}

				<EmptyPage>
					{isLoading ? (
						<p className='text-sm text-muted-foreground' role='status'>
							正在加载 Project 执行视图...
						</p>
					) : view ? (
						<ProjectTaskBoard
							activeTaskId={activeDrawerKind === 'task' ? activeDrawerId : null}
							onMoveTaskToTrash={moveTaskToTrash}
							onOpenTask={(taskId) => openDrawer('task', taskId)}
							onToggleTaskSelection={toggleTaskSelection}
							onUpdateTaskPriority={updateTaskPriority}
							onUpdateTaskStatus={updateTaskStatus}
							onToggleTaskStatus={toggleTaskStatus}
							pendingTaskId={pendingTaskId}
							projectId={view.project.id}
							selectedTaskIdSet={selectedTaskIdSet}
							tasks={view.tasks}
						/>
					) : null}
				</EmptyPage>

				<TaskBulkActionBar
					action={
						<Button
							className='border-(--sf-color-border) bg-white text-(--sf-color-sidebar-action-foreground) hover:border-(--sf-color-border-strong) hover:bg-(--sf-color-bg-surface-muted) hover:text-(--sf-color-sidebar-action-foreground)'
							onClick={() => undefined}
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

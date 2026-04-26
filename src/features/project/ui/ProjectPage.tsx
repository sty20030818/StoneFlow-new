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
import { ProjectTaskBoard } from '@/features/project/ui/ProjectTaskBoard'
import { Button } from '@/shared/ui/base/button'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from '@/shared/ui/base/breadcrumb'
import { StatusNotice } from '@/shared/ui/StatusNotice'
import { FolderIcon } from 'lucide-react'

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
		toggleTaskStatus,
		moveTaskToTrash,
	} = useProjectExecution(spaceId, projectId)

	return (
		<MainCardLayout
			header={<MainCardHeader breadcrumb={<ProjectBreadcrumb projectName={view?.project.name ?? projectId} />} />}
			toolbar={
				<MainCardToolbar
					onRefresh={() => void refresh()}
					pills={[{ label: 'All issues', active: true }, { label: 'Active' }, { label: 'Backlog' }]}
					refreshDisabled={isLoading}
				/>
			}
		>
			<div className='flex flex-col gap-5 pt-4'>
				{feedback ? (
					<StatusNotice className='text-sm' role='status' size='sm' variant='success'>
						{feedback}
					</StatusNotice>
				) : null}

				{loadError ? (
					<StatusNotice
						actions={
							<Button className='rounded-md' onClick={() => void refresh()} size='sm' variant='outline'>
								重试
							</Button>
						}
						role='alert'
						variant='danger'
					>
						<p className='text-sm'>{loadError}</p>
					</StatusNotice>
				) : null}

				{isLoading ? (
					<p className='text-sm text-muted-foreground' role='status'>
						正在加载 Project 执行视图...
					</p>
				) : view ? (
					<ProjectTaskBoard
						activeTaskId={activeDrawerKind === 'task' ? activeDrawerId : null}
						onMoveTaskToTrash={moveTaskToTrash}
						onOpenTask={(taskId) => openDrawer('task', taskId)}
						onToggleTaskStatus={toggleTaskStatus}
						pendingTaskId={pendingTaskId}
						projectId={view.project.id}
						tasks={view.tasks}
					/>
				) : null}
			</div>
		</MainCardLayout>
	)
}

function ProjectBreadcrumb({ projectName }: { projectName: string }) {
	return (
		<Breadcrumb>
			<BreadcrumbList className='text-[1.0625rem] font-semibold'>
				<BreadcrumbItem>
					<span className='text-foreground'>Projects</span>
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

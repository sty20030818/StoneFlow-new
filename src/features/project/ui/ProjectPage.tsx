import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { buildScopedSectionPath, getScopeLabel } from '@/app/layouts/shell/config'
import {
	MainCardHeader,
	MainCardLayout,
	MainCardToolbar,
} from '@/app/layouts/main-card/MainCardLayout'
import type { ProjectExecutionTask } from '@/features/project/model/types'
import { selectProjectDetail, useProjectStore } from '@/features/project/model/useProjectStore'
import { ProjectTaskBoard } from '@/features/project/ui/ProjectTaskBoard'
import { useDrawerStore } from '@/app/layouts/shell/model/useDrawerStore'
import { useScopeRoute } from '@/features/space/model/scopeRoute'
import { selectSpaces, useSpaceStore } from '@/features/space/model/useSpaceStore'
import { TASK_RECORDS } from '@/features/workspace-shell/model/shellData'
import { Button } from '@/shared/ui/base/button'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from '@/shared/ui/base/breadcrumb'
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyPage,
	EmptyTitle,
} from '@/shared/ui/base/empty'
import { StatusNotice } from '@/shared/ui/StatusNotice'
import { FolderIcon } from 'lucide-react'

export function ProjectPage() {
	const navigate = useNavigate()
	const { projectId = '' } = useParams()
	const { scope, spaceId } = useScopeRoute()
	const spaces = useSpaceStore(selectSpaces)
	const detail = useProjectStore(selectProjectDetail)
	const loadDetail = useProjectStore((state) => state.loadDetail)
	const clearDetail = useProjectStore((state) => state.clearDetail)
	const completeProject = useProjectStore((state) => state.completeProject)
	const reopenProject = useProjectStore((state) => state.reopenProject)
	const archiveProject = useProjectStore((state) => state.archiveProject)
	const deleteProject = useProjectStore((state) => state.deleteProject)
	const [isEditing, setIsEditing] = useState(false)
	const [busyAction, setBusyAction] = useState<string | null>(null)

	useEffect(() => {
		if (projectId) {
			void loadDetail(projectId)
		}
		return () => {
			clearDetail()
		}
	}, [clearDetail, loadDetail, projectId])

	async function runAction(action: string, runner: () => Promise<unknown>) {
		setBusyAction(action)
		try {
			await runner()
		} finally {
			setBusyAction(null)
		}
	}

	const project = detail.item

	return (
		<MainCardLayout
			header={
				<MainCardHeader
					breadcrumb={<ProjectBreadcrumb projectName={project?.name ?? 'Project'} />}
					action={
						project ? (
							<div className='flex items-center gap-2'>
								<Button
									disabled={busyAction !== null}
									onClick={() => setIsEditing((current) => !current)}
									size='sm'
									variant='outline'
								>
									{isEditing ? '取消编辑' : '编辑'}
								</Button>
								<Button
									disabled={busyAction !== null}
									onClick={() => {
										void runAction(project.completedAt ? 'reopen' : 'complete', async () => {
											if (project.completedAt) {
												await reopenProject(project.id)
												return
											}
											await completeProject(project.id)
										})
									}}
									size='sm'
									variant='outline'
								>
									{project.completedAt ? '重开' : '完成'}
								</Button>
								<Button
									disabled={busyAction !== null}
									onClick={() => {
										void runAction('archive', async () => {
											await archiveProject(project.id)
											navigate(buildScopedSectionPath(scope, 'projects', spaceId))
										})
									}}
									size='sm'
									variant='outline'
								>
									归档
								</Button>
								<Button
									disabled={busyAction !== null}
									onClick={() => {
										void runAction('delete', async () => {
											await deleteProject(project.id)
											navigate(buildScopedSectionPath(scope, 'projects', spaceId))
										})
									}}
									size='sm'
									variant='outline'
								>
									删除
								</Button>
							</div>
						) : null
					}
				/>
			}
			toolbar={
				<MainCardToolbar
					onRefresh={() => {
						if (projectId) {
							void loadDetail(projectId)
						}
					}}
					pills={[
						{ label: 'All tasks', active: true },
						{ label: 'Todo' },
						{ label: 'Done' },
					]}
				/>
			}
		>
			<div className='flex min-h-0 flex-1 flex-col gap-3'>
				{detail.error ? (
					<StatusNotice role='alert' size='sm' variant='danger'>
						{detail.error}
					</StatusNotice>
				) : (
					<StatusNotice size='sm'>
						当前 Scope：{getScopeLabel(scope, spaces)}
					</StatusNotice>
				)}

				{!project ? (
					<EmptyPage>
						<Empty>
							<EmptyHeader>
								<EmptyMedia variant='icon'>
									<FolderIcon />
								</EmptyMedia>
								<EmptyTitle>当前 Project 不可见</EmptyTitle>
								<EmptyDescription>它可能已被归档、删除，或当前 Scope 已切走。</EmptyDescription>
							</EmptyHeader>
							<EmptyContent>
								<Button
									onClick={() => navigate(buildScopedSectionPath(scope, 'projects', spaceId))}
									type='button'
								>
									返回 Project Overview
								</Button>
							</EmptyContent>
						</Empty>
					</EmptyPage>
				) : (
					<ProjectTaskBoardMock projectId={project.id} />
				)}
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
						<FolderIcon aria-hidden className='size-4 shrink-0 text-(--sf-color-text-tertiary)' />
						Projects
					</span>
				</BreadcrumbItem>
				<BreadcrumbSeparator />
				<BreadcrumbItem className='min-w-0'>
					<BreadcrumbPage className='truncate'>{projectName}</BreadcrumbPage>
				</BreadcrumbItem>
			</BreadcrumbList>
		</Breadcrumb>
	)
}

function ProjectTaskBoardMock({ projectId }: { projectId: string }) {
	const openDrawer = useDrawerStore((state) => state.openDrawer)
	const [pendingTaskId] = useState<string | null>(null)
	const [activeTaskId] = useState<string | null>(null)
	const [selectedTaskIdSet, setSelectedTaskIdSet] = useState<Set<string>>(new Set())

	// 从 mock 数据中筛选属于当前项目的任务
	const tasks = useMemo(() => {
		return TASK_RECORDS.filter((task) => task.projectId === projectId).map((task) => ({
			id: task.id,
			title: task.title,
			note: task.note,
			priority: task.priority,
			status: task.status,
			tags: [],
			dueAt: task.dueLabel,
			completedAt: task.completedLabel,
			createdAt: task.createdLabel,
			updatedAt: task.updatedLabel,
		})) satisfies ProjectExecutionTask[]
	}, [projectId])

	function handleToggleTaskSelection(taskId: string) {
		setSelectedTaskIdSet((prev) => {
			const next = new Set(prev)
			if (next.has(taskId)) {
				next.delete(taskId)
			} else {
				next.add(taskId)
			}
			return next
		})
	}

	async function handleUpdateTaskPriority(task: ProjectExecutionTask, priority: string) {
		// mock 模式：仅打印日志
		console.log('Update task priority:', task.id, priority)
	}

	async function handleUpdateTaskStatus(task: ProjectExecutionTask, status: string) {
		// mock 模式：仅打印日志
		console.log('Update task status:', task.id, status)
	}

	async function handleToggleTaskStatus(task: ProjectExecutionTask) {
		// mock 模式：仅打印日志
		console.log('Toggle task status:', task.id)
	}

	async function handleMoveTaskToTrash(task: ProjectExecutionTask) {
		// mock 模式：仅打印日志
		console.log('Move task to trash:', task.id)
	}

	function handleOpenTask(taskId: string) {
		openDrawer('task', taskId)
	}

	return (
		<ProjectTaskBoard
			activeTaskId={activeTaskId}
			onMoveTaskToTrash={handleMoveTaskToTrash}
			onOpenTask={handleOpenTask}
			onToggleTaskSelection={handleToggleTaskSelection}
			onToggleTaskStatus={handleToggleTaskStatus}
			onUpdateTaskPriority={handleUpdateTaskPriority}
			onUpdateTaskStatus={handleUpdateTaskStatus}
			pendingTaskId={pendingTaskId}
			projectId={projectId}
			selectedTaskIdSet={selectedTaskIdSet}
			tasks={tasks}
		/>
	)
}

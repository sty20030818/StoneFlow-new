import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import { MainCard } from '@/app/layouts/main-card/MainCardLayout'
import { buildScopedSectionPath } from '@/app/routing'
import { selectProjectOptions, useProjectStore } from '@/features/project/model/useProjectStore'
import type { Scope, TaskDetail } from '@/shared/types'
import { DetailPageGrid, DetailPageMain, DetailPageSidebar } from '@/shared/ui/detail'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from '@/shared/ui/base/breadcrumb'
import {
	breadcrumbLeadForegroundClass,
	breadcrumbLeadIconClass,
} from '@/shared/ui/patterns/breadcrumb'
import { BoxIcon } from 'lucide-react'

import { createTaskDetailDraft } from '../model/taskDetailDraft'
import { useTaskAutosaveAdapter } from '../model/useTaskAutosaveAdapter'
import { useTaskDetailController } from '../model/useTaskDetailController'
import { TaskPageMain as TaskPageMainContent } from './TaskPageMain'
import { TaskPageSidebar as TaskPageSidebarContent } from './TaskPageSidebar'
import { TaskPageState } from './TaskPageState'

type TaskPageProps = {
	taskId: string
	scope: Scope
}

export function TaskPage({ taskId, scope }: TaskPageProps) {
	const navigate = useNavigate()
	const projects = useProjectStore(selectProjectOptions)
	const { task, status, error } = useTaskDetailController(taskId)
	const effectiveTask = task ?? createFallbackTaskDetail(taskId, scope)
	const isReadOnly = status !== 'ready' || !task || Boolean(task.deletedAt)
	const autosaveBase = useMemo(() => createTaskDetailDraft(effectiveTask), [effectiveTask])
	const autosave = useTaskAutosaveAdapter({
		base: autosaveBase,
		disabled: isReadOnly,
	})

	if (status === 'loading' || status === 'idle') {
		return <TaskPageState description='正在读取任务详情。' title='加载中' />
	}

	if (status === 'error') {
		return (
			<TaskPageState
				actionLabel='返回任务列表'
				description={error ?? '任务详情加载失败。'}
				onAction={() =>
					navigate(
						buildScopedSectionPath(
							scope,
							'all-tasks',
							scope.type === 'space' ? scope.spaceId : null,
						),
					)
				}
				title='无法打开任务'
			/>
		)
	}

	if (!task) {
		return (
			<TaskPageState
				actionLabel='返回任务列表'
				description='这个任务不存在，或者当前已经不可见。'
				onAction={() =>
					navigate(
						buildScopedSectionPath(
							scope,
							'all-tasks',
							scope.type === 'space' ? scope.spaceId : null,
						),
					)
				}
				title='任务不存在'
			/>
		)
	}

	return (
		<MainCard.Root>
			<MainCard.Header breadcrumb={<TaskPageBreadcrumb task={task} />} />
			<MainCard.Body>
				<div className='flex min-h-0 flex-1 flex-col gap-3'>
					<DetailPageGrid>
						<DetailPageMain>
							<TaskPageMainContent autosave={autosave} isReadOnly={isReadOnly} taskId={task.id} />
						</DetailPageMain>
						<DetailPageSidebar>
							<TaskPageSidebarContent
								autosave={autosave}
								isReadOnly={isReadOnly}
								projects={projects}
								task={task}
							/>
						</DetailPageSidebar>
					</DetailPageGrid>
				</div>
			</MainCard.Body>
		</MainCard.Root>
	)
}

function TaskPageBreadcrumb({ task }: { task: TaskDetail }) {
	const projectLabel = task.projectName ?? (task.inboxAt ? 'Inbox' : '独立事项')

	return (
		<Breadcrumb>
			<BreadcrumbList className='text-sm leading-5'>
				<BreadcrumbItem>
					<span className={breadcrumbLeadForegroundClass}>
						<BoxIcon aria-hidden className={breadcrumbLeadIconClass} />
						项目总览
					</span>
				</BreadcrumbItem>
				<BreadcrumbSeparator />
				<BreadcrumbItem className='min-w-0'>
					<span className='truncate font-semibold text-foreground'>{projectLabel}</span>
				</BreadcrumbItem>
				<BreadcrumbSeparator />
				<BreadcrumbItem className='min-w-0'>
					<BreadcrumbPage className='truncate font-semibold'>
						{task.title || '任务详情'}
					</BreadcrumbPage>
				</BreadcrumbItem>
			</BreadcrumbList>
		</Breadcrumb>
	)
}

function createFallbackTaskDetail(taskId: string, scope: Scope) {
	return {
		id: taskId,
		spaceId: scope.type === 'space' ? scope.spaceId : '',
		spaceName: scope.type === 'space' ? scope.spaceId : '所有空间',
		spaceSlug: scope.type === 'space' ? scope.spaceId : 'spaces',
		projectId: null,
		projectName: null,
		inboxAt: null,
		title: '',
		note: null,
		status: 'todo' as const,
		statusChangedAt: '',
		priority: 2 as const,
		dueAt: null,
		scheduledAt: null,
		reminderAt: null,
		completedAt: null,
		canceledAt: null,
		archivedAt: null,
		createdAt: '',
		updatedAt: '',
		sortOrder: 0,
		deletedAt: null,
	}
}

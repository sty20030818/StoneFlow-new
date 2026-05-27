import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import { MainCard } from '@/app/layouts/main-card/MainCardLayout'
import { buildCanonicalSectionPath } from '@/app/routing'
import { selectProjectOptions, useProjectStore } from '@/features/project/model/useProjectStore'
import { selectSpaces, useSpaceStore } from '@/features/space/model/useSpaceStore'
import type { Scope, TaskDetail } from '@/shared/types'
import { DetailPageGrid, DetailPageMain, DetailPageSidebar } from '@/shared/ui/detail'
import { AppBreadcrumb } from '@/shared/ui/AppBreadcrumb'
import { resolveBreadcrumb } from '@/shared/ui/breadcrumbResolver'

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
	const spaces = useSpaceStore(selectSpaces)
	const { task, status, error } = useTaskDetailController(taskId)
	const isReadOnly = status !== 'ready' || !task || Boolean(task.deletedAt)

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
						buildCanonicalSectionPath(
							scope,
							'tasks',
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
						buildCanonicalSectionPath(
							scope,
							'tasks',
							scope.type === 'space' ? scope.spaceId : null,
						),
					)
				}
				title='任务不存在'
			/>
		)
	}

	return (
		<TaskPageLoaded
			isReadOnly={isReadOnly}
			projects={projects}
			spaces={spaces}
			task={task}
		/>
	)
}

type TaskPageLoadedProps = {
	task: TaskDetail
	projects: ReturnType<typeof selectProjectOptions>
	spaces: ReturnType<typeof selectSpaces>
	isReadOnly: boolean
}

function TaskPageLoaded({ task, projects, spaces, isReadOnly }: TaskPageLoadedProps) {
	const autosaveBase = useMemo(() => createTaskDetailDraft(task), [task])
	const autosave = useTaskAutosaveAdapter({
		base: autosaveBase,
		disabled: isReadOnly,
	})
	const breadcrumbItems = useMemo(
		() =>
			resolveBreadcrumb({
				route: {
					appRoute: {
						kind: 'task',
						spaceId: task.spaceId,
						taskId: task.id,
						pathname: '',
						search: '',
						hash: '',
						fullPath: '',
					},
					kind: 'task',
					scope: { type: 'space', spaceId: task.spaceId },
					spaceId: task.spaceId,
					section: 'tasks',
					viewId: null,
					projectId: task.projectId,
					taskId: task.id,
					pathname: '',
					search: '',
					hash: '',
					fullPath: '',
					isShellPath: false,
					isSettingsPath: false,
					isDebugPath: false,
					isQuickCreatePath: false,
					isWorkPath: true,
				},
				taskDetail: {
					id: task.id,
					title: task.title,
					projectId: task.projectId,
					projectName: task.projectName,
					inboxAt: task.inboxAt,
				},
			}),
		[task],
	)

	return (
		<MainCard.Root>
			<MainCard.Header breadcrumb={<AppBreadcrumb items={breadcrumbItems} />} />
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
								spaces={spaces}
								task={task}
							/>
						</DetailPageSidebar>
					</DetailPageGrid>
				</div>
			</MainCard.Body>
		</MainCard.Root>
	)
}

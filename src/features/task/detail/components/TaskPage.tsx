import { useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'

import { MainCard } from '@/shared/components/main-card/MainCardLayout'
import { openSection } from '@/app/navigation/intents'
import { useProjectOptions } from '@/features/project'
import { useSpaces } from '@/features/space'
import type { Scope, Space, TaskDetail } from '@/shared/types'
import type { ProjectOption } from '@/features/project'
import { DetailPageGrid, DetailPageMain, DetailPageSidebar } from '@/shared/components/detail'
import { AppBreadcrumb } from '@/shared/components/AppBreadcrumb'
import { resolveBreadcrumb } from '@/app/navigation/breadcrumbResolver'

import { createTaskDetailDraft } from '../model/taskDetailDraft'
import { useTaskAutosaveAdapter } from '../model/useTaskAutosaveAdapter'
import { useSuspenseTaskDetailQuery } from '@/features/task/hooks/task.queries'
import { TaskPageMain as TaskPageMainContent } from './TaskPageMain'
import { TaskPageSidebar as TaskPageSidebarContent } from './TaskPageSidebar'
import { TaskPageState } from './TaskPageState'

type TaskPageProps = {
	taskId: string
	scope: Scope
}

export function TaskPage({ taskId, scope }: TaskPageProps) {
	const navigate = useNavigate({ from: '/' })
	const projects = useProjectOptions(scope)
	const { spaces } = useSpaces()
	const { data: task } = useSuspenseTaskDetailQuery(taskId)
	const isReadOnly = Boolean(task.deletedAt)

	if (!task) {
		return (
			<TaskPageState
				actionLabel='返回任务列表'
				description='这个任务不存在，或者当前已经不可见。'
				onAction={() =>
					void navigate({
						to: openSection(scope, 'tasks', scope.type === 'space' ? scope.spaceId : null) as never,
					})
				}
				title='任务不存在'
			/>
		)
	}

	return <TaskPageLoaded isReadOnly={isReadOnly} projects={projects} spaces={spaces} task={task} />
}

type TaskPageLoadedProps = {
	task: TaskDetail
	projects: ProjectOption[]
	spaces: Space[]
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
					settingsSection: null,
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
							<TaskPageMainContent
								autosave={autosave}
								isReadOnly={isReadOnly}
								spaceId={task.spaceId}
								taskId={task.id}
							/>
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

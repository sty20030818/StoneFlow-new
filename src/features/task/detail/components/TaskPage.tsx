import { useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'

import { openSection } from '@/app/navigation'
import type { Scope, TaskDetail } from '@/shared/types'
import { AppBreadcrumb } from '@/shared/components/AppBreadcrumb'
import { PageFrame } from '@/shared/components/page-frame'
import { resolveBreadcrumb } from '@/app/navigation'

import { type TaskDetailViewModel, useTaskDetailViewModel } from '../model/useTaskDetailViewModel'
import { TaskPageMain as TaskPageMainContent } from './TaskPageMain'
import { TaskPageSidebar as TaskPageSidebarContent } from './TaskPageSidebar'
import { TaskPageState } from './TaskPageState'
import { TaskAutosaveStatus } from './TaskAutosaveStatus'

type TaskPageProps = {
	taskId: string
	scope: Scope
}

export function TaskPage({ taskId, scope }: TaskPageProps) {
	const navigate = useNavigate({ from: '/' })
	const returnToTaskList = () => {
		void navigate({
			to: openSection(scope, 'tasks', scope.type === 'space' ? scope.spaceId : null) as never,
		})
	}
	const viewModel = useTaskDetailViewModel({ taskId, onClose: returnToTaskList })

	if (viewModel.status === 'loading') {
		return <TaskPageState description='正在读取任务数据。' title='加载任务详情' />
	}

	if (viewModel.status === 'error') {
		return (
			<TaskPageState
				actionLabel='返回任务列表'
				description={viewModel.error ?? '任务详情加载失败，请稍后重试。'}
				onAction={returnToTaskList}
				title='无法加载任务'
			/>
		)
	}

	if (!viewModel.task) {
		return (
			<TaskPageState
				actionLabel='返回任务列表'
				description='这个任务不存在，或者当前已经不可见。'
				onAction={returnToTaskList}
				title='任务不存在'
			/>
		)
	}

	return <TaskPageLoaded task={viewModel.task} viewModel={viewModel} />
}

type TaskPageLoadedProps = {
	task: TaskDetail
	viewModel: TaskDetailViewModel
}

function TaskPageLoaded({ task, viewModel }: TaskPageLoadedProps) {
	const isReadOnly = Boolean(task.deletedAt)
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
					isWorkPath: true,
				},
				taskDetail: {
					id: task.id,
					title: task.title,
					projectId: task.projectId,
					projectName: task.projectName,
				},
			}),
		[task],
	)

	return (
		<PageFrame.Root>
			<PageFrame.Header
				actions={
					<TaskAutosaveStatus error={viewModel.autosave.error} status={viewModel.autosave.status} />
				}
				breadcrumb={<AppBreadcrumb items={breadcrumbItems} />}
			/>
			<PageFrame.Body>
				<div className='mx-auto grid min-h-full w-full max-w-6xl gap-3 lg:grid-cols-[minmax(0,1fr)_18rem]'>
					<div className='min-w-0'>
						<TaskPageMainContent
							autosave={viewModel.autosave}
							isReadOnly={isReadOnly}
							spaceId={task.spaceId}
							taskId={task.id}
						/>
					</div>
					<aside className='min-w-0'>
						<div className='flex flex-col gap-3 lg:sticky lg:top-0'>
							<TaskPageSidebarContent
								autosave={viewModel.autosave}
								isReadOnly={isReadOnly}
								projects={viewModel.projects}
								spaces={viewModel.spaces}
								task={task}
							/>
						</div>
					</aside>
				</div>
			</PageFrame.Body>
		</PageFrame.Root>
	)
}

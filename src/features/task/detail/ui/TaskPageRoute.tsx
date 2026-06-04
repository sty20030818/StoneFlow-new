import { useEffect, useMemo, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'

import { buildTaskDetailPath, useShellRoute } from '@/app/routing'
import { useSpaces } from '@/features/space/query'
import type { Scope, TaskDetail } from '@/shared/types'
import { getTaskDetail } from '@/features/task/api/tasks'
import { TaskPage } from './TaskPage'
import { TaskPageState } from './TaskPageState'

type RouteLoadState =
	| { kind: 'loading' }
	| { kind: 'ready'; task: TaskDetail | null }
	| { kind: 'error'; message: string }

export function TaskPageRoute() {
	const shellRoute = useShellRoute()
	const { spaceId: routeSpaceId, taskId = '' } = useParams()
	const [loadState, setLoadState] = useState<RouteLoadState>({ kind: 'loading' })
	const { spaces } = useSpaces()

	useEffect(() => {
		let cancelled = false
		setLoadState({ kind: 'loading' })

		void (async () => {
			try {
				const task = await getTaskDetail(taskId)
				if (!cancelled) {
					setLoadState({ kind: 'ready', task })
				}
			} catch (routeError) {
				if (!cancelled) {
					setLoadState({
						kind: 'error',
						message: routeError instanceof Error ? routeError.message : '任务详情加载失败',
					})
				}
			}
		})()

		return () => {
			cancelled = true
		}
	}, [taskId])

	const scope: Scope | null = useMemo(() => {
		const task = loadState.kind === 'ready' ? loadState.task : null
		if (!task) {
			return null
		}

		const hasVisibleSpace = spaces.some((space) => space.id === task.spaceId)
		if (!hasVisibleSpace) {
			return { type: 'all' }
		}

		return { type: 'space', spaceId: task.spaceId }
	}, [loadState, spaces])

	if (loadState.kind === 'loading') {
		return <TaskPageState description='正在解析任务所在空间并恢复详情页面。' title='加载中' />
	}

	if (loadState.kind === 'error') {
		return <TaskPageState description={loadState.message} pageTitle='任务详情' title='任务不可用' />
	}

	if (!scope || scope.type !== 'space') {
		return (
			<TaskPageState
				description='当前任务所属 Space 不可见，可能已被归档、删除，或当前账号无权访问。'
				pageTitle='任务详情'
				title='任务不可用'
			/>
		)
	}

	const canonicalPath = buildTaskDetailPath(scope.spaceId, taskId)
	if (shellRoute.pathname !== canonicalPath || routeSpaceId !== scope.spaceId) {
		return <Navigate replace to={canonicalPath} />
	}

	return <TaskPage taskId={taskId} scope={scope} />
}

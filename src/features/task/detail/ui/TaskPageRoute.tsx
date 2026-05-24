import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'

import { resolveShellSection } from '@/app/layouts/shell/config'
import { ShellLayout } from '@/app/layouts/shell/ShellLayout'
import type { ShellSectionKey } from '@/app/layouts/shell/types'
import { setActiveScope } from '@/features/space/api/spaces'
import {
	selectActiveSection,
	selectCurrentScopeType,
	selectCurrentSpaceId,
	useShellNavStore,
} from '@/app/layouts/shell/model/useShellNavStore'
import { selectSpaces, useSpaceStore } from '@/features/space/model/useSpaceStore'
import { useWorkspaceSync } from '@/features/workspace/model/useWorkspaceSync'
import type { Scope, TaskDetail } from '@/shared/types'
import { getTaskDetail } from '@/features/task/api/tasks'
import { TaskPage } from './TaskPage'
import { TaskPageState } from './TaskPageState'

const TASK_PAGE_SECTION: ShellSectionKey = 'allTasks'

type RouteLoadState =
	| { kind: 'loading' }
	| { kind: 'ready'; task: TaskDetail | null }
	| { kind: 'error'; message: string }

export function TaskPageRoute() {
	const { taskId = '' } = useParams()
	const [loadState, setLoadState] = useState<RouteLoadState>({ kind: 'loading' })
	const spaces = useSpaceStore(selectSpaces)
	const currentScopeType = useShellNavStore(selectCurrentScopeType)
	const currentSpaceId = useShellNavStore(selectCurrentSpaceId)
	const activeSection = useShellNavStore(selectActiveSection)
	const setCurrentScope = useShellNavStore((state) => state.setCurrentScope)
	const setActiveSection = useShellNavStore((state) => state.setActiveSection)

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

	useWorkspaceSync(scope ?? { type: 'all' })

	useEffect(() => {
		if (!scope) {
			return
		}

		const nextScopeType = scope.type
		const nextSpaceId = scope.type === 'space' ? scope.spaceId : null

		if (currentScopeType !== nextScopeType || currentSpaceId !== nextSpaceId) {
			setCurrentScope(nextScopeType, nextSpaceId)
		}

		if (activeSection !== TASK_PAGE_SECTION) {
			setActiveSection(TASK_PAGE_SECTION)
		}
	}, [activeSection, currentScopeType, currentSpaceId, scope, setActiveSection, setCurrentScope])

	useEffect(() => {
		if (!scope) {
			return
		}

		void setActiveScope(scope).catch((activeScopeError) => {
			console.error('task page active scope sync failed', {
				scope,
				error: activeScopeError,
			})
		})
	}, [scope])

	if (loadState.kind === 'loading') {
		return <TaskPageState description='正在解析任务所在空间并恢复详情页面。' title='加载中' />
	}

	if (loadState.kind === 'error') {
		return <TaskPage taskId={taskId} scope={{ type: 'all' }} />
	}

	if (!scope) {
		return <TaskPage taskId={taskId} scope={{ type: 'all' }} />
	}

	return (
		<ShellLayout
			activeSection={resolveShellSection('/spaces/all-tasks')}
			currentScope={scope}
			currentSpaceId={scope.type === 'space' ? scope.spaceId : null}
		>
			<TaskPage taskId={taskId} scope={scope} />
		</ShellLayout>
	)
}

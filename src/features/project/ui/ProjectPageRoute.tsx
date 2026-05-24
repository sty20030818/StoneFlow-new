import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'

import { buildProjectDetailPath, buildStartupFallbackPath, useShellRoute } from '@/app/routing'
import { getProjectDetail } from '@/features/project/api/projects'
import { ProjectPage } from '@/features/project/ui/ProjectPage'
import { selectSpaces, useSpaceStore } from '@/features/space/model/useSpaceStore'
import type { Scope, Project } from '@/shared/types'
import { TaskPageState } from '@/features/task/detail/ui/TaskPageState'

type RouteLoadState =
	| { kind: 'loading' }
	| { kind: 'ready'; project: Project | null }
	| { kind: 'error'; message: string }

export function ProjectPageRoute() {
	const shellRoute = useShellRoute()
	const navigate = useNavigate()
	const { spaceId: routeSpaceId, projectId = '' } = useParams()
	const [loadState, setLoadState] = useState<RouteLoadState>({ kind: 'loading' })
	const spaces = useSpaceStore(selectSpaces)

	useEffect(() => {
		let cancelled = false
		setLoadState({ kind: 'loading' })

		void (async () => {
			try {
				const project = await getProjectDetail(projectId)
				if (!cancelled) {
					setLoadState({ kind: 'ready', project })
				}
			} catch (routeError) {
				if (!cancelled) {
					setLoadState({
						kind: 'error',
						message: routeError instanceof Error ? routeError.message : '项目详情加载失败',
					})
				}
			}
		})()

		return () => {
			cancelled = true
		}
	}, [projectId])

	const scope: Scope | null = useMemo(() => {
		const project = loadState.kind === 'ready' ? loadState.project : null
		if (!project) {
			return null
		}

		const hasVisibleSpace = spaces.some((space) => space.id === project.spaceId)
		if (!hasVisibleSpace) {
			return { type: 'all' }
		}

		return { type: 'space', spaceId: project.spaceId }
	}, [loadState, spaces])

	if (loadState.kind === 'loading') {
		return (
			<TaskPageState
				description='正在解析项目所在空间并恢复详情页面。'
				pageTitle='项目详情'
				title='加载中'
			/>
		)
	}

	if (loadState.kind === 'error') {
		return (
			<TaskPageState
				actionLabel='返回工作区'
				description={loadState.message}
				onAction={() => {
					navigate(buildStartupFallbackPath(), { replace: true })
				}}
				pageTitle='项目详情'
				title='项目不可用'
			/>
		)
	}

	if (!scope || scope.type !== 'space') {
		return (
			<TaskPageState
				actionLabel='返回工作区'
				description='当前项目不可见，可能已被归档、删除，或当前账号无权访问。'
				onAction={() => {
					navigate(buildStartupFallbackPath(), { replace: true })
				}}
				pageTitle='项目详情'
				title='项目不可用'
			/>
		)
	}

	const canonicalPath = buildProjectDetailPath(scope.spaceId, projectId)
	if (shellRoute.pathname !== canonicalPath || routeSpaceId !== scope.spaceId) {
		return <Navigate replace to={canonicalPath} />
	}

	return <ProjectPage scopeOverride={scope} />
}

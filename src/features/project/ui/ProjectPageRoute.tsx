import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { buildStartupFallbackPath } from '@/app/routing'
import { ShellLayout } from '@/app/layouts/shell/ShellLayout'
import type { ShellSectionKey } from '@/app/layouts/shell/types'
import {
	selectActiveSection,
	selectCurrentScopeType,
	selectCurrentSpaceId,
	useShellNavStore,
} from '@/app/layouts/shell/model/useShellNavStore'
import { getProjectDetail } from '@/features/project/api/projects'
import { ProjectPage } from '@/features/project/ui/ProjectPage'
import { setActiveScope } from '@/features/space/api/spaces'
import { selectSpaces, useSpaceStore } from '@/features/space/model/useSpaceStore'
import { useWorkspaceSync } from '@/features/workspace/model/useWorkspaceSync'
import type { Scope, Project } from '@/shared/types'
import { TaskPageState } from '@/features/task/detail/ui/TaskPageState'

const PROJECT_PAGE_SECTION: ShellSectionKey = 'project'

type RouteLoadState =
	| { kind: 'loading' }
	| { kind: 'ready'; project: Project | null }
	| { kind: 'error'; message: string }

export function ProjectPageRoute() {
	const navigate = useNavigate()
	const { projectId = '' } = useParams()
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

		if (activeSection !== PROJECT_PAGE_SECTION) {
			setActiveSection(PROJECT_PAGE_SECTION)
		}
	}, [activeSection, currentScopeType, currentSpaceId, scope, setActiveSection, setCurrentScope])

	useEffect(() => {
		if (!scope) {
			return
		}

		void setActiveScope(scope).catch((activeScopeError) => {
			console.error('project page active scope sync failed', {
				scope,
				error: activeScopeError,
			})
		})
	}, [scope])

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

	if (!scope) {
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

	return (
		<ShellLayout
			activeSection={PROJECT_PAGE_SECTION}
			currentScope={scope}
			currentSpaceId={scope.type === 'space' ? scope.spaceId : null}
		>
			<ProjectPage scopeOverride={scope} />
		</ShellLayout>
	)
}

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { EntityScene } from '@/app/layouts/entity-scene'
import { MainCard } from '@/app/layouts/main-card/MainCardLayout'
import { buildScopedProjectPath, getScopeLabel } from '@/app/layouts/shell/config'
import { useDialogStore } from '@/app/layouts/shell/model/useDialogStore'
import type { ProjectOverviewViewKey } from '@/features/project/model/types'
import { selectProjectOverview, useProjectStore } from '@/features/project/model/useProjectStore'
import { useScopeRoute } from '@/features/space/model/scopeRoute'
import { selectSpaces, useSpaceStore } from '@/features/space/model/useSpaceStore'
import { selectProjectViews, useViewStore } from '@/features/view/model/useViewStore'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbList,
	BreadcrumbPage,
} from '@/shared/ui/base/breadcrumb'
import { BoxIcon, PlusIcon } from 'lucide-react'

export function ProjectOverviewPage() {
	const navigate = useNavigate()
	const { scope, spaceId } = useScopeRoute()
	const spaces = useSpaceStore(selectSpaces)
	const overview = useProjectStore(selectProjectOverview)
	const loadOverview = useProjectStore((state) => state.loadOverview)
	const projectViews = useViewStore(selectProjectViews)
	const loadProjectViews = useViewStore((state) => state.loadProjectViews)
	const completeProject = useProjectStore((state) => state.completeProject)
	const reopenProject = useProjectStore((state) => state.reopenProject)
	const archiveProject = useProjectStore((state) => state.archiveProject)
	const deleteProject = useProjectStore((state) => state.deleteProject)
	const openProjectCreateDialog = useDialogStore((state) => state.openProjectCreateDialog)
	const [viewKey, setViewKey] = useState<ProjectOverviewViewKey>('active_projects')
	const [busyProjectId, setBusyProjectId] = useState<string | null>(null)
	const scopeKey = scope.type === 'all' ? 'all' : `space:${scope.spaceId}`
	const visibleProjectViews = projectViews.items.filter((view) => view.isVisible)

	useEffect(() => {
		void loadProjectViews()
	}, [loadProjectViews])

	useEffect(() => {
		if (visibleProjectViews.length === 0) {
			return
		}

		const matched = visibleProjectViews.find((view) => view.key === viewKey || view.id === viewKey)
		if (matched) {
			return
		}

		setViewKey((visibleProjectViews[0].key ?? visibleProjectViews[0].id) as ProjectOverviewViewKey)
	}, [viewKey, visibleProjectViews])

	useEffect(() => {
		void loadOverview(scope, viewKey)
	}, [loadOverview, scope, scopeKey, viewKey])

	async function runRowAction(projectId: string, runner: () => Promise<unknown>) {
		setBusyProjectId(projectId)
		try {
			await runner()
		} finally {
			setBusyProjectId(null)
		}
	}

	return (
		<EntityScene
			board={{
				boardKind: 'project',
				boardConfig: {
					variant: 'overview',
					emptyActionLabel: '创建项目',
					emptyDescription: `当前 Scope：${getScopeLabel(scope, spaces)}。这里还没有满足当前筛选条件的项目。`,
					emptyTitle: getProjectOverviewEmptyTitle(viewKey),
				},
				boardData: {
					items: overview.items,
					status: overview.status,
					busyProjectId,
				},
				boardActions: {
					onArchiveProject: (projectId) => {
						void runRowAction(projectId, async () => {
							await archiveProject(projectId)
						})
					},
					onCompleteProject: (projectId) => {
						void runRowAction(projectId, async () => {
							await completeProject(projectId)
						})
					},
					onDeleteProject: (projectId) => {
						void runRowAction(projectId, async () => {
							await deleteProject(projectId)
						})
					},
					onEmptyAction: () => openProjectCreateDialog(),
					onOpenProject: (projectId) => navigate(buildScopedProjectPath(scope, projectId, spaceId)),
					onReopenProject: (projectId) => {
						void runRowAction(projectId, async () => {
							await reopenProject(projectId)
						})
					},
				},
			}}
			breadcrumb={<ProjectOverviewBreadcrumb />}
			headerActions={
				<MainCard.GhostAction aria-label='创建项目' onClick={() => openProjectCreateDialog()}>
					<PlusIcon />
				</MainCard.GhostAction>
			}
			onRefresh={() => {
				void loadOverview(scope, viewKey)
			}}
			sceneVariant='project-overview'
			toolbarPills={visibleProjectViews.map((view) => ({
				active: (view.key ?? view.id) === viewKey,
				label: view.name,
				onClick: () => setViewKey((view.key ?? view.id) as ProjectOverviewViewKey),
			}))}
		/>
	)
}

function ProjectOverviewBreadcrumb() {
	return (
		<Breadcrumb>
			<BreadcrumbList className='text-sm font-semibold leading-5'>
				<BreadcrumbItem>
					<BreadcrumbPage className='inline-flex items-center gap-1.5'>
						<BoxIcon aria-hidden className='size-4 shrink-0 text-(--sf-color-text-tertiary)' />
						项目总览
					</BreadcrumbPage>
				</BreadcrumbItem>
			</BreadcrumbList>
		</Breadcrumb>
	)
}

function getProjectOverviewEmptyTitle(viewKey: ProjectOverviewViewKey) {
	switch (viewKey) {
		case 'completed':
		case 'completed_projects':
			return '当前没有已完成项目'
		case 'archived':
		case 'archived_projects':
			return '当前没有已归档项目'
		case 'all':
		case 'all_projects':
			return '当前 Scope 还没有项目'
		default:
			return '当前没有活跃项目'
	}
}

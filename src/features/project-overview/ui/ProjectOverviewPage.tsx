import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { buildScopedProjectPath, buildScopedSectionPath, getScopeLabel } from '@/app/layouts/shell/config'
import {
	MainCardGhostAction,
	MainCardHeader,
	MainCardLayout,
	MainCardToolbar,
} from '@/app/layouts/main-card/MainCardLayout'
import { useDialogStore } from '@/app/layouts/shell/model/useDialogStore'
import type { ProjectOverviewViewKey } from '@/features/project/model/types'
import { ProjectOverviewEmptyState } from '@/features/project-overview/ui/ProjectOverviewEmptyState'
import { ProjectOverviewList } from '@/features/project-overview/ui/ProjectOverviewList'
import { selectProjectOverview, useProjectStore } from '@/features/project/model/useProjectStore'
import { useScopeRoute } from '@/features/space/model/scopeRoute'
import { selectSpaces, useSpaceStore } from '@/features/space/model/useSpaceStore'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbList,
	BreadcrumbPage,
} from '@/shared/ui/base/breadcrumb'
import { BoxIcon, Layers3Icon, PlusIcon } from 'lucide-react'

const PROJECT_OVERVIEW_TABS: Array<{ key: ProjectOverviewViewKey; label: string }> = [
	{ key: 'active', label: 'Active' },
	{ key: 'completed', label: 'Completed' },
	{ key: 'archived', label: 'Archived' },
	{ key: 'all', label: 'All' },
]

export function ProjectOverviewPage() {
	const navigate = useNavigate()
	const { scope, spaceId } = useScopeRoute()
	const spaces = useSpaceStore(selectSpaces)
	const overview = useProjectStore(selectProjectOverview)
	const loadOverview = useProjectStore((state) => state.loadOverview)
	const completeProject = useProjectStore((state) => state.completeProject)
	const reopenProject = useProjectStore((state) => state.reopenProject)
	const archiveProject = useProjectStore((state) => state.archiveProject)
	const deleteProject = useProjectStore((state) => state.deleteProject)
	const openProjectCreateDialog = useDialogStore((state) => state.openProjectCreateDialog)
	const [viewKey, setViewKey] = useState<ProjectOverviewViewKey>('active')
	const [busyProjectId, setBusyProjectId] = useState<string | null>(null)
	const scopeKey = scope.type === 'all' ? 'all' : `space:${scope.spaceId}`

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
		<MainCardLayout
			header={
				<MainCardHeader
					action={
						<MainCardGhostAction aria-label='创建项目' onClick={() => openProjectCreateDialog()}>
							<PlusIcon />
						</MainCardGhostAction>
					}
					breadcrumb={<ProjectOverviewBreadcrumb />}
				/>
			}
			toolbar={
				<MainCardToolbar
					onRefresh={() => {
						void loadOverview(scope, viewKey)
					}}
					pills={PROJECT_OVERVIEW_TABS.map((tab) => ({
						active: tab.key === viewKey,
						label: tab.label,
						onClick: () => setViewKey(tab.key),
					}))}
				/>
			}
		>
			<div className='flex min-h-0 flex-1 flex-col gap-3'>
				<button
					className='flex items-center justify-between gap-4 rounded-2xl border border-(--sf-color-border-subtle) bg-white/80 px-4 py-3 text-left shadow-none transition-colors hover:border-(--sf-color-border-secondary) hover:bg-(--sf-color-bg-surface-muted)'
					onClick={() => navigate(buildScopedSectionPath(scope, 'no-project', spaceId))}
					type='button'
				>
					<div className='flex items-center gap-3'>
						<span className='inline-flex size-9 items-center justify-center rounded-xl bg-(--sf-color-project-task-section-header) text-(--sf-color-text-secondary)'>
							<Layers3Icon className='size-4' />
						</span>
						<div className='min-w-0'>
							<p className='text-sm font-semibold text-foreground'>独立事项</p>
							<p className='text-[12px] text-(--sf-color-text-tertiary)'>
								查看已经离开收件箱、但尚未归属到任何项目的任务。
							</p>
						</div>
					</div>
					<span className='rounded-md border border-(--sf-color-border-subtle) bg-white px-3 py-1.5 text-[12px] font-medium text-foreground'>
						打开
					</span>
				</button>
				{overview.status === 'ready' && overview.items.length === 0 ? (
					<ProjectOverviewEmptyState
						onCreateProject={() => openProjectCreateDialog()}
						scopeLabel={getScopeLabel(scope, spaces)}
						viewKey={viewKey}
					/>
				) : (
					<ProjectOverviewList
						busyProjectId={busyProjectId}
						items={overview.items}
						onArchive={(projectId) => {
							void runRowAction(projectId, async () => {
								await archiveProject(projectId)
							})
						}}
						onComplete={(projectId) => {
							void runRowAction(projectId, async () => {
								await completeProject(projectId)
							})
						}}
						onDelete={(projectId) => {
							void runRowAction(projectId, async () => {
								await deleteProject(projectId)
							})
						}}
						onOpen={(projectId) => navigate(buildScopedProjectPath(scope, projectId, spaceId))}
						onReopen={(projectId) => {
							void runRowAction(projectId, async () => {
								await reopenProject(projectId)
							})
						}}
						status={overview.status}
					/>
				)}
			</div>
		</MainCardLayout>
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

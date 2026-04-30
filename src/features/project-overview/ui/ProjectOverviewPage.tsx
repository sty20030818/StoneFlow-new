import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { buildScopedProjectPath, getScopeLabel } from '@/app/layouts/shell/config'
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
import { ProjectOverviewTabs } from '@/features/project-overview/ui/ProjectOverviewTabs'
import { selectProjectOverview, useProjectStore } from '@/features/project/model/useProjectStore'
import { useScopeRoute } from '@/features/space/model/scopeRoute'
import { selectSpaces, useSpaceStore } from '@/features/space/model/useSpaceStore'
import { StatusNotice } from '@/shared/ui/StatusNotice'
import { PlusIcon } from 'lucide-react'

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
					title='Project Overview'
				/>
			}
			toolbar={
				<MainCardToolbar
					left={<ProjectOverviewTabs onChange={setViewKey} value={viewKey} />}
					onRefresh={() => {
						void loadOverview(scope, viewKey)
					}}
				/>
			}
		>
			<div className='flex min-h-0 flex-1 flex-col gap-3'>
				{overview.error ? (
					<StatusNotice role='alert' size='sm' variant='danger'>
						{overview.error}
					</StatusNotice>
				) : (
					<StatusNotice size='sm'>
						当前 Scope：{getScopeLabel(scope, spaces)}。Active / Completed / Archived / All
						全部来自真实 Project 数据。
					</StatusNotice>
				)}

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

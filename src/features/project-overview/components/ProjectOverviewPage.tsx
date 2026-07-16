import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'

import { EntityScene } from '@/layout/entity-scene'
import { MainCard } from '@/shared/components/main-card/MainCardLayout'
import { useCurrentShellRoute } from '@/layout/model/ShellRouteContext'
import { openProjectDetail } from '@/app/navigation/intents'
import { resolveShellRouteScope } from '@/app/navigation/scope'
import {
	BulkActionBar,
	PROJECT_BULK_ACTION_IDS,
	createProjectBulkSelectionSnapshotFromProjects,
	shouldClearBulkSelection,
	showBulkActionResultToast,
	useBulkActionContext,
	type BulkActionId,
} from '@/features/bulk-action'
import { Button } from '@/shared/components/base/button'
import { BULK_ACTION_BUTTON_CLASS } from '@/shared/components/patterns/bulk-action'
import { useDialogStore } from '@/layout/model/useDialogStore'
import type { ProjectOverviewViewKey } from '@/features/project/model/types'
import {
	useArchiveProjectMutation,
	useCompleteProjectMutation,
	useDeleteProjectMutation,
	useProjectOverviewData,
	useReopenProjectMutation,
} from '@/features/project/hooks'
import {
	buildProjectCommandSelection,
	useEntitySelection,
	useEntitySelectionEscape,
	useRegisterCommandSelection,
} from '@/features/selection/model'
import { AppBreadcrumb } from '@/shared/components/AppBreadcrumb'
import { resolveBreadcrumb } from '@/app/navigation/breadcrumbResolver'
import { useViewsQuery } from '@/features/view/hooks'
import { PlusIcon } from 'lucide-react'

export function ProjectOverviewPage() {
	const navigate = useNavigate({ from: '/' })
	const shellRoute = useCurrentShellRoute()
	const scope = resolveShellRouteScope(shellRoute)
	const spaceId = shellRoute.spaceId
	const { runBulkAction } = useBulkActionContext()
	const openProjectCreateDialog = useDialogStore((state) => state.openProjectCreateDialog)
	const [viewKey, setViewKey] = useState<ProjectOverviewViewKey>('all_projects')
	const [busyProjectId, setBusyProjectId] = useState<string | null>(null)
	const breadcrumbItems = useMemo(() => resolveBreadcrumb({ route: shellRoute }), [shellRoute])
	const overview = useProjectOverviewData(scope, viewKey)
	const projectViewsQuery = useViewsQuery('project', false)
	const completeProject = useCompleteProjectMutation()
	const reopenProject = useReopenProjectMutation()
	const archiveProject = useArchiveProjectMutation()
	const deleteProject = useDeleteProjectMutation()
	const overviewStatus = overview.status
	const overviewItems = overview.items
	const {
		selectedIdSet: selectedProjectIds,
		selectionSnapshot,
		selectedCount,
		focusedId: focusedProjectId,
		toggleSelection: toggleProjectSelection,
		clearSelection: clearProjectSelection,
		setFocusedId: setFocusedProjectId,
		moveFocus,
		selectIds: selectProjectIds,
	} = useEntitySelection(overviewItems.map((item) => item.id))
	const selectedProjects = useMemo(
		() => overviewItems.filter((project) => selectedProjectIds.has(project.id)),
		[overviewItems, selectedProjectIds],
	)
	const commandSelection = useMemo(
		() =>
			buildProjectCommandSelection({
				selectedIds: selectionSnapshot.ids,
				projects: overviewItems,
				clearSelection: clearProjectSelection,
			}),
		[clearProjectSelection, overviewItems, selectionSnapshot.ids],
	)
	useRegisterCommandSelection(commandSelection)
	useEntitySelectionEscape({
		hasSelection: selectedCount > 0,
		clearSelection: clearProjectSelection,
	})
	const visibleProjectViews = (projectViewsQuery.data ?? []).filter((view) => view.isVisible)

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

	async function runRowAction(projectId: string, runner: () => Promise<unknown>) {
		setBusyProjectId(projectId)
		try {
			await runner()
		} finally {
			setBusyProjectId(null)
		}
	}

	const runProjectBulkAction = useCallback(
		async (actionId: BulkActionId) => {
			const result = await runBulkAction(
				actionId,
				createProjectBulkSelectionSnapshotFromProjects(selectedProjects, 'bulk-bar'),
			)
			if (shouldClearBulkSelection(result)) {
				clearProjectSelection()
			}
			showBulkActionResultToast(result, { successVerb: '处理', entityLabel: '项目' })
		},
		[clearProjectSelection, runBulkAction, selectedProjects],
	)

	return (
		<EntityScene
			board={{
				boardKind: 'project',
				boardConfig: {
					variant: 'overview',
					emptyActionLabel: '创建项目',
					emptyDescription:
						'这里还没有项目，可以先从一个项目开始。点「创建项目」先建起来，后面的任务和节奏就有地方承接了。',
					emptyTitle: '当前没有项目',
				},
				boardData: {
					items: overviewItems,
					status: overviewStatus,
					busyProjectId,
					selectedProjectIds,
					focusedProjectId,
				},
				boardActions: {
					onToggleProjectSelection: toggleProjectSelection,
					onSetFocusedProject: setFocusedProjectId,
					onMoveProjectFocus: moveFocus,
					onClearProjectSelection: clearProjectSelection,
					onArchiveProject: (projectId) => {
						void runRowAction(projectId, async () => {
							await archiveProject.mutateAsync(projectId)
						})
					},
					onCompleteProject: (projectId) => {
						void runRowAction(projectId, async () => {
							await completeProject.mutateAsync(projectId)
						})
					},
					onDeleteProject: (projectId) => {
						void runRowAction(projectId, async () => {
							await deleteProject.mutateAsync(projectId)
						})
					},
					onEmptyAction: () => openProjectCreateDialog(),
					onOpenProject: (projectId) =>
						void navigate({
							to: openProjectDetail(projectId, { scope, fallbackSpaceId: spaceId }) as never,
						}),
					onSelectAllProjects: selectProjectIds,
					onReopenProject: (projectId) => {
						void runRowAction(projectId, async () => {
							await reopenProject.mutateAsync(projectId)
						})
					},
				},
			}}
			breadcrumb={<AppBreadcrumb items={breadcrumbItems} />}
			bulkBar={
				<BulkActionBar
					action={
						<ProjectBulkBarActions
							onArchive={() => {
								void runProjectBulkAction(PROJECT_BULK_ACTION_IDS.archiveSelected)
							}}
							onDelete={() => {
								void runProjectBulkAction(PROJECT_BULK_ACTION_IDS.deleteSelected)
							}}
						/>
					}
					onClear={clearProjectSelection}
					selectedCount={selectedCount}
				/>
			}
			headerActions={
				<MainCard.GhostAction aria-label='创建项目' onClick={() => openProjectCreateDialog()}>
					<PlusIcon />
				</MainCard.GhostAction>
			}
			sceneVariant='project-overview'
			toolbarPills={[
				{
					active: viewKey === 'all_projects',
					label: '所有项目',
					onClick: () => setViewKey('all_projects'),
				},
				...visibleProjectViews.map((view) => ({
					active: (view.key ?? view.id) === viewKey,
					label: view.name,
					onClick: () => setViewKey((view.key ?? view.id) as ProjectOverviewViewKey),
				})),
			]}
		/>
	)
}

function ProjectBulkBarActions({
	onArchive,
	onDelete,
}: {
	onArchive: () => void
	onDelete: () => void
}) {
	return (
		<div className='flex items-center gap-2'>
			<Button
				className={BULK_ACTION_BUTTON_CLASS}
				onClick={onArchive}
				size='sm'
				type='button'
				variant='outline'
			>
				归档
			</Button>
			<Button
				className={BULK_ACTION_BUTTON_CLASS}
				onClick={onDelete}
				size='sm'
				type='button'
				variant='destructive'
			>
				删除
			</Button>
		</div>
	)
}

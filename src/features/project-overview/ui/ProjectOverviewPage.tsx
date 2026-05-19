import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { EntityScene } from '@/app/layouts/entity-scene'
import { MainCard } from '@/app/layouts/main-card/MainCardLayout'
import {
	BulkActionBar,
	PROJECT_BULK_ACTION_IDS,
	createProjectBulkSelectionSnapshotFromProjects,
	shouldClearBulkSelection,
	showBulkActionResultToast,
	useBulkActionContext,
	type BulkActionId,
} from '@/features/bulk-action'
import { Button } from '@/shared/ui/base/button'
import { BULK_ACTION_BUTTON_CLASS } from '@/shared/ui/patterns/bulk-action'
import { buildScopedProjectPath, getScopeLabel } from '@/app/layouts/shell/config'
import { useDialogStore } from '@/app/layouts/shell/model/useDialogStore'
import type { ProjectOverviewViewKey } from '@/features/project/model/types'
import { selectProjectOverview, useProjectStore } from '@/features/project/model/useProjectStore'
import {
	buildProjectCommandSelection,
	useEntitySelection,
	useEntitySelectionEscape,
	useRegisterCommandSelection,
} from '@/features/selection/model'
import { useScopeRoute } from '@/features/space/model/scopeRoute'
import { selectSpaces, useSpaceStore } from '@/features/space/model/useSpaceStore'
import { selectProjectViews, useViewStore } from '@/features/view/model/useViewStore'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbList,
	BreadcrumbPage,
} from '@/shared/ui/base/breadcrumb'
import { breadcrumbLeadClass, breadcrumbLeadIconClass } from '@/shared/ui/patterns/breadcrumb'
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
	const { runBulkAction } = useBulkActionContext()
	const openProjectCreateDialog = useDialogStore((state) => state.openProjectCreateDialog)
	const [viewKey, setViewKey] = useState<ProjectOverviewViewKey>('all_projects')
	const [busyProjectId, setBusyProjectId] = useState<string | null>(null)
	const scopeKey = scope.type === 'all' ? 'all' : `space:${scope.spaceId}`
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
	} = useEntitySelection(overview.items.map((item) => item.id))
	const selectedProjects = useMemo(
		() => overview.items.filter((project) => selectedProjectIds.has(project.id)),
		[overview.items, selectedProjectIds],
	)
	const commandSelection = useMemo(
		() =>
			buildProjectCommandSelection({
				selectedIds: selectionSnapshot.ids,
				projects: overview.items,
				clearSelection: clearProjectSelection,
			}),
		[clearProjectSelection, overview.items, selectionSnapshot.ids],
	)
	useRegisterCommandSelection(commandSelection)
	useEntitySelectionEscape({
		hasSelection: selectedCount > 0,
		clearSelection: clearProjectSelection,
	})
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
					emptyDescription: `当前 Scope：${getScopeLabel(scope, spaces)}。这里还没有满足当前筛选条件的项目。`,
					emptyTitle: getProjectOverviewEmptyTitle(viewKey),
				},
				boardData: {
					items: overview.items,
					status: overview.status,
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
					onSelectAllProjects: selectProjectIds,
					onReopenProject: (projectId) => {
						void runRowAction(projectId, async () => {
							await reopenProject(projectId)
						})
					},
				},
			}}
			breadcrumb={<ProjectOverviewBreadcrumb />}
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
			onRefresh={() => {
				void loadOverview(scope, viewKey)
			}}
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

function ProjectOverviewBreadcrumb() {
	return (
		<Breadcrumb>
			<BreadcrumbList className='text-sm font-semibold leading-5'>
				<BreadcrumbItem>
					<BreadcrumbPage className={breadcrumbLeadClass}>
						<BoxIcon aria-hidden className={breadcrumbLeadIconClass} />
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

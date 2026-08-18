import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'

import {
	openProjectDetail,
	resolveBreadcrumb,
	resolveShellRouteScope,
	useCurrentShellRoute,
} from '@/app/navigation'
import { useDialogStore } from '@/features/shell-dialogs'
import type { ProjectOverviewViewKey } from '@/features/project'
import {
	buildProjectCommandSelection,
	type ProjectBoardProps,
	useArchiveProjectMutation,
	useCompleteProjectMutation,
	useDeleteProjectMutation,
	useProjectOverviewData,
	useReopenProjectMutation,
} from '@/features/project'
import { useEntitySelection, useRegisterCommandSelection } from '@/features/selection'

/**
 * 项目总览页唯一 wiring：视图轨 / 命令选择上下文 / 行动作。
 * 数据与 mutation 只走 project public；不 import layout。
 */
export function useProjectOverviewScene() {
	const navigate = useNavigate({ from: '/' })
	const shellRoute = useCurrentShellRoute()
	const scope = resolveShellRouteScope(shellRoute)
	const spaceId = shellRoute.spaceId
	const openProjectCreateDialog = useDialogStore((state) => state.openProjectCreateDialog)
	const [viewKey, setViewKey] = useState<ProjectOverviewViewKey>('all_projects')
	const [busyProjectId, setBusyProjectId] = useState<string | null>(null)
	const breadcrumbItems = useMemo(() => resolveBreadcrumb({ route: shellRoute }), [shellRoute])
	const overview = useProjectOverviewData(scope, viewKey)
	const completeProject = useCompleteProjectMutation()
	const reopenProject = useReopenProjectMutation()
	const archiveProject = useArchiveProjectMutation()
	const deleteProject = useDeleteProjectMutation()
	const overviewStatus = overview.status
	const overviewItems = overview.items
	const {
		selectedIdSet: selectedProjectIds,
		selectionSnapshot,
		focusedId: focusedProjectId,
		toggleSelection: toggleProjectSelection,
		clearSelection: clearProjectSelection,
		setFocusedId: setFocusedProjectId,
		moveFocus,
		selectIds: selectProjectIds,
	} = useEntitySelection(overviewItems.map((item) => item.id))
	const commandSelection = useMemo(
		() =>
			buildProjectCommandSelection({
				selectedIds: selectionSnapshot.ids,
				projects: overviewItems,
				clearSelection: clearProjectSelection,
			}),
		[clearProjectSelection, overviewItems, selectionSnapshot.ids],
	)
	const readCommandSelection = useCallback(() => commandSelection, [commandSelection])
	useRegisterCommandSelection(readCommandSelection)
	async function runRowAction(projectId: string, runner: () => Promise<unknown>) {
		setBusyProjectId(projectId)
		try {
			await runner()
		} finally {
			setBusyProjectId(null)
		}
	}

	const projectBoardProps: ProjectBoardProps = {
		variant: 'overview',
		items: overviewItems,
		status: overviewStatus,
		busyProjectId,
		selectedProjectIds,
		focusedProjectId,
		emptyActionLabel: '创建项目',
		emptyDescription:
			'这里还没有项目，可以先从一个项目开始。点「创建项目」先建起来，后面的任务和节奏就有地方承接了。',
		emptyTitle: '当前没有项目',
		onToggleProjectSelection: toggleProjectSelection,
		onSetFocusedProject: setFocusedProjectId,
		onMoveProjectFocus: moveFocus,
		onClearProjectSelection: clearProjectSelection,
		onArchive: (projectId) => {
			void runRowAction(projectId, async () => {
				await archiveProject.mutateAsync(projectId)
			})
		},
		onComplete: (projectId) => {
			void runRowAction(projectId, async () => {
				await completeProject.mutateAsync(projectId)
			})
		},
		onDelete: (projectId) => {
			void runRowAction(projectId, async () => {
				await deleteProject.mutateAsync(projectId)
			})
		},
		onEmptyAction: () => openProjectCreateDialog(),
		onOpen: (projectId) =>
			void navigate({
				to: openProjectDetail(projectId, { scope, fallbackSpaceId: spaceId }) as never,
			}),
		onSelectAllProjects: selectProjectIds,
		onReopen: (projectId) => {
			void runRowAction(projectId, async () => {
				await reopenProject.mutateAsync(projectId)
			})
		},
	}

	const toolbarPills = [
		{
			active: viewKey === 'all_projects',
			label: '所有项目',
			onPress: () => setViewKey('all_projects'),
		},
	]

	return {
		breadcrumbItems,
		projectBoardProps,
		toolbarPills,
		openProjectCreateDialog: () => openProjectCreateDialog(),
	}
}

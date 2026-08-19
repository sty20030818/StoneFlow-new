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
	buildProjectSections,
	buildProjectCommandSelection,
	PROJECT_SECTION_ORDER,
	type ProjectBoardProps,
	useCompleteProjectMutation,
	useProjectOverviewData,
	useReopenProjectMutation,
} from '@/features/project'
import { useGroupedCollectionInteraction, useRegisterCommandSelection } from '@/features/selection'

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
	const overviewStatus = overview.status
	const overviewItems = overview.items
	const projectSections = useMemo(() => buildProjectSections(overviewItems), [overviewItems])
	const projectGroups = useMemo(
		() =>
			projectSections.map((section) => ({
				key: section.key,
				itemKeys: section.items.map((project) => project.id),
			})),
		[projectSections],
	)
	const projectCollection = useGroupedCollectionInteraction({
		groups: projectGroups,
		defaultOpenGroupKeys: PROJECT_SECTION_ORDER,
	})
	const selectedProjectIds = useMemo(
		() =>
			projectCollection.interaction.projection.eligibleKeys.filter((projectId) =>
				projectCollection.interaction.selectedKeys.has(projectId),
			),
		[
			projectCollection.interaction.projection.eligibleKeys,
			projectCollection.interaction.selectedKeys,
		],
	)
	const commandSelection = useMemo(
		() =>
			buildProjectCommandSelection({
				selectedIds: selectedProjectIds,
				projects: overviewItems,
				focusedProjectId: projectCollection.interaction.focusedKey,
				clearSelection: projectCollection.interaction.clearSelection,
			}),
		[
			overviewItems,
			projectCollection.interaction.clearSelection,
			projectCollection.interaction.focusedKey,
			selectedProjectIds,
		],
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
		sections: projectSections,
		collection: projectCollection,
		status: overviewStatus,
		busyProjectId,
		emptyActionLabel: '创建项目',
		emptyDescription:
			'这里还没有项目，可以先从一个项目开始。点「创建项目」先建起来，后面的任务和节奏就有地方承接了。',
		emptyTitle: '当前没有项目',
		onComplete: (projectId) => {
			void runRowAction(projectId, async () => {
				await completeProject.mutateAsync(projectId)
			})
		},
		onEmptyAction: () => openProjectCreateDialog(),
		onOpen: (projectId) =>
			void navigate({
				to: openProjectDetail(projectId, { scope, fallbackSpaceId: spaceId }) as never,
			}),
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

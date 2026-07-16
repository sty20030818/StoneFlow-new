import { useEffect, useMemo, useState } from 'react'

import type { Scope } from '@/shared/types'
import type { Space } from '@/shared/types'
import {
	selectCreateDialogType,
	selectCustomDateDialog,
	selectTaskCreateDraft,
	selectTaskCreatePresentation,
	useDialogStore,
} from '@/app/layouts/shell/model/useDialogStore'
import type { ProjectOption } from '@/features/project/model/types'

/**
 * 创建任务/项目弹窗相关状态。
 * selectedSpaceId 是弹窗内本地选择；打开时默认落到 currentScope / default space。
 */
export function useShellCreateDialogState({
	currentScope,
	spaces,
	projectOptions,
	sidebarProjectsLoading,
}: {
	currentScope: Scope
	spaces: Space[]
	projectOptions: ProjectOption[]
	/** 侧栏项目仍在加载时，带 projectId 的草稿需延迟挂载表单 */
	sidebarProjectsLoading: boolean
}) {
	const createDialogType = useDialogStore(selectCreateDialogType)
	const customDateDialog = useDialogStore(selectCustomDateDialog)
	const taskCreateDraft = useDialogStore(selectTaskCreateDraft)
	const taskCreatePresentation = useDialogStore(selectTaskCreatePresentation)
	const openTaskCreateDialog = useDialogStore((state) => state.openTaskCreateDialog)
	const openProjectCreateDialog = useDialogStore((state) => state.openProjectCreateDialog)
	const closeTaskCreateDialog = useDialogStore((state) => state.closeTaskCreateDialog)
	const closeProjectCreateDialog = useDialogStore((state) => state.closeProjectCreateDialog)
	const closeCustomDateDialog = useDialogStore((state) => state.closeCustomDateDialog)
	const toggleTaskCreatePresentation = useDialogStore((state) => state.toggleTaskCreatePresentation)

	/** 创建弹窗 Header 当前选中的 Space（本地 UI 态，非 URL） */
	const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null)

	const defaultCreateSpaceId = useMemo(
		() =>
			currentScope.type === 'space'
				? currentScope.spaceId
				: (spaces.find((space) => space.isDefault)?.id ?? spaces[0]?.id ?? null),
		[currentScope, spaces],
	)

	useEffect(() => {
		if (!createDialogType) {
			setSelectedSpaceId(null)
			return
		}
		setSelectedSpaceId((current) => current ?? defaultCreateSpaceId)
	}, [createDialogType, defaultCreateSpaceId])

	const hasResolvedTaskDraftProject =
		Boolean(taskCreateDraft.projectId) &&
		projectOptions.some((project) => project.id === taskCreateDraft.projectId)

	/** 草稿带了 projectId 但选项列表尚未含该项目时，推迟打开避免空表单闪烁 */
	const shouldDelayTaskCreateDialog =
		createDialogType === 'task' &&
		Boolean(taskCreateDraft.projectId) &&
		!hasResolvedTaskDraftProject &&
		sidebarProjectsLoading

	return {
		createDialogType,
		customDateDialog,
		taskCreateDraft,
		taskCreatePresentation,
		selectedSpaceId,
		setSelectedSpaceId,
		defaultCreateSpaceId,
		shouldDelayTaskCreateDialog,
		openTaskCreateDialog,
		openProjectCreateDialog,
		closeTaskCreateDialog,
		closeProjectCreateDialog,
		closeCustomDateDialog,
		toggleTaskCreatePresentation,
	}
}

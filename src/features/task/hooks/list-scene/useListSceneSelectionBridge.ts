import { useMemo } from 'react'

import { useRegisterCommandSelection } from '@/features/selection'
import type { TaskListItem } from '@/shared/types'

import { buildTaskCommandSelection } from '../../model/buildTaskCommandSelection'
import { useRegisterTaskPreviewSource } from '@/features/task/detail'
import { useTaskSelection } from '../useTaskSelection'
import type { VariantConfig } from './variantConfig'

type UseListSceneSelectionBridgeArgs = {
	config: VariantConfig
	filteredTasks: TaskListItem[]
	selectionOrderIds: string[]
	activeTaskId: string | null
}

/**
 * selection + 命令板选中 + preview source 注册。
 */
export function useListSceneSelectionBridge({
	config,
	filteredTasks,
	selectionOrderIds,
	activeTaskId,
}: UseListSceneSelectionBridgeArgs) {
	const {
		selectedTaskIdSet,
		selectionSnapshot,
		selectedCount,
		focusedTaskId,
		toggleTaskSelection,
		clearTaskSelection,
		setFocusedTaskId,
		moveFocus,
		selectTaskIds,
	} = useTaskSelection(selectionOrderIds)

	const commandSelection = useMemo(
		() =>
			buildTaskCommandSelection({
				selectedIds: selectionSnapshot.ids,
				tasks: filteredTasks,
				fallbackSubtitle: config.fallbackSubtitle,
				focusedTaskId,
				clearSelection: clearTaskSelection,
			}),
		[
			clearTaskSelection,
			config.fallbackSubtitle,
			filteredTasks,
			focusedTaskId,
			selectionSnapshot.ids,
		],
	)
	useRegisterCommandSelection(commandSelection)

	const previewSource = useMemo(
		() => ({
			tasks: filteredTasks,
			focusedTaskId,
			activeTaskId,
		}),
		[activeTaskId, filteredTasks, focusedTaskId],
	)
	useRegisterTaskPreviewSource(previewSource)

	return {
		selectedTaskIdSet,
		selectedCount,
		focusedTaskId,
		toggleTaskSelection,
		clearTaskSelection,
		setFocusedTaskId,
		moveFocus,
		selectTaskIds,
	}
}

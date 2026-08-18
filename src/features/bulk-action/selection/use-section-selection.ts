import { useMemo } from 'react'

type UseSectionSelectionOptions = {
	sectionIds: string[]
	selectedIdSet?: ReadonlySet<string>
	onToggleSelection?: (id: string) => void
}

/**
 * 计算分区内选中状态，返回 selectedCount 和全选/取消全选处理器。
 */
export function useSectionSelection({
	sectionIds,
	selectedIdSet,
	onToggleSelection,
}: UseSectionSelectionOptions) {
	const selectedCount = useMemo(
		() => (selectedIdSet ? sectionIds.filter((id) => selectedIdSet.has(id)).length : 0),
		[sectionIds, selectedIdSet],
	)

	function handleSelectAll() {
		if (!onToggleSelection || !selectedIdSet) return
		for (const id of sectionIds) {
			if (!selectedIdSet.has(id)) onToggleSelection(id)
		}
	}

	function handleDeselectAll() {
		if (!onToggleSelection || !selectedIdSet) return
		for (const id of sectionIds) {
			if (selectedIdSet.has(id)) onToggleSelection(id)
		}
	}

	return { selectedCount, handleSelectAll, handleDeselectAll }
}

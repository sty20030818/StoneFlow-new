import { useMemo } from 'react'

import { useCollectionInteraction, type CollectionProjection } from '@/features/selection'

type TaskSelectionSnapshot = Readonly<{
	type: 'task'
	ids: readonly string[]
	idSet: ReadonlySet<string>
	count: number
	hasSelection: boolean
	isSingleSelection: boolean
	isMultiSelection: boolean
}>

/**
 * task 域对 collection interaction 的只读投影；不拥有第二份选择或焦点状态。
 */
export function useTaskSelection(projection: CollectionProjection<string>) {
	const interaction = useCollectionInteraction({
		eligibleKeys: projection.eligibleKeys,
		navigableKeys: projection.navigableKeys,
	})
	const selectionSnapshot = useMemo<TaskSelectionSnapshot>(() => {
		const ids = interaction.projection.eligibleKeys.filter((key) =>
			interaction.selectedKeys.has(key),
		)
		const count = ids.length

		return {
			type: 'task',
			ids,
			idSet: new Set(ids),
			count,
			hasSelection: count > 0,
			isSingleSelection: count === 1,
			isMultiSelection: count > 1,
		}
	}, [interaction.projection.eligibleKeys, interaction.selectedKeys])

	return {
		interaction,
		selectionSnapshot,
		selectedCount: selectionSnapshot.count,
	}
}

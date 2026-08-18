import { createCollectionProjection, type CollectionProjection } from '@/features/selection'

import type { TaskBoardFlatItem } from './taskBoardModel'

export type TaskBoardCollection = Readonly<{
	projection: CollectionProjection<string>
	flatIndexByKey: ReadonlyMap<string, number>
	rowKeysByGroupKey: ReadonlyMap<string, ReadonlySet<string>>
}>

/**
 * 从 TaskBoard 已有 flat 顺序派生逻辑 collection；不拥有选择状态或虚拟几何。
 */
export function buildTaskBoardCollection({
	eligibleKeys,
	flatItems,
}: {
	eligibleKeys: readonly string[]
	flatItems: readonly TaskBoardFlatItem[]
}): TaskBoardCollection {
	const navigableKeys: string[] = []
	const flatIndexByKey = new Map<string, number>()
	const rowKeysByGroupKey = new Map<string, Set<string>>()
	let currentGroupRowKeys: Set<string> | null = null

	for (const [index, item] of flatItems.entries()) {
		if (flatIndexByKey.has(item.key)) {
			throw new Error(`flatItems 包含重复 key：${item.key}`)
		}
		flatIndexByKey.set(item.key, index)

		if (item.kind === 'header') {
			currentGroupRowKeys = new Set()
			rowKeysByGroupKey.set(item.key, currentGroupRowKeys)
			continue
		}

		navigableKeys.push(item.key)
		currentGroupRowKeys?.add(item.key)
	}

	return {
		projection: createCollectionProjection(eligibleKeys, navigableKeys),
		flatIndexByKey,
		rowKeysByGroupKey,
	}
}

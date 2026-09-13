/**
 * Task Board 纯模型：flat 索引、内容总高、sticky 顶替。
 * 无 React / DOM；几何与 UI 解耦，单测主战场。
 */

import type { TaskListItem, TaskStatus } from '@/shared/types'
import type { TaskDisplaySection } from '@/features/display-options'

import {
	COLLECTION_ITEM_GAP,
	COLLECTION_ROW_HEIGHT,
	COLLECTION_ROW_STRIDE,
	COLLECTION_SECTION_HEADER_HEIGHT,
	COLLECTION_SECTION_HEADER_STRIDE,
} from '@/shared/components/collectionGeometry'

export type TaskBoardFlatHeader = {
	kind: 'header'
	key: string
	label: string
	count: number
	status?: TaskStatus
	parentKey: string | null
	parentLabel: string | null
	open: boolean
	/** 当前组的全部已加载成员，折叠只影响行的可见性。 */
	tasks: readonly TaskListItem[]
}

export type TaskBoardFlatRow = {
	kind: 'row'
	key: string
	task: TaskListItem
}

export type TaskBoardFlatItem = TaskBoardFlatHeader | TaskBoardFlatRow

export type BuildTaskBoardFlatItemsInput = {
	sections: readonly TaskDisplaySection[]
	collapsedGroupKeys?: readonly string[]
}

/** 只将唯一分组投影展平为虚拟项；不重新分类或排序任务。 */
export function buildTaskBoardFlatItems({
	sections,
	collapsedGroupKeys = [],
}: BuildTaskBoardFlatItemsInput): TaskBoardFlatItem[] {
	const items: TaskBoardFlatItem[] = []
	const collapsed = new Set(collapsedGroupKeys)
	const appendHeader = (section: TaskDisplaySection, parent: TaskDisplaySection | null) => {
		const key = `h:${section.key}`
		const open = !collapsed.has(key)
		items.push({
			kind: 'header',
			key,
			label: section.label,
			count: section.totalCount,
			status: section.status,
			parentKey: parent ? `h:${parent.key}` : null,
			parentLabel: parent?.label ?? null,
			open,
			tasks: section.tasks,
		})
		return open
	}
	for (const section of sections) {
		if (!appendHeader(section, null)) continue
		if (section.children) {
			for (const child of section.children) {
				if (!appendHeader(child, section)) continue
				for (const task of child.tasks) items.push({ kind: 'row', key: task.id, task })
			}
		} else {
			for (const task of section.tasks) items.push({ kind: 'row', key: task.id, task })
		}
	}
	return items
}

/** 每项 start 偏移（与 estimateSize 同公式） */
export function buildTaskBoardItemOffsets(flatItems: readonly TaskBoardFlatItem[]): number[] {
	const offsets: number[] = []
	let offset = 0
	for (const item of flatItems) {
		offsets.push(offset)
		offset += item.kind === 'header' ? COLLECTION_SECTION_HEADER_STRIDE : COLLECTION_ROW_STRIDE
	}
	return offsets
}

export function measureTaskBoardFlatSize(flatItems: readonly TaskBoardFlatItem[]): number {
	let size = 0
	for (const [index, item] of flatItems.entries()) {
		size += item.kind === 'header' ? COLLECTION_SECTION_HEADER_HEIGHT : COLLECTION_ROW_HEIGHT
		if (index < flatItems.length - 1) size += COLLECTION_ITEM_GAP
	}
	return size
}

export function listTaskBoardStickyIndexes(flatItems: readonly TaskBoardFlatItem[]): number[] {
	const indexes: number[] = []
	for (let i = 0; i < flatItems.length; i++) {
		if (flatItems[i]?.kind === 'header') {
			indexes.push(i)
		}
	}
	return indexes
}

/** 虚拟范围只描述已加载内容；仍可续页时才保留分页 sentinel。 */
export function buildTaskBoardVirtualLayout(
	flatItems: readonly TaskBoardFlatItem[],
	includePaginationSentinel: boolean,
) {
	const flatSize = measureTaskBoardFlatSize(flatItems)
	return {
		contentHeightPx:
			flatSize +
			(includePaginationSentinel && flatItems.length > 0 ? COLLECTION_ITEM_GAP : 0) +
			(includePaginationSentinel ? COLLECTION_ROW_HEIGHT : 0),
		sentinelIndex: flatItems.length,
		virtualCount: flatItems.length + (includePaginationSentinel ? 1 : 0),
	}
}

/** 分页重排后按稳定 task key 恢复同一视口锚点。 */
export function resolveTaskBoardAnchorScrollTop(
	anchor: Readonly<{ key: string; offsetPx: number }>,
	flatIndexByKey: ReadonlyMap<string, number>,
	itemOffsets: readonly number[],
): number | null {
	const index = flatIndexByKey.get(anchor.key)
	const start = index === undefined ? undefined : itemOffsets[index]
	return start === undefined ? null : Math.max(0, start + anchor.offsetPx)
}

export type TaskBoardStickyLayout = {
	activeStickyIndex: number
	nextStickyIndex: number | null
	pushOffset: number
	/** 已滚过 active header 起点，应显示吸顶浮层 */
	stuck: boolean
}

/**
 * sticky 顶替：下一 header 顶上来时 pushOffset 把当前标题顶走。
 */
export function buildTaskBoardStickyPush({
	stickyIndexes,
	itemOffsets,
	scrollTop,
	headerSize = COLLECTION_SECTION_HEADER_STRIDE,
}: {
	stickyIndexes: readonly number[]
	itemOffsets: readonly number[]
	scrollTop: number
	headerSize?: number
}): TaskBoardStickyLayout | null {
	if (stickyIndexes.length === 0) {
		return null
	}
	const y = Math.max(0, scrollTop)
	let activeStickyIndex = stickyIndexes[0] ?? 0
	for (const index of stickyIndexes) {
		const start = itemOffsets[index] ?? 0
		if (start <= y + 0.5) {
			activeStickyIndex = index
		} else {
			break
		}
	}
	const activePos = stickyIndexes.indexOf(activeStickyIndex)
	const nextStickyIndex =
		activePos >= 0 && activePos < stickyIndexes.length - 1
			? (stickyIndexes[activePos + 1] ?? null)
			: null
	const activeStart = itemOffsets[activeStickyIndex] ?? 0
	const nextStart =
		nextStickyIndex != null
			? (itemOffsets[nextStickyIndex] ?? Number.POSITIVE_INFINITY)
			: Number.POSITIVE_INFINITY
	const pushOffset = nextStickyIndex == null ? 0 : Math.min(0, nextStart - y - headerSize)
	return {
		activeStickyIndex,
		nextStickyIndex,
		pushOffset,
		stuck: y >= activeStart,
	}
}

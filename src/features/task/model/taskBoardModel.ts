/**
 * Task Board 纯模型：flat 索引、内容总高、sticky 顶替。
 * 无 React / DOM；几何与 UI 解耦，单测主战场。
 */

import type { TaskListItem, TaskStatus } from '@/shared/types'

import { TASK_BOARD_STATUS_ORDER } from './taskBoardOrder'
import { formatTaskStatusLabel } from './taskStatus'

export const TASK_BOARD_ROW_HEIGHT = 48
export const TASK_BOARD_HEADER_HEIGHT = 40
export const TASK_BOARD_ITEM_GAP = 2
/** 行占位（含 gap） */
export const TASK_BOARD_ROW_SIZE = TASK_BOARD_ROW_HEIGHT + TASK_BOARD_ITEM_GAP
/** header 占位（含 gap） */
export const TASK_BOARD_HEADER_SIZE = TASK_BOARD_HEADER_HEIGHT + TASK_BOARD_ITEM_GAP

export type TaskBoardFlatHeader = {
	kind: 'header'
	key: string
	label: string
	count: number
	status?: TaskStatus
	open: boolean
}

export type TaskBoardFlatRow = {
	kind: 'row'
	key: string
	task: TaskListItem
}

export type TaskBoardFlatItem = TaskBoardFlatHeader | TaskBoardFlatRow

export type TaskBoardCustomSection = {
	key: string
	label: string
	tasks: TaskListItem[]
}

export type BuildTaskBoardFlatItemsInput = {
	tasks: readonly TaskListItem[]
	statusOrder?: readonly TaskStatus[]
	openSections: readonly TaskStatus[]
	hideEmptySections?: boolean
	customSections?: readonly TaskBoardCustomSection[]
}

/**
 * 构建虚拟列表展平项（状态分区 header + 行，或 customSections）。
 */
export function buildTaskBoardFlatItems({
	tasks,
	statusOrder = TASK_BOARD_STATUS_ORDER,
	openSections,
	hideEmptySections = true,
	customSections,
}: BuildTaskBoardFlatItemsInput): TaskBoardFlatItem[] {
	const items: TaskBoardFlatItem[] = []

	if (customSections && customSections.length > 0) {
		for (const section of customSections) {
			items.push({
				kind: 'header',
				key: `h:${section.key}`,
				label: section.label,
				count: section.tasks.length,
				open: true,
			})
			for (const task of section.tasks) {
				items.push({ kind: 'row', key: task.id, task })
			}
		}
		return items
	}

	const grouped = groupTasksByStatus(tasks)
	const openSet = new Set(openSections)

	for (const status of statusOrder) {
		const sectionTasks = grouped[status]
		if (hideEmptySections && sectionTasks.length === 0) {
			continue
		}
		const open = openSet.has(status)
		items.push({
			kind: 'header',
			key: `h:${status}`,
			label: formatTaskStatusLabel(status),
			count: sectionTasks.length,
			status,
			open,
		})
		if (open) {
			for (const task of sectionTasks) {
				items.push({ kind: 'row', key: task.id, task })
			}
		}
	}
	return items
}

function groupTasksByStatus(tasks: readonly TaskListItem[]): Record<TaskStatus, TaskListItem[]> {
	const result: Record<TaskStatus, TaskListItem[]> = {
		todo: [],
		doing: [],
		waiting: [],
		done: [],
		canceled: [],
	}
	for (const task of tasks) {
		result[task.status].push(task)
	}
	return result
}

/** 每项 start 偏移（与 estimateSize 同公式） */
export function buildTaskBoardItemOffsets(flatItems: readonly TaskBoardFlatItem[]): number[] {
	const offsets: number[] = []
	let offset = 0
	for (const item of flatItems) {
		offsets.push(offset)
		offset += item.kind === 'header' ? TASK_BOARD_HEADER_SIZE : TASK_BOARD_ROW_SIZE
	}
	return offsets
}

export function measureTaskBoardFlatSize(flatItems: readonly TaskBoardFlatItem[]): number {
	let size = 0
	for (const item of flatItems) {
		size += item.kind === 'header' ? TASK_BOARD_HEADER_SIZE : TASK_BOARD_ROW_SIZE
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

export type BuildTaskBoardExtentInput = {
	/** 当前可见 flat 结构总高（折叠已反映） */
	flatSizePx: number
	/** 服务端过滤后总数；未知时 null */
	totalCount: number | null
	/** 服务端已拉取条数（infinite pages 展平，非折叠可见行） */
	loadedServerCount: number
	hasNextPage: boolean
}

export type TaskBoardExtent = {
	contentHeightPx: number
	spacerSizePx: number
	unloadedRowCount: number
}

/**
 * 内容总高：
 * - 续拉中：flat + 未加载行占位（拇指相对稳；折叠仍改变 flat）
 * - 已拉完：= flat（折叠立刻变矮、拇指变长）
 */
export function buildTaskBoardExtent({
	flatSizePx,
	totalCount,
	loadedServerCount,
	hasNextPage,
}: BuildTaskBoardExtentInput): TaskBoardExtent {
	// totalCount 仅在 number 时可信（含 0）；undefined/null = 未就绪，不占位
	const knownTotal = typeof totalCount === 'number' ? totalCount : null
	const unloadedRowCount =
		hasNextPage && knownTotal != null ? Math.max(0, knownTotal - Math.max(0, loadedServerCount)) : 0
	const spacerSizePx = unloadedRowCount * TASK_BOARD_ROW_SIZE
	const contentHeightPx = flatSizePx + spacerSizePx
	return { contentHeightPx, spacerSizePx, unloadedRowCount }
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
	headerSize = TASK_BOARD_HEADER_SIZE,
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

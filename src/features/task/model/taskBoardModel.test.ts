import { describe, expect, it } from 'vitest'

import type { TaskListItem } from '@/shared/types'
import {
	COLLECTION_ROW_HEIGHT,
	COLLECTION_ROW_SIZE,
	COLLECTION_SECTION_HEADER_HEIGHT,
	COLLECTION_SECTION_HEADER_SIZE,
} from '@/shared/components/collectionGeometry'

import {
	buildTaskBoardFlatItems,
	buildTaskBoardItemOffsets,
	buildTaskBoardStickyPush,
	buildTaskBoardVirtualLayout,
	listTaskBoardStickyIndexes,
	measureTaskBoardFlatSize,
	resolveTaskBoardAnchorScrollTop,
} from './taskBoardModel'

function task(
	partial: Partial<TaskListItem> & Pick<TaskListItem, 'id' | 'title' | 'status'>,
): TaskListItem {
	return {
		spaceId: 's1',
		spaceName: '工作',
		spaceSlug: 'work',
		projectId: null,
		projectName: null,
		statusChangedAt: '2026-01-01T00:00:00.000Z',
		priority: 0,
		plannedAt: null,
		dueAt: null,
		remindAt: null,
		completedAt: null,
		canceledAt: null,
		archivedAt: null,
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-01-01T00:00:00.000Z',
		...partial,
	}
}

describe('taskBoardModel', () => {
	it('几何锁定批准的 TaskBoard 密度', () => {
		expect(COLLECTION_ROW_HEIGHT).toBe(44)
		expect(COLLECTION_SECTION_HEADER_HEIGHT).toBe(36)
	})

	it('flatItems：展开分区含 header+行；折叠去掉行', () => {
		const tasks = [
			task({ id: 'a', title: 'A', status: 'todo' }),
			task({ id: 'b', title: 'B', status: 'doing' }),
		]
		const open = buildTaskBoardFlatItems({
			tasks,
			openSections: ['todo', 'doing'],
		})
		expect(open.filter((i) => i.kind === 'row')).toHaveLength(2)

		const collapsed = buildTaskBoardFlatItems({
			tasks,
			openSections: ['todo'],
		})
		expect(collapsed.filter((i) => i.kind === 'row')).toHaveLength(1)
		expect(measureTaskBoardFlatSize(collapsed)).toBeLessThan(measureTaskBoardFlatSize(open))
	})

	it('virtual layout：只按已加载 flat 高度并固定追加一行 sentinel', () => {
		const flatItems = buildTaskBoardFlatItems({
			tasks: [
				task({ id: 'a', title: 'A', status: 'todo' }),
				task({ id: 'b', title: 'B', status: 'doing' }),
			],
			openSections: ['todo', 'doing'],
		})
		const layout = buildTaskBoardVirtualLayout(flatItems)

		expect(layout).toEqual({
			contentHeightPx: measureTaskBoardFlatSize(flatItems) + COLLECTION_ROW_SIZE,
			sentinelIndex: flatItems.length,
			virtualCount: flatItems.length + 1,
		})
	})

	it('append anchor：新页任务插入前方分组后仍保持同一 task 的视口位置', () => {
		const previous = buildTaskBoardFlatItems({
			tasks: [
				task({ id: 'todo-a', title: 'A', status: 'todo' }),
				task({ id: 'doing-c', title: 'C', status: 'doing' }),
			],
			statusOrder: ['todo', 'doing'],
			openSections: ['todo', 'doing'],
		})
		const next = buildTaskBoardFlatItems({
			tasks: [
				task({ id: 'todo-a', title: 'A', status: 'todo' }),
				task({ id: 'doing-c', title: 'C', status: 'doing' }),
				task({ id: 'todo-b', title: 'B', status: 'todo' }),
			],
			statusOrder: ['todo', 'doing'],
			openSections: ['todo', 'doing'],
		})
		const nextIndexByKey = new Map(next.map((item, index) => [item.key, index]))
		const previousOffsets = buildTaskBoardItemOffsets(previous)
		const nextOffsets = buildTaskBoardItemOffsets(next)
		const previousIndex = previous.findIndex((item) => item.key === 'doing-c')
		const anchor = {
			key: 'doing-c',
			offsetPx: 11,
		}
		const previousScrollTop = previousOffsets[previousIndex]! + anchor.offsetPx
		const restoredScrollTop = resolveTaskBoardAnchorScrollTop(anchor, nextIndexByKey, nextOffsets)

		expect(restoredScrollTop).toBe(previousScrollTop + COLLECTION_ROW_SIZE)
		expect(
			resolveTaskBoardAnchorScrollTop({ key: 'removed', offsetPx: 0 }, nextIndexByKey, nextOffsets),
		).toBeNull()
	})

	it('sticky push：下一 header 接近时 pushOffset 为负', () => {
		const tasks = [
			task({ id: 'a', title: 'A', status: 'todo' }),
			task({ id: 'b', title: 'B', status: 'todo' }),
			task({ id: 'c', title: 'C', status: 'doing' }),
		]
		const flat = buildTaskBoardFlatItems({
			tasks,
			openSections: ['todo', 'doing'],
		})
		const offsets = buildTaskBoardItemOffsets(flat)
		const sticky = listTaskBoardStickyIndexes(flat)
		expect(sticky.length).toBeGreaterThanOrEqual(2)

		const secondStart = offsets[sticky[1]!]!
		const layout = buildTaskBoardStickyPush({
			stickyIndexes: sticky,
			itemOffsets: offsets,
			scrollTop: secondStart - COLLECTION_SECTION_HEADER_SIZE / 2,
		})
		expect(layout).not.toBeNull()
		expect(layout!.pushOffset).toBeLessThan(0)
		expect(layout!.stuck).toBe(true)
	})
})

import { describe, expect, it } from 'vitest'

import type { TaskListItem } from '@/shared/types'
import {
	COLLECTION_ROW_HEIGHT,
	COLLECTION_ROW_SIZE,
	COLLECTION_SECTION_HEADER_HEIGHT,
	COLLECTION_SECTION_HEADER_SIZE,
} from '@/shared/components/collectionGeometry'

import {
	buildTaskBoardExtent,
	buildTaskBoardFlatItems,
	buildTaskBoardItemOffsets,
	buildTaskBoardStickyPush,
	listTaskBoardStickyIndexes,
	measureTaskBoardFlatSize,
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

	it('extent：已拉完时等于 flat（折叠变矮）', () => {
		const flat = 2 * COLLECTION_SECTION_HEADER_SIZE + 3 * COLLECTION_ROW_SIZE
		const extent = buildTaskBoardExtent({
			flatSizePx: flat,
			totalCount: 3,
			loadedServerCount: 3,
			hasNextPage: false,
		})
		expect(extent.contentHeightPx).toBe(flat)
		expect(extent.spacerSizePx).toBe(0)
	})

	it('extent：续拉中为 flat + 未加载行占位', () => {
		const flat = COLLECTION_SECTION_HEADER_SIZE + 10 * COLLECTION_ROW_SIZE
		const extent = buildTaskBoardExtent({
			flatSizePx: flat,
			totalCount: 100,
			loadedServerCount: 10,
			hasNextPage: true,
		})
		expect(extent.unloadedRowCount).toBe(90)
		expect(extent.contentHeightPx).toBe(flat + 90 * COLLECTION_ROW_SIZE)
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

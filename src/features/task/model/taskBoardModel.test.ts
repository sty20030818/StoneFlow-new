import { describe, expect, it } from 'vitest'

import type { TaskListItem, TaskStatus } from '@/shared/types'
import {
	COLLECTION_ITEM_GAP,
	COLLECTION_ROW_HEIGHT,
	COLLECTION_ROW_STRIDE,
	COLLECTION_SECTION_HEADER_HEIGHT,
	COLLECTION_SECTION_HEADER_STRIDE,
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

function buildFixture({
	tasks,
	openSections = ['todo', 'doing'],
	statusOrder = ['todo', 'doing'],
}: {
	tasks: TaskListItem[]
	openSections?: TaskStatus[]
	statusOrder?: TaskStatus[]
}) {
	return buildTaskBoardFlatItems({
		sections: statusOrder
			.filter((status) => tasks.some((item) => item.status === status))
			.map((status) => ({
				key: `status:${status}`,
				label: status,
				totalCount: tasks.filter((item) => item.status === status).length,
				status,
				tasks: tasks.filter((item) => item.status === status),
			})),
		collapsedGroupKeys: statusOrder
			.filter((status) => !openSections.includes(status))
			.map((status) => `h:status:${status}`),
	})
}

describe('taskBoardModel', () => {
	it('精确数量不生成任务高度，零成员父子组仍保留稳定 header 与折叠几何', () => {
		const loaded = task({ id: 'loaded', title: '首屏任务', status: 'doing' })
		const childKey = JSON.stringify(['priority:4', 'status:doing'])
		const emptyChildKey = JSON.stringify(['priority:4', 'status:todo'])
		const sections = [
			{
				key: 'priority:4',
				label: '紧急',
				totalCount: 337,
				tasks: [loaded],
				children: [
					{ key: childKey, label: '进行中', totalCount: 337, tasks: [loaded] },
					{ key: emptyChildKey, label: '待执行', totalCount: 0, tasks: [] },
				],
			},
			{ key: 'priority:3', label: '高', totalCount: 0, tasks: [] },
		]
		const flat = buildTaskBoardFlatItems({ sections })
		expect(flat.map(({ key }) => key)).toEqual([
			'h:priority:4',
			`h:${childKey}`,
			'loaded',
			`h:${emptyChildKey}`,
			'h:priority:3',
		])
		expect(
			flat
				.filter((item) => item.kind === 'header')
				.map(({ count, tasks }) => [count, tasks.length]),
		).toEqual([
			[337, 1],
			[337, 1],
			[0, 0],
			[0, 0],
		])
		expect(measureTaskBoardFlatSize(flat)).toBe(4 * 36 + 44 + 4 * 2)
		expect(buildTaskBoardVirtualLayout(flat, true)).toMatchObject({
			virtualCount: 6,
			sentinelIndex: 5,
			contentHeightPx: 242,
		})
		const collapsed = buildTaskBoardFlatItems({ sections, collapsedGroupKeys: ['h:priority:4'] })
		expect(collapsed.map(({ key }) => key)).toEqual(['h:priority:4', 'h:priority:3'])
		expect(measureTaskBoardFlatSize(collapsed)).toBe(74)
	})

	it('几何锁定批准的 TaskBoard 密度', () => {
		expect(COLLECTION_ROW_HEIGHT).toBe(44)
		expect(COLLECTION_SECTION_HEADER_HEIGHT).toBe(36)
	})

	it('flatItems：展开分区含 header+行；折叠去掉行', () => {
		const tasks = [
			task({ id: 'a', title: 'A', status: 'todo' }),
			task({ id: 'b', title: 'B', status: 'doing' }),
		]
		const open = buildFixture({
			tasks,
			openSections: ['todo', 'doing'],
		})
		expect(open.filter((i) => i.kind === 'row')).toHaveLength(2)

		const collapsed = buildFixture({
			tasks,
			openSections: ['todo'],
		})
		expect(collapsed.filter((i) => i.kind === 'row')).toHaveLength(1)
		expect(measureTaskBoardFlatSize(collapsed)).toBeLessThan(measureTaskBoardFlatSize(open))
	})

	it('virtual layout：只在分页未结束时追加一行 sentinel', () => {
		const flatItems = buildFixture({
			tasks: [
				task({ id: 'a', title: 'A', status: 'todo' }),
				task({ id: 'b', title: 'B', status: 'doing' }),
			],
			openSections: ['todo', 'doing'],
		})
		const paginatedLayout = buildTaskBoardVirtualLayout(flatItems, true)
		const exhaustedLayout = buildTaskBoardVirtualLayout(flatItems, false)
		const flatContentHeight =
			flatItems.reduce(
				(size, item) =>
					size +
					(item.kind === 'header' ? COLLECTION_SECTION_HEADER_HEIGHT : COLLECTION_ROW_HEIGHT),
				0,
			) +
			(flatItems.length - 1) * COLLECTION_ITEM_GAP

		expect(measureTaskBoardFlatSize(flatItems)).toBe(flatContentHeight)

		expect(paginatedLayout).toEqual({
			contentHeightPx: flatContentHeight + COLLECTION_ITEM_GAP + COLLECTION_ROW_HEIGHT,
			sentinelIndex: flatItems.length,
			virtualCount: flatItems.length + 1,
		})
		expect(exhaustedLayout).toEqual({
			contentHeightPx: flatContentHeight,
			sentinelIndex: flatItems.length,
			virtualCount: flatItems.length,
		})
		expect(buildTaskBoardVirtualLayout([], false).contentHeightPx).toBe(0)
		expect(buildTaskBoardVirtualLayout([], true).contentHeightPx).toBe(COLLECTION_ROW_HEIGHT)
	})

	it('数据刷新在前序组插入任务后，按 stable task key 恢复视口锚点', () => {
		const previous = buildFixture({
			tasks: [
				task({ id: 'todo-a', title: 'A', status: 'todo' }),
				task({ id: 'doing-c', title: 'C', status: 'doing' }),
			],
			statusOrder: ['todo', 'doing'],
			openSections: ['todo', 'doing'],
		})
		const next = buildFixture({
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

		expect(restoredScrollTop).toBe(previousScrollTop + COLLECTION_ROW_STRIDE)
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
		const flat = buildFixture({
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
			scrollTop: secondStart - COLLECTION_SECTION_HEADER_STRIDE / 2,
		})
		expect(layout).not.toBeNull()
		expect(layout!.pushOffset).toBeLessThan(0)
		expect(layout!.stuck).toBe(true)
	})
})

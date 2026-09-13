import { describe, expect, it } from 'vitest'

import {
	reconcileCollapsedGroup,
	reconcileCollectionProjection,
	type CollectionState,
} from '@/features/selection'
import type { TaskListItem, TaskStatus } from '@/shared/types'

import { buildTaskBoardCollection } from './taskBoardCollection'
import { buildTaskBoardFlatItems } from './taskBoardModel'

const STATUS_ORDER = ['todo', 'doing'] satisfies readonly TaskStatus[]
const TASKS = [
	createTask('todo-a', 'todo'),
	createTask('todo-b', 'todo'),
	createTask('doing-c', 'doing'),
]
const ELIGIBLE_KEYS = TASKS.map((task) => task.id)

describe('taskBoardCollection', () => {
	it('两级组只展平叶任务，父折叠隐藏后代且成员与叶选择边界保持唯一', () => {
		const childA = JSON.stringify(['priority:4', 'status:todo'])
		const sibling = JSON.stringify(['priority:4', 'status:doing'])
		const childB = JSON.stringify(['priority:1', 'status:todo'])
		const sections = [
			{
				key: 'priority:4',
				label: '紧急',
				tasks: TASKS.slice(0, 2),
				children: [
					{ key: childA, label: '待执行', tasks: [TASKS[0]!] },
					{ key: sibling, label: '进行中', tasks: [TASKS[1]!] },
				],
			},
			{
				key: 'priority:1',
				label: '低',
				tasks: TASKS.slice(2),
				children: [{ key: childB, label: '待执行', tasks: [TASKS[2]!] }],
			},
		]
		const flat = buildTaskBoardFlatItems({ sections })
		const collection = buildTaskBoardCollection({ flatItems: flat, eligibleKeys: ELIGIBLE_KEYS })
		expect(flat.map((item) => item.key)).toEqual([
			'h:priority:4',
			`h:${childA}`,
			'todo-a',
			`h:${sibling}`,
			'todo-b',
			'h:priority:1',
			`h:${childB}`,
			'doing-c',
		])
		expect([...collection.rowLeafGroupKeyByKey]).toEqual([
			['todo-a', `h:${childA}`],
			['todo-b', `h:${sibling}`],
			['doing-c', `h:${childB}`],
		])
		expect(collection.rowKeysByGroupKey.get('h:priority:4')).toEqual(new Set(['todo-a', 'todo-b']))
		expect(collection.rowKeysByGroupKey.get(`h:${childA}`)).toEqual(new Set(['todo-a']))
		expect(flat[1]).toMatchObject({ parentKey: 'h:priority:4', parentLabel: '紧急' })
		const folded = buildTaskBoardFlatItems({
			sections,
			collapsedGroupKeys: ['h:priority:4', `h:${childA}`],
		})
		expect(folded.map((item) => item.key)).toEqual([
			'h:priority:4',
			'h:priority:1',
			`h:${childB}`,
			'doing-c',
		])
		const reopened = buildTaskBoardFlatItems({ sections, collapsedGroupKeys: [`h:${childA}`] })
		expect(reopened.filter((item) => item.kind === 'row').map((item) => item.key)).toEqual([
			'todo-b',
			'doing-c',
		])
		expect(reopened.filter((item) => item.kind === 'header')).toHaveLength(5)
	})

	it('从 flatItems 派生唯一 projection、全部 flat index 与 header 分组', () => {
		const collection = buildCollection(TASKS, ['todo', 'doing'])

		expect(collection.projection.eligibleKeys).toEqual(['todo-a', 'todo-b', 'doing-c'])
		expect(collection.projection.navigableKeys).toEqual(['todo-a', 'todo-b', 'doing-c'])
		expect([...collection.flatIndexByKey]).toEqual([
			['h:status:todo', 0],
			['todo-a', 1],
			['todo-b', 2],
			['h:status:doing', 3],
			['doing-c', 4],
		])
		expect([...collection.rowOrdinalByKey]).toEqual([
			['todo-a', 1],
			['todo-b', 2],
			['doing-c', 3],
		])
		expect(collection.rowKeysByGroupKey.get('h:status:todo')).toEqual(new Set(['todo-a', 'todo-b']))
		expect(collection.rowKeysByGroupKey.get('h:status:doing')).toEqual(new Set(['doing-c']))
	})

	it('折叠只移除 navigation，并复用 H transition 输出 group trigger 与再次进入目标', () => {
		const previous = buildCollection(TASKS, ['todo', 'doing'])
		const next = buildCollection(TASKS, ['doing'])
		const state = createState({
			selectedKeys: new Set(['todo-b', 'doing-c']),
			focusedKey: 'todo-b',
		})

		const transition = reconcileCollapsedGroup(state, previous.projection, next.projection, {
			groupKey: 'h:status:todo',
			collapsedKeys: previous.rowKeysByGroupKey.get('h:status:todo') ?? new Set(),
		})

		expect(next.projection.eligibleKeys).toEqual(ELIGIBLE_KEYS)
		expect(next.projection.navigableKeys).toEqual(['doing-c'])
		expect(next.rowKeysByGroupKey.get('h:status:todo')).toEqual(new Set(['todo-a', 'todo-b']))
		expect([...next.rowOrdinalByKey]).toEqual([['doing-c', 1]])
		expect(transition.state).toEqual({
			selectedKeys: state.selectedKeys,
			focusedKey: 'doing-c',
		})
		expect(transition.focusIntent).toEqual({
			type: 'group-trigger',
			groupKey: 'h:status:todo',
			reentry: { type: 'item', key: 'doing-c' },
		})
	})

	it('折叠尾部分组时把再次进入目标回退到 collection root', () => {
		const previous = buildCollection(TASKS, ['todo', 'doing'])
		const next = buildCollection(TASKS, ['todo'])

		const transition = reconcileCollapsedGroup(
			createState({ focusedKey: 'doing-c' }),
			previous.projection,
			next.projection,
			{
				groupKey: 'h:status:doing',
				collapsedKeys: previous.rowKeysByGroupKey.get('h:status:doing') ?? new Set(),
			},
		)

		expect(transition.focusIntent).toEqual({
			type: 'group-trigger',
			groupKey: 'h:status:doing',
			reentry: { type: 'root' },
		})
	})

	it('删除 focused task 时复用 H transition 回退到 flat 顺序的相邻项', () => {
		const previous = buildCollection(TASKS, ['todo', 'doing'])
		const remainingTasks = TASKS.filter((task) => task.id !== 'todo-b')
		const next = buildCollection(remainingTasks, ['todo', 'doing'])

		const transition = reconcileCollectionProjection(
			createState({
				selectedKeys: new Set(['todo-b']),
				focusedKey: 'todo-b',
			}),
			previous.projection,
			next.projection,
			'delete',
		)

		expect(transition.state.selectedKeys).toEqual(new Set())
		expect(transition.state.focusedKey).toBe('doing-c')
		expect(transition.focusIntent).toEqual({ type: 'item', key: 'doing-c' })
	})

	it('拒绝重复 flat key，避免 virtual index 静默覆盖', () => {
		const duplicateHeaders = buildTaskBoardFlatItems({
			sections: [
				{ key: 'same', label: '第一组', tasks: [TASKS[0]!] },
				{ key: 'same', label: '第二组', tasks: [TASKS[1]!] },
			],
		})

		expect(() =>
			buildTaskBoardCollection({
				eligibleKeys: ['todo-a', 'todo-b'],
				flatItems: duplicateHeaders,
			}),
		).toThrow('flatItems 包含重复 key：h:same')
	})
})

function buildCollection(tasks: readonly TaskListItem[], openSections: readonly TaskStatus[]) {
	return buildTaskBoardCollection({
		eligibleKeys: tasks.map((task) => task.id),
		flatItems: buildTaskBoardFlatItems({
			sections: STATUS_ORDER.map((status) => ({
				key: `status:${status}`,
				label: status,
				status,
				tasks: tasks.filter((task) => task.status === status),
			})),
			collapsedGroupKeys: STATUS_ORDER.filter((status) => !openSections.includes(status)).map(
				(status) => `h:status:${status}`,
			),
		}),
	})
}

function createState(overrides: Partial<CollectionState<string>> = {}): CollectionState<string> {
	return {
		selectedKeys: new Set(),
		focusedKey: null,
		...overrides,
	}
}

function createTask(id: string, status: TaskStatus): TaskListItem {
	return {
		id,
		spaceId: 'space-1',
		spaceName: '默认空间',
		spaceSlug: 'default',
		title: id,
		status,
		statusChangedAt: '2026-08-17T00:00:00.000Z',
		priority: 0,
		dueAt: null,
		plannedAt: null,
		remindAt: null,
		completedAt: null,
		canceledAt: null,
		projectId: null,
		projectName: null,
		archivedAt: null,
		createdAt: '2026-08-17T00:00:00.000Z',
		updatedAt: '2026-08-17T00:00:00.000Z',
	}
}

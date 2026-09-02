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
	it('从 flatItems 派生唯一 projection、全部 flat index 与 header 分组', () => {
		const collection = buildCollection(TASKS, ['todo', 'doing'])

		expect(collection.projection).toEqual({
			eligibleKeys: ['todo-a', 'todo-b', 'doing-c'],
			navigableKeys: ['todo-a', 'todo-b', 'doing-c'],
		})
		expect([...collection.flatIndexByKey]).toEqual([
			['h:todo', 0],
			['todo-a', 1],
			['todo-b', 2],
			['h:doing', 3],
			['doing-c', 4],
		])
		expect([...collection.rowOrdinalByKey]).toEqual([
			['todo-a', 1],
			['todo-b', 2],
			['doing-c', 3],
		])
		expect(collection.rowKeysByGroupKey.get('h:todo')).toEqual(new Set(['todo-a', 'todo-b']))
		expect(collection.rowKeysByGroupKey.get('h:doing')).toEqual(new Set(['doing-c']))
	})

	it('折叠只移除 navigation，并复用 H transition 输出 group trigger 与再次进入目标', () => {
		const previous = buildCollection(TASKS, ['todo', 'doing'])
		const next = buildCollection(TASKS, ['doing'])
		const state = createState({
			selectedKeys: new Set(['todo-b', 'doing-c']),
			focusedKey: 'todo-b',
		})

		const transition = reconcileCollapsedGroup(state, previous.projection, next.projection, {
			groupKey: 'h:todo',
			collapsedKeys: previous.rowKeysByGroupKey.get('h:todo') ?? new Set(),
		})

		expect(next.projection).toEqual({
			eligibleKeys: ELIGIBLE_KEYS,
			navigableKeys: ['doing-c'],
		})
		expect([...next.rowOrdinalByKey]).toEqual([['doing-c', 1]])
		expect(transition.state).toEqual({
			selectedKeys: state.selectedKeys,
			focusedKey: 'doing-c',
		})
		expect(transition.focusIntent).toEqual({
			type: 'group-trigger',
			groupKey: 'h:todo',
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
				groupKey: 'h:doing',
				collapsedKeys: previous.rowKeysByGroupKey.get('h:doing') ?? new Set(),
			},
		)

		expect(transition.focusIntent).toEqual({
			type: 'group-trigger',
			groupKey: 'h:doing',
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
			tasks: TASKS,
			openSections: ['todo', 'doing'],
			customSections: [
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
			tasks,
			statusOrder: STATUS_ORDER,
			openSections,
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

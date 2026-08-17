import { describe, expect, it } from 'vitest'

import {
	createCollectionProjection,
	materializeEligibleSelection,
	reconcileCollapsedGroup,
	reconcileCollectionProjection,
	resetRangeAnchorBeforeRange,
	type CollectionState,
} from './collectionState'

describe('collectionState', () => {
	it('只接受唯一且保持 eligible 顺序的 navigable stable keys', () => {
		const eligibleKeys = ['task-a', 'task-b', 'task-c']
		const navigableKeys = ['task-a', 'task-c']
		const projection = createCollectionProjection(eligibleKeys, navigableKeys)

		expect(projection).toEqual({ eligibleKeys, navigableKeys })
		expect(projection.eligibleKeys).not.toBe(eligibleKeys)
		expect(projection.navigableKeys).not.toBe(navigableKeys)
		expect(() => createCollectionProjection(['task-a', 'task-a'], ['task-a'])).toThrow(
			'eligibleKeys 包含重复 key：task-a',
		)
		expect(() => createCollectionProjection(['task-a'], ['task-b'])).toThrow(
			'navigableKeys 必须是 eligibleKeys 的有序子集',
		)
		expect(() => createCollectionProjection(['task-a', 'task-b'], ['task-b', 'task-a'])).toThrow(
			'navigableKeys 必须是 eligibleKeys 的有序子集',
		)
	})

	it('显式物化当下 eligible selection，后续加载不会自动加入', () => {
		const eligibleKeys = ['task-a', 'task-b']
		const selectedKeys = materializeEligibleSelection(eligibleKeys)
		eligibleKeys.push('task-c')

		expect(selectedKeys).toEqual(new Set(['task-a', 'task-b']))
	})

	it('筛选按 eligibility 裁剪选择，并只修复逻辑焦点而不发 DOM focus intent', () => {
		const selectedKeys = new Set(['task-a', 'task-b'])
		const state = createState({
			selectedKeys,
			focusedKey: 'task-b',
			rangeAnchorKey: 'task-b',
		})
		const previous = createCollectionProjection(
			['task-a', 'task-b', 'task-c'],
			['task-a', 'task-b', 'task-c'],
		)
		const next = createCollectionProjection(['task-a', 'task-c'], ['task-a', 'task-c'])

		const transition = reconcileCollectionProjection(state, previous, next, 'filter')

		expect(transition.state.selectedKeys).toEqual(new Set(['task-a']))
		expect(transition.state.focusedKey).toBe('task-c')
		expect(transition.state.rangeAnchorKey).toBe('task-b')
		expect(transition.focusIntent).toBeNull()
		expect(selectedKeys).toEqual(new Set(['task-a', 'task-b']))
	})

	it('删除 focused key 时依次回退到后继、前驱和 collection root', () => {
		const previous = createCollectionProjection(
			['task-a', 'task-b', 'task-c'],
			['task-a', 'task-b', 'task-c'],
		)
		const state = createState({
			selectedKeys: new Set(['task-b']),
			focusedKey: 'task-b',
			rangeAnchorKey: 'task-b',
		})

		const successor = reconcileCollectionProjection(
			state,
			previous,
			createCollectionProjection(['task-a', 'task-c'], ['task-a', 'task-c']),
			'delete',
		)
		expect(successor).toMatchObject({
			state: { focusedKey: 'task-c', rangeAnchorKey: 'task-b' },
			focusIntent: { type: 'item', key: 'task-c' },
		})

		const predecessor = reconcileCollectionProjection(
			state,
			previous,
			createCollectionProjection(['task-a'], ['task-a']),
			'delete',
		)
		expect(predecessor.focusIntent).toEqual({ type: 'item', key: 'task-a' })

		const root = reconcileCollectionProjection(
			state,
			previous,
			createCollectionProjection([], []),
			'delete',
		)
		expect(root.state.focusedKey).toBeNull()
		expect(root.focusIntent).toEqual({ type: 'root' })
	})

	it('折叠保留 eligible selection，并输出折叠按钮与再次进入目标', () => {
		const selectedKeys = new Set(['task-b', 'task-c'])
		const state = createState({
			selectedKeys,
			focusedKey: 'task-b',
			rangeAnchorKey: 'task-c',
		})
		const previous = createCollectionProjection(
			['task-a', 'task-b', 'task-c', 'task-d'],
			['task-a', 'task-b', 'task-c', 'task-d'],
		)
		const next = createCollectionProjection(
			['task-a', 'task-b', 'task-c', 'task-d'],
			['task-a', 'task-d'],
		)
		const collapsedKeys = new Set(['task-b', 'task-c'])

		const transition = reconcileCollapsedGroup(state, previous, next, {
			groupKey: 'group-todo',
			collapsedKeys,
		})

		expect(transition.state.selectedKeys).toBe(selectedKeys)
		expect(transition.state.focusedKey).toBe('task-d')
		expect(transition.state.rangeAnchorKey).toBe('task-c')
		expect(transition.focusIntent).toEqual({
			type: 'group-trigger',
			groupKey: 'group-todo',
			reentry: { type: 'item', key: 'task-d' },
		})
		expect(collapsedKeys).toEqual(new Set(['task-b', 'task-c']))

		const root = reconcileCollapsedGroup(
			createState({ focusedKey: 'task-c' }),
			previous,
			createCollectionProjection(['task-a', 'task-b', 'task-c', 'task-d'], ['task-a']),
			{ groupKey: 'group-tail', collapsedKeys: new Set(['task-b', 'task-c', 'task-d']) },
		)
		expect(root.state.focusedKey).toBeNull()
		expect(root.focusIntent).toEqual({
			type: 'group-trigger',
			groupKey: 'group-tail',
			reentry: { type: 'root' },
		})

		const unrelated = reconcileCollapsedGroup(
			createState({ focusedKey: 'task-a' }),
			previous,
			next,
			{ groupKey: 'group-todo', collapsedKeys },
		)
		expect(unrelated.state.focusedKey).toBe('task-a')
		expect(unrelated.focusIntent).toBeNull()
	})

	it('增量加载与重排按 stable key 保持状态和结构共享', () => {
		const state = createState({
			selectedKeys: new Set(['task-a']),
			focusedKey: 'task-b',
			rangeAnchorKey: 'task-a',
		})
		const transition = reconcileCollectionProjection(
			state,
			createCollectionProjection(['task-a', 'task-b'], ['task-a', 'task-b']),
			createCollectionProjection(['task-b', 'task-a', 'task-c'], ['task-b', 'task-a', 'task-c']),
			'incremental-load',
		)

		expect(transition.state).toBe(state)
		expect(transition.state.selectedKeys).toEqual(new Set(['task-a']))
		expect(transition.focusIntent).toBeNull()
	})

	it('只在 range 动作前按 navigableKeys 延迟重置 anchor', () => {
		const valid = createState({ focusedKey: 'task-b', rangeAnchorKey: 'task-a' })
		expect(resetRangeAnchorBeforeRange(valid, ['task-a', 'task-b'])).toBe(valid)

		const stale = createState({ focusedKey: 'task-b', rangeAnchorKey: 'task-hidden' })
		const reset = resetRangeAnchorBeforeRange(stale, ['task-a', 'task-b'])
		expect(reset).toEqual({
			selectedKeys: stale.selectedKeys,
			focusedKey: 'task-b',
			rangeAnchorKey: 'task-b',
		})
		expect(stale.rangeAnchorKey).toBe('task-hidden')

		const unavailable = createState({
			focusedKey: 'task-hidden',
			rangeAnchorKey: 'task-hidden',
		})
		expect(resetRangeAnchorBeforeRange(unavailable, ['task-a']).rangeAnchorKey).toBeNull()
	})
})

function createState(overrides: Partial<CollectionState> = {}): CollectionState {
	return {
		selectedKeys: new Set(),
		focusedKey: null,
		rangeAnchorKey: null,
		...overrides,
	}
}

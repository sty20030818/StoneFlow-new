import { act, renderHook } from '@testing-library/react'
import { ListKeyboardDelegate } from 'react-aria'

import { useCollectionInteraction } from './useCollectionInteraction'

describe('useCollectionInteraction', () => {
	it('只保留显式 eligible selection，增量加载不自动扩选', () => {
		const { result, rerender } = renderHook(
			({ eligibleKeys }) =>
				useCollectionInteraction({
					eligibleKeys,
					navigableKeys: eligibleKeys,
					defaultSelectedKeys: ['task-a', 'missing'],
				}),
			{ initialProps: { eligibleKeys: ['task-a', 'task-b'] } },
		)

		expect([...result.current.selectedKeys]).toEqual(['task-a'])

		act(() => result.current.selectEligibleKeys())
		expect([...result.current.getSnapshot().selectedKeys]).toEqual(['task-a', 'task-b'])
		act(() => result.current.listState.selectionManager.selectAll())
		expect([...result.current.getSnapshot().selectedKeys]).toEqual(['task-a', 'task-b'])

		rerender({ eligibleKeys: ['task-a', 'task-b', 'task-c'] })

		expect([...result.current.selectedKeys]).toEqual(['task-a', 'task-b'])
		expect(result.current.listState.selectionManager.isSelectAll).toBe(false)
	})

	it('折叠只改变 navigableKeys，不清除 logical selection', () => {
		const { result, rerender } = renderHook(
			({ navigableKeys }) =>
				useCollectionInteraction({
					eligibleKeys: ['task-a', 'task-b', 'task-c'],
					navigableKeys,
					defaultSelectedKeys: ['task-b'],
				}),
			{ initialProps: { navigableKeys: ['task-a', 'task-b', 'task-c'] } },
		)

		rerender({ navigableKeys: ['task-a', 'task-c'] })

		expect([...result.current.selectedKeys]).toEqual(['task-b'])
		expect(result.current.projection.navigableKeys).toEqual(['task-a', 'task-c'])
		expect(result.current.listState.disabledKeys).toEqual(new Set(['task-b']))

		const delegate = new ListKeyboardDelegate({
			collection: result.current.listState.collection,
			disabledKeys: result.current.listState.disabledKeys,
			ref: { current: null },
		})
		expect(delegate.getKeyBelow('task-a')).toBe('task-c')
	})

	it('范围选择固定 anchor，并在 stale anchor 上从当前焦点重新开始', () => {
		const { result, rerender } = renderHook(
			({ navigableKeys }) =>
				useCollectionInteraction({
					eligibleKeys: ['task-a', 'task-b', 'task-c', 'task-d'],
					navigableKeys,
				}),
			{ initialProps: { navigableKeys: ['task-a', 'task-b', 'task-c', 'task-d'] } },
		)

		act(() => {
			result.current.focusKey('task-b')
			result.current.selectRangeTo('task-d')
		})
		expect([...result.current.getSnapshot().selectedKeys]).toEqual(['task-b', 'task-c', 'task-d'])
		expect(result.current.getSnapshot().rangeAnchorKey).toBe('task-b')

		act(() => result.current.selectRangeTo('task-c'))
		expect([...result.current.getSnapshot().selectedKeys]).toEqual(['task-b', 'task-c'])

		rerender({ navigableKeys: ['task-a', 'task-c', 'task-d'] })
		expect(result.current.getSnapshot().rangeAnchorKey).toBe('task-b')
		act(() => result.current.focusKey('task-c', { preserveRangeAnchor: true }))
		act(() => result.current.selectRangeTo('task-d'))

		expect([...result.current.getSnapshot().selectedKeys]).toEqual(['task-b', 'task-c', 'task-d'])
		expect(result.current.getSnapshot().rangeAnchorKey).toBe('task-c')
	})

	it('范围伸缩保留范围外选择，并只替换上一段范围', () => {
		const { result } = renderHook(() =>
			useCollectionInteraction({
				eligibleKeys: ['task-a', 'task-b', 'task-c', 'task-d'],
				navigableKeys: ['task-a', 'task-b', 'task-c', 'task-d'],
				defaultSelectedKeys: ['task-a'],
			}),
		)

		act(() => result.current.focusKey('task-b'))
		act(() => result.current.selectRangeTo('task-d'))
		expect([...result.current.getSnapshot().selectedKeys]).toEqual([
			'task-a',
			'task-b',
			'task-c',
			'task-d',
		])

		act(() => result.current.selectRangeTo('task-c'))
		expect([...result.current.getSnapshot().selectedKeys]).toEqual(['task-a', 'task-b', 'task-c'])
	})

	it('投影迁移焦点不提前改写 anchor，下一次范围才修复', () => {
		const { result, rerender } = renderHook(
			({ eligibleKeys, navigableKeys }) =>
				useCollectionInteraction({ eligibleKeys, navigableKeys }),
			{
				initialProps: {
					eligibleKeys: ['task-a', 'task-b', 'task-c'],
					navigableKeys: ['task-a', 'task-b', 'task-c'],
				},
			},
		)

		act(() => result.current.focusKey('task-b'))
		rerender({
			eligibleKeys: ['task-a', 'task-c'],
			navigableKeys: ['task-a', 'task-c'],
		})

		expect(result.current.focusedKey).toBe('task-c')
		expect(result.current.rangeAnchorKey).toBe('task-b')

		act(() => result.current.selectRangeTo('task-a'))
		expect([...result.current.getSnapshot().selectedKeys]).toEqual(['task-a', 'task-c'])
		expect(result.current.rangeAnchorKey).toBe('task-c')
	})

	it('anchor 与 focusedKey 都已折叠时从 range target 重新开始', () => {
		const { result, rerender } = renderHook(
			({ navigableKeys }) =>
				useCollectionInteraction({
					eligibleKeys: ['task-a', 'task-b', 'hidden'],
					navigableKeys,
				}),
			{ initialProps: { navigableKeys: ['task-a', 'task-b', 'hidden'] } },
		)

		act(() => result.current.focusKey('hidden'))
		rerender({ navigableKeys: ['task-a', 'task-b'] })
		act(() => result.current.selectRangeTo('task-a'))

		expect([...result.current.getSnapshot().selectedKeys]).toEqual(['task-a'])
		expect(result.current.rangeAnchorKey).toBe('task-a')
	})

	it('忽略 collection 外或不可导航的焦点目标', () => {
		const { result } = renderHook(() =>
			useCollectionInteraction<string>({
				eligibleKeys: ['task-a', 'hidden'],
				navigableKeys: ['task-a'],
			}),
		)

		act(() => result.current.focusKey('task-a'))
		act(() => result.current.focusKey('missing'))
		act(() => result.current.focusKey('hidden'))

		expect(result.current.getSnapshot()).toMatchObject({
			focusedKey: 'task-a',
			rangeAnchorKey: 'task-a',
		})
	})

	it('切换选择不抢走指针操作的当前焦点', () => {
		const { result } = renderHook(() =>
			useCollectionInteraction({
				eligibleKeys: ['task-a', 'task-b'],
				navigableKeys: ['task-a', 'task-b'],
			}),
		)

		act(() => result.current.focusKey('task-a'))
		act(() => result.current.toggleSelection('task-b'))

		expect([...result.current.selectedKeys]).toEqual(['task-b'])
		expect(result.current.focusedKey).toBe('task-a')
		expect(result.current.rangeAnchorKey).toBe('task-a')
	})

	it('投影修复后普通焦点移动会建立新 anchor', () => {
		const { result, rerender } = renderHook(
			({ navigableKeys }) =>
				useCollectionInteraction({
					eligibleKeys: ['task-a', 'task-b', 'task-c'],
					navigableKeys,
				}),
			{ initialProps: { navigableKeys: ['task-a', 'task-b', 'task-c'] } },
		)

		act(() => result.current.focusKey('task-b'))
		rerender({ navigableKeys: ['task-a', 'task-c'] })
		act(() => result.current.focusKey('task-c', { preserveRangeAnchor: true }))
		act(() => result.current.listState.selectionManager.setFocusedKey('task-a'))

		expect(result.current.focusedKey).toBe('task-a')
		expect(result.current.rangeAnchorKey).toBe('task-a')
	})

	it('执行时 snapshot 是副本，不能反向修改 collection', () => {
		const { result } = renderHook(() =>
			useCollectionInteraction({
				eligibleKeys: ['task-a', 'task-b'],
				navigableKeys: ['task-a', 'task-b'],
				defaultSelectedKeys: ['task-a'],
			}),
		)

		const snapshot = result.current.getSnapshot()
		;(snapshot.selectedKeys as Set<string>).add('task-b')

		expect([...result.current.getSnapshot().selectedKeys]).toEqual(['task-a'])
	})
})

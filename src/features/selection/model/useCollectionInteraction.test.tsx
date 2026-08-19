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

	it('Shift 会话按当前行逐项切换，并在反向时先恢复最后一项', () => {
		const { result } = renderHook(() =>
			useCollectionInteraction({
				eligibleKeys: ['task-a', 'task-b', 'task-c', 'task-d', 'task-e'],
				navigableKeys: ['task-a', 'task-b', 'task-c', 'task-d', 'task-e'],
				defaultSelectedKeys: ['task-a', 'task-b', 'task-c', 'task-d', 'task-e'],
			}),
		)

		act(() => result.current.focusKey('task-c'))
		act(() => result.current.toggleRangeStep(1))
		expect([...result.current.selectedKeys]).toEqual(['task-a', 'task-b', 'task-d', 'task-e'])

		act(() => result.current.toggleRangeStep(1))
		expect([...result.current.selectedKeys]).toEqual(['task-a', 'task-b', 'task-e'])
		expect(result.current.focusedKey).toBe('task-d')

		act(() => result.current.toggleRangeStep(-1))
		expect([...result.current.selectedKeys]).toEqual(['task-a', 'task-b', 'task-d', 'task-e'])
		expect(result.current.focusedKey).toBe('task-d')
	})

	it('增量追加期间保留 Shift 会话，并从最新尾项继续', () => {
		const { result, rerender } = renderHook(
			({ keys }) => useCollectionInteraction({ eligibleKeys: keys, navigableKeys: keys }),
			{ initialProps: { keys: ['task-a', 'task-b'] } },
		)

		act(() => result.current.focusKey('task-a'))
		act(() => result.current.toggleRangeStep(1))
		act(() => result.current.toggleRangeStep(1))
		expect([...result.current.selectedKeys]).toEqual(['task-a', 'task-b'])

		rerender({ keys: ['task-a', 'task-b', 'task-c'] })
		act(() => result.current.toggleRangeStep(1))

		expect([...result.current.selectedKeys]).toEqual(['task-a', 'task-b', 'task-c'])
		expect(result.current.focusedKey).toBe('task-c')
	})

	it('重排会结束上一段 Shift 手势', () => {
		const { result, rerender } = renderHook(
			({ keys }) => useCollectionInteraction({ eligibleKeys: keys, navigableKeys: keys }),
			{ initialProps: { keys: ['task-a', 'task-b', 'task-c'] } },
		)

		act(() => result.current.focusKey('task-b'))
		act(() => result.current.toggleRangeStep(1))
		expect([...result.current.selectedKeys]).toEqual(['task-b'])

		rerender({ keys: ['task-b', 'task-a', 'task-c'] })
		act(() => result.current.toggleRangeStep(1))

		expect([...result.current.selectedKeys]).toEqual([])
		expect(result.current.focusedKey).toBe('task-b')
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
	})

	it('一次替换分区 selection，并剔除 collection 外的 key', () => {
		const { result } = renderHook(() =>
			useCollectionInteraction<string>({
				eligibleKeys: ['task-a', 'task-b', 'task-c'],
				navigableKeys: ['task-a', 'task-b', 'task-c'],
				defaultSelectedKeys: ['task-a'],
			}),
		)

		act(() => result.current.replaceSelection(['task-b', 'task-c', 'missing']))

		expect([...result.current.selectedKeys]).toEqual(['task-b', 'task-c'])
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

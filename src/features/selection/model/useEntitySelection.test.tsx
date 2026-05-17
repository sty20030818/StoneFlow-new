import { act, renderHook } from '@testing-library/react'

import { useEntitySelection } from './useEntitySelection'

describe('useEntitySelection', () => {
	it('按可见顺序 toggle selection', () => {
		const { result } = renderHook(() => useEntitySelection(['a', 'b', 'c']))

		act(() => {
			result.current.toggleSelection('c')
			result.current.toggleSelection('a')
		})

		expect(result.current.selectedIds).toEqual(['a', 'c'])
		expect(result.current.selectedIdSet.has('a')).toBe(true)
		expect(result.current.selectionSnapshot).toMatchObject({
			type: 'entity',
			ids: ['a', 'c'],
			count: 2,
			hasSelection: true,
			isMultiSelection: true,
		})
	})

	it('数据刷新后剔除失效 selection 并保持可用 focus', () => {
		const { result, rerender } = renderHook(
			({ ids }: { ids: string[] }) => useEntitySelection(ids),
			{
				initialProps: { ids: ['a', 'b', 'c'] },
			},
		)

		act(() => {
			result.current.toggleSelection('a')
			result.current.toggleSelection('c')
			result.current.setFocusedId('c')
		})
		rerender({ ids: ['b', 'c'] })

		expect(result.current.selectedIds).toEqual(['c'])
		expect(result.current.focusedId).toBe('c')
	})

	it('moveFocus 支持 Shift 风格逐项扩选', () => {
		const { result } = renderHook(() => useEntitySelection(['a', 'b', 'c']))

		act(() => {
			result.current.moveFocus(1, { selectRange: true })
			result.current.moveFocus(1, { selectRange: true, preserveAnchor: true })
		})

		expect(result.current.selectedIds).toEqual(['b', 'c'])
		expect(result.current.focusedId).toBe('c')
	})
})

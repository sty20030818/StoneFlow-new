import { renderHook } from '@testing-library/react'

import { useSectionSelection } from './use-section-selection'

describe('useSectionSelection', () => {
	it('计算当前 section 内的 selectedCount', () => {
		const { result } = renderHook(() =>
			useSectionSelection({
				sectionIds: ['item-a', 'item-b', 'item-c'],
				selectedIdSet: new Set(['item-b', 'item-d']),
			}),
		)

		expect(result.current.selectedCount).toBe(1)
	})

	it('handleSelectAll 只 toggle 当前 section 中未选中的 id', () => {
		const onToggleSelection = vi.fn<(id: string) => void>()
		const { result } = renderHook(() =>
			useSectionSelection({
				sectionIds: ['item-a', 'item-b', 'item-c'],
				selectedIdSet: new Set(['item-b']),
				onToggleSelection,
			}),
		)

		result.current.handleSelectAll()

		expect(onToggleSelection).toHaveBeenCalledTimes(2)
		expect(onToggleSelection).toHaveBeenNthCalledWith(1, 'item-a')
		expect(onToggleSelection).toHaveBeenNthCalledWith(2, 'item-c')
	})

	it('handleDeselectAll 只 toggle 当前 section 中已选中的 id', () => {
		const onToggleSelection = vi.fn<(id: string) => void>()
		const { result } = renderHook(() =>
			useSectionSelection({
				sectionIds: ['item-a', 'item-b', 'item-c'],
				selectedIdSet: new Set(['item-b', 'item-d']),
				onToggleSelection,
			}),
		)

		result.current.handleDeselectAll()

		expect(onToggleSelection).toHaveBeenCalledTimes(1)
		expect(onToggleSelection).toHaveBeenCalledWith('item-b')
	})

	it('缺少 selectedIdSet 或 onToggleSelection 时不抛错、不执行', () => {
		const onToggleSelection = vi.fn<(id: string) => void>()
		const withoutSelectedIdSet = renderHook(() =>
			useSectionSelection({
				sectionIds: ['item-a'],
				onToggleSelection,
			}),
		)
		const withoutToggle = renderHook(() =>
			useSectionSelection({
				sectionIds: ['item-a'],
				selectedIdSet: new Set(['item-a']),
			}),
		)

		expect(() => withoutSelectedIdSet.result.current.handleSelectAll()).not.toThrow()
		expect(() => withoutToggle.result.current.handleDeselectAll()).not.toThrow()
		expect(onToggleSelection).not.toHaveBeenCalled()
	})
})

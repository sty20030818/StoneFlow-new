import {
	buildEntitySelectionSnapshot,
	mergeEntitySelectionRange,
	moveEntitySelectionFocus,
	pruneEntitySelectionFocusState,
	selectEntityRange,
	toggleEntitySelectionByVisibleOrder,
} from './entitySelection'

describe('entitySelection', () => {
	it('构建空选、单选和多选快照', () => {
		const empty = buildEntitySelectionSnapshot([])
		const single = buildEntitySelectionSnapshot(['entity-a'])
		const multi = buildEntitySelectionSnapshot(['entity-a', 'entity-b'])

		expect(empty).toMatchObject({ count: 0, hasSelection: false })
		expect(single).toMatchObject({
			type: 'entity',
			ids: ['entity-a'],
			count: 1,
			isSingleSelection: true,
			isMultiSelection: false,
		})
		expect(single.idSet.has('entity-a')).toBe(true)
		expect(multi).toMatchObject({ count: 2, isSingleSelection: false, isMultiSelection: true })
	})

	it('按可见顺序移动焦点并限制边界', () => {
		const ids = ['entity-a', 'entity-b', 'entity-c']

		expect(moveEntitySelectionFocus(ids, null, 1)).toBe('entity-a')
		expect(moveEntitySelectionFocus(ids, null, -1)).toBe('entity-c')
		expect(moveEntitySelectionFocus(ids, 'entity-b', 1)).toBe('entity-c')
		expect(moveEntitySelectionFocus(ids, 'entity-b', -1)).toBe('entity-a')
		expect(moveEntitySelectionFocus(ids, 'entity-c', 1)).toBe('entity-c')
		expect(moveEntitySelectionFocus([], 'entity-a', 1)).toBeNull()
	})

	it('从 anchor 到 target 生成连续范围并支持反向', () => {
		const ids = ['entity-a', 'entity-b', 'entity-c', 'entity-d']

		expect(selectEntityRange(ids, 'entity-b', 'entity-d')).toEqual([
			'entity-b',
			'entity-c',
			'entity-d',
		])
		expect(selectEntityRange(ids, 'entity-d', 'entity-b')).toEqual([
			'entity-b',
			'entity-c',
			'entity-d',
		])
		expect(selectEntityRange(ids, 'missing', 'entity-c')).toEqual(['entity-c'])
	})

	it('合并范围并按可见顺序稳定输出', () => {
		const ids = ['entity-a', 'entity-b', 'entity-c', 'entity-d', 'entity-e']

		expect(
			mergeEntitySelectionRange(ids, ['entity-a', 'entity-c'], ['entity-d', 'entity-e']),
		).toEqual(['entity-a', 'entity-c', 'entity-d', 'entity-e'])
		expect(mergeEntitySelectionRange(ids, ['entity-d'], ['entity-b', 'entity-c'])).toEqual([
			'entity-b',
			'entity-c',
			'entity-d',
		])
	})

	it('切换单行选择并按可见顺序输出', () => {
		const ids = ['entity-a', 'entity-b', 'entity-c']

		expect(toggleEntitySelectionByVisibleOrder(ids, ['entity-a', 'entity-c'], 'entity-c')).toEqual([
			'entity-a',
		])
		expect(toggleEntitySelectionByVisibleOrder(ids, ['entity-c'], 'entity-b')).toEqual([
			'entity-b',
			'entity-c',
		])
	})

	it('裁剪失效选择、焦点和 anchor，同时保留有效顺序', () => {
		expect(
			pruneEntitySelectionFocusState(
				{
					selectedIds: ['entity-c', 'entity-a', 'entity-b'],
					focusedId: 'missing',
					selectionAnchorId: 'missing',
				},
				['entity-a', 'entity-c'],
			),
		).toEqual({
			selectedIds: ['entity-c', 'entity-a'],
			focusedId: 'entity-c',
			selectionAnchorId: 'entity-c',
		})
	})
})

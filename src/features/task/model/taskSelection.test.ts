import {
	buildTaskSelectionSnapshot,
	mergeTaskSelectionRange,
	moveTaskSelectionFocus,
	pruneTaskSelection,
	pruneTaskSelectionFocusState,
	selectTaskRange,
	toggleTaskIdSelection,
	toggleTaskSelectionByVisibleOrder,
} from './taskSelection'

describe('taskSelection', () => {
	it('toggleTaskIdSelection 可以添加或移除任务 id', () => {
		expect(toggleTaskIdSelection(['task-a'], 'task-b')).toEqual(['task-a', 'task-b'])
		expect(toggleTaskIdSelection(['task-a', 'task-b'], 'task-a')).toEqual(['task-b'])
	})

	it('pruneTaskSelection 保留有效选择和原有顺序', () => {
		expect(pruneTaskSelection(['task-c', 'task-a', 'task-b'], ['task-a', 'task-c'])).toEqual([
			'task-c',
			'task-a',
		])
	})

	it('buildTaskSelectionSnapshot 描述空选择', () => {
		const snapshot = buildTaskSelectionSnapshot([])

		expect(snapshot).toMatchObject({
			type: 'task',
			ids: [],
			count: 0,
			hasSelection: false,
			isSingleSelection: false,
			isMultiSelection: false,
		})
		expect(snapshot.idSet.size).toBe(0)
	})

	it('buildTaskSelectionSnapshot 描述单选和多选状态', () => {
		const single = buildTaskSelectionSnapshot(['task-a'])
		const multi = buildTaskSelectionSnapshot(['task-a', 'task-b'])

		expect(single).toMatchObject({
			count: 1,
			hasSelection: true,
			isSingleSelection: true,
			isMultiSelection: false,
		})
		expect(single.idSet.has('task-a')).toBe(true)
		expect(multi).toMatchObject({
			count: 2,
			hasSelection: true,
			isSingleSelection: false,
			isMultiSelection: true,
		})
		expect(multi.idSet.has('task-b')).toBe(true)
	})

	it('moveTaskSelectionFocus 按可见顺序移动并限制边界', () => {
		const ids = ['task-a', 'task-b', 'task-c']

		expect(moveTaskSelectionFocus(ids, null, 1)).toBe('task-a')
		expect(moveTaskSelectionFocus(ids, null, -1)).toBe('task-c')
		expect(moveTaskSelectionFocus(ids, 'task-b', 1)).toBe('task-c')
		expect(moveTaskSelectionFocus(ids, 'task-b', -1)).toBe('task-a')
		expect(moveTaskSelectionFocus(ids, 'task-c', 1)).toBe('task-c')
		expect(moveTaskSelectionFocus([], 'task-a', 1)).toBeNull()
	})

	it('selectTaskRange 从 anchor 到 target 生成连续范围并支持反向', () => {
		const ids = ['task-a', 'task-b', 'task-c', 'task-d']

		expect(selectTaskRange(ids, 'task-b', 'task-d')).toEqual(['task-b', 'task-c', 'task-d'])
		expect(selectTaskRange(ids, 'task-d', 'task-b')).toEqual(['task-b', 'task-c', 'task-d'])
		expect(selectTaskRange(ids, 'missing', 'task-c')).toEqual(['task-c'])
	})

	it('mergeTaskSelectionRange 合并新范围并按可见顺序稳定输出', () => {
		const ids = ['task-a', 'task-b', 'task-c', 'task-d', 'task-e']

		expect(mergeTaskSelectionRange(ids, ['task-a', 'task-c'], ['task-d', 'task-e'])).toEqual([
			'task-a',
			'task-c',
			'task-d',
			'task-e',
		])
		expect(mergeTaskSelectionRange(ids, ['task-d'], ['task-b', 'task-c'])).toEqual([
			'task-b',
			'task-c',
			'task-d',
		])
	})

	it('toggleTaskSelectionByVisibleOrder 切换单行选择并按可见顺序输出', () => {
		const ids = ['task-a', 'task-b', 'task-c', 'task-d']

		expect(toggleTaskSelectionByVisibleOrder(ids, ['task-a', 'task-c'], 'task-c')).toEqual([
			'task-a',
		])
		expect(toggleTaskSelectionByVisibleOrder(ids, ['task-c'], 'task-b')).toEqual([
			'task-b',
			'task-c',
		])
	})

	it('pruneTaskSelectionFocusState 过滤失效选择、焦点和 anchor', () => {
		expect(
			pruneTaskSelectionFocusState(
				{
					selectedIds: ['task-a', 'task-c'],
					focusedId: 'task-z',
					anchorId: 'task-z',
				},
				['task-b', 'task-c'],
			),
		).toEqual({
			selectedIds: ['task-c'],
			focusedId: 'task-b',
			anchorId: 'task-c',
		})
	})
})

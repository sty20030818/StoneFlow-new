import {
	buildTaskSelectionSnapshot,
	pruneTaskSelection,
	toggleTaskIdSelection,
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
})

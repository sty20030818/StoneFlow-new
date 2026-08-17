import type { CommandSelectionContext } from '@/features/command'

import { createCommandBulkSelectionSnapshot } from './command-bulk-selection-snapshot'

describe('createCommandBulkSelectionSnapshot', () => {
	it('以 selection ids 为目标真相，并按 ids 顺序附加同域 metadata', () => {
		const selection = createSelection({
			ids: ['task-b', 'missing', 'task-a'],
			entities: [
				{
					id: 'task-a',
					type: 'task',
					title: '任务 A',
					status: 'todo',
					priority: '2',
				},
				{ id: 'task-b', type: 'project', title: '同 ID 项目' },
				{ id: 'task-b', type: 'task', title: '任务 B', subtitle: '项目 B' },
				{ id: 'not-selected', type: 'task', title: '未选择任务' },
			],
		})

		const snapshot = createCommandBulkSelectionSnapshot(selection, 'task', 'command-menu')

		expect(snapshot).toMatchObject({
			entity: 'task',
			source: 'command-menu',
			ids: ['task-b', 'missing', 'task-a'],
			entities: [
				{
					id: 'task-b',
					title: '任务 B',
					subtitle: '项目 B',
				},
				{
					id: 'task-a',
					title: '任务 A',
					status: 'todo',
					priority: '2',
				},
			],
		})
	})

	it('复制目标和 metadata，快照与 owner 后续写入互不反向影响', () => {
		const clearSelection = vi.fn()
		const selection = createSelection({
			ids: ['task-a'],
			entities: [{ id: 'task-a', type: 'task', title: '任务 A' }],
			clearSelection,
		})
		const snapshot = createCommandBulkSelectionSnapshot(selection, 'task', 'command-menu')

		selection.ids[0] = 'task-owner-changed'
		selection.entities[0]!.title = 'owner changed'
		expect(snapshot.ids).toEqual(['task-a'])
		expect(snapshot.entities?.[0]?.title).toBe('任务 A')

		snapshot.ids.push('task-snapshot-changed')
		snapshot.entities![0]!.title = 'snapshot changed'
		expect(selection.ids).toEqual(['task-owner-changed'])
		expect(selection.entities[0]?.title).toBe('owner changed')
		expect(clearSelection).not.toHaveBeenCalled()
	})
})

function createSelection(
	overrides: Pick<CommandSelectionContext, 'ids' | 'entities'> & Partial<CommandSelectionContext>,
): CommandSelectionContext {
	const count = overrides.ids.length
	return {
		type: count > 0 ? 'task' : undefined,
		primaryEntity: overrides.entities[0],
		source: count > 0 ? 'task-list' : 'none',
		hasSelection: count > 0,
		isSingleSelection: count === 1,
		isMultiSelection: count > 1,
		...overrides,
	}
}

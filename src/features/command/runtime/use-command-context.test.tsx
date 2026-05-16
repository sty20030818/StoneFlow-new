import { renderHook } from '@testing-library/react'

import { useCommandContext } from './use-command-context'

describe('useCommandContext', () => {
	it('支持覆盖 row target，并保留默认字段', () => {
		const { result } = renderHook(() =>
			useCommandContext({
				rowTarget: {
					targetId: 'task-1',
					targetType: 'task',
					source: 'focus',
					hasTarget: true,
					isTaskTarget: true,
				},
			}),
		)

		expect(result.current.rowTarget).toEqual({
			targetId: 'task-1',
			targetType: 'task',
			source: 'focus',
			hasTarget: true,
			isTaskTarget: true,
			isProjectTarget: false,
		})
	})

	it('合并 selection / focus / ui / view 时不丢失默认值', () => {
		const { result } = renderHook(() =>
			useCommandContext({
				selection: {
					type: 'task',
					ids: ['task-1', 'task-2'],
					entities: [
						{ id: 'task-1', type: 'task', title: '任务 1' },
						{ id: 'task-2', type: 'task', title: '任务 2' },
					],
					hasSelection: true,
					isMultiSelection: true,
					source: 'task-list',
				},
				focus: {
					activePanel: 'dropdown',
					activeElementType: 'dropdown-item',
				},
				ui: {
					isContextMenuOpen: true,
				},
				view: {
					showCompleted: true,
				},
			}),
		)

		expect(result.current.selection).toMatchObject({
			type: 'task',
			ids: ['task-1', 'task-2'],
			entities: [
				{ id: 'task-1', type: 'task', title: '任务 1' },
				{ id: 'task-2', type: 'task', title: '任务 2' },
			],
			source: 'task-list',
			hasSelection: true,
			isMultiSelection: true,
			isSingleSelection: false,
		})
		expect(result.current.focus).toMatchObject({
			isInputFocused: false,
			activePanel: 'dropdown',
			activeElementType: 'dropdown-item',
		})
		expect(result.current.ui).toMatchObject({
			isCommandMenuOpen: false,
			isContextMenuOpen: true,
			isDropdownOpen: false,
		})
		expect(result.current.view).toEqual({
			hasActiveFilters: false,
			showCompleted: true,
		})
	})
})

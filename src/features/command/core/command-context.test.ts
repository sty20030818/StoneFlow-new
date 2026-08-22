import {
	createEmptyCommandContext,
	createEmptyCommandRowTargetContext,
	resolveTaskDetailTargetId,
	type CommandFocusContext,
} from '@/features/command/core'

describe('CommandContext', () => {
	it('createEmptyCommandContext 返回完整 v2 默认值', () => {
		const context = createEmptyCommandContext()

		expect(context.rowTarget).toEqual({
			source: 'none',
			hasTarget: false,
			isTaskTarget: false,
			isProjectTarget: false,
		})
		expect(context.selection).toEqual({
			ids: [],
			entities: [],
			source: 'none',
			hasSelection: false,
			isSingleSelection: false,
			isMultiSelection: false,
		})
		expect(context.ui.isContextMenuOpen).toBe(false)
		expect(context.view.filterCapabilities.supportsClearAll).toBe(false)
		expect(context.submit.hasActiveTarget).toBe(false)
	})

	it('createEmptyCommandRowTargetContext 返回无目标状态', () => {
		expect(createEmptyCommandRowTargetContext()).toEqual({
			source: 'none',
			hasTarget: false,
			isTaskTarget: false,
			isProjectTarget: false,
		})
	})

	it('focus activePanel 类型允许 dropdown', () => {
		const activePanel: CommandFocusContext['activePanel'] = 'dropdown'

		expect(activePanel).toBe('dropdown')
	})

	it('任务详情目标依次使用 row、focus、primary 和单选', () => {
		const empty = createEmptyCommandContext()
		const context = {
			...empty,
			rowTarget: {
				targetId: 'row-task',
				targetType: 'task' as const,
				source: 'focus' as const,
				hasTarget: true,
				isTaskTarget: true,
				isProjectTarget: false,
			},
			selection: {
				...empty.selection,
				type: 'task' as const,
				ids: ['single-task'],
				focusedType: 'task' as const,
				focusedId: 'focused-task',
				primaryEntity: { id: 'primary-task', type: 'task' as const, title: 'Primary' },
				isSingleSelection: true,
			},
		}

		expect(resolveTaskDetailTargetId(context)).toBe('row-task')
		expect(
			resolveTaskDetailTargetId({
				...context,
				rowTarget: createEmptyCommandRowTargetContext(),
			}),
		).toBe('focused-task')
		expect(
			resolveTaskDetailTargetId({
				...context,
				rowTarget: createEmptyCommandRowTargetContext(),
				selection: { ...context.selection, focusedId: undefined, focusedType: undefined },
			}),
		).toBe('primary-task')
		expect(
			resolveTaskDetailTargetId({
				...context,
				rowTarget: createEmptyCommandRowTargetContext(),
				selection: {
					...context.selection,
					focusedId: undefined,
					focusedType: undefined,
					primaryEntity: undefined,
				},
			}),
		).toBe('single-task')
		expect(resolveTaskDetailTargetId(empty)).toBeNull()
	})
})

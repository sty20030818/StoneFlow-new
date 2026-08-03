import {
	createEmptyCommandContext,
	createEmptyCommandRowTargetContext,
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
		expect(context.view.showCompleted).toBe(true)
		expect(context.view.hasActiveFilters).toBe(false)
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
})

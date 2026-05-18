import { useMemo } from 'react'

import { createEmptyCommandContext, type CommandContext } from '@/features/command/core'

type UseCommandContextOptions = {
	route?: Partial<CommandContext['route']>
	selection?: Partial<CommandContext['selection']>
	focus?: Partial<CommandContext['focus']>
	ui?: Partial<CommandContext['ui']>
	space?: Partial<CommandContext['space']>
	project?: Partial<CommandContext['project']>
	view?: Partial<CommandContext['view']>
	submit?: Partial<CommandContext['submit']>
	rowTarget?: Partial<CommandContext['rowTarget']>
}

export function useCommandContext({
	route,
	selection,
	focus,
	ui,
	space,
	project,
	view,
	submit,
	rowTarget,
}: UseCommandContextOptions = {}) {
	return useMemo<CommandContext>(() => {
		const base = createEmptyCommandContext()

		return {
			...base,
			route: {
				...base.route,
				...route,
			},
			selection: {
				...base.selection,
				...selection,
			},
			focus: {
				...base.focus,
				...focus,
			},
			ui: {
				...base.ui,
				...ui,
			},
			space: {
				...base.space,
				...space,
			},
			project: {
				...base.project,
				...project,
			},
			view: {
				...base.view,
				...view,
			},
			submit: {
				...base.submit,
				...submit,
			},
			rowTarget: {
				...base.rowTarget,
				...rowTarget,
			},
		}
	}, [focus, project, route, rowTarget, selection, space, submit, ui, view])
}

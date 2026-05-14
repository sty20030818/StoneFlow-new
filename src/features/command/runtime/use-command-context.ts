import { useMemo } from 'react'

import { createEmptyCommandContext, type CommandContext } from '@/features/command/core'

type UseCommandContextOptions = {
	route?: Partial<CommandContext['route']>
	ui?: Partial<CommandContext['ui']>
	space?: Partial<CommandContext['space']>
	project?: Partial<CommandContext['project']>
	view?: Partial<CommandContext['view']>
}

export function useCommandContext({
	route,
	ui,
	space,
	project,
	view,
}: UseCommandContextOptions = {}) {
	return useMemo<CommandContext>(() => {
		const base = createEmptyCommandContext()

		return {
			...base,
			route: {
				...base.route,
				...route,
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
		}
	}, [project, route, space, ui, view])
}

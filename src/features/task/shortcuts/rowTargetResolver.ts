import type { CommandRowTargetContext, CommandSelectionContext } from '@/features/command'

export type TaskRowRef = {
	targetId: string
}

export type ResolveTaskRowTargetInput = {
	hover?: TaskRowRef | null
	active?: TaskRowRef | null
	selection: Pick<CommandSelectionContext, 'ids' | 'isSingleSelection' | 'isMultiSelection'>
}

export function resolveTaskRowTarget({
	hover,
	active,
	selection,
}: ResolveTaskRowTargetInput): CommandRowTargetContext {
	if (selection.isSingleSelection && selection.ids[0]) {
		return toTaskRowTarget({ targetId: selection.ids[0] }, 'selection')
	}

	if (hover) {
		return toTaskRowTarget(hover, 'hover')
	}

	if (active) {
		return toTaskRowTarget(active, 'drawer')
	}

	return {
		source: 'none',
		hasTarget: false,
		isTaskTarget: false,
		isProjectTarget: false,
	}
}

function toTaskRowTarget(
	ref: TaskRowRef,
	source: CommandRowTargetContext['source'],
): CommandRowTargetContext {
	return {
		targetId: ref.targetId,
		targetType: 'task',
		source,
		hasTarget: true,
		isTaskTarget: true,
		isProjectTarget: false,
	}
}

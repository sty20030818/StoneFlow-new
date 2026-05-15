import type { CommandRowTargetContext, CommandSelectionContext } from '@/features/command/core'

export type TaskRowRef = {
	targetId: string
}

export type ResolveTaskRowTargetInput = {
	hover?: TaskRowRef | null
	keyboardFocus?: TaskRowRef | null
	active?: TaskRowRef | null
	selection: Pick<CommandSelectionContext, 'ids' | 'isSingleSelection' | 'isMultiSelection'>
}

export function resolveTaskRowTarget({
	hover,
	keyboardFocus,
	active,
	selection,
}: ResolveTaskRowTargetInput): CommandRowTargetContext {
	if (hover) {
		return toTaskRowTarget(hover, 'hover')
	}

	if (keyboardFocus) {
		return toTaskRowTarget(keyboardFocus, 'focus')
	}

	if (active) {
		return toTaskRowTarget(active, 'drawer')
	}

	if (selection.isSingleSelection && selection.ids[0]) {
		return toTaskRowTarget({ targetId: selection.ids[0] }, 'selection')
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

import { useMemo } from 'react'

import {
	COMMAND_IDS,
	matchKeybindingEvent,
	SHORTCUT_DISPATCH_PRIORITY,
	useCommandRuntimeContext,
	useShortcutDispatcher,
	useShortcutRegistry,
	type CommandId,
	type NormalizedKeyEvent,
} from '@/features/command'
import { buildTaskCommandContext } from '@/features/task/commands/buildTaskCommandContext'
import type { TaskListItem } from '@/shared/types'

type UseTaskRowCommandShortcutsOptions = {
	tasks: TaskListItem[]
	focusedTaskId: string | null
	selectedTaskIds: ReadonlySet<string>
	ownsEventTarget: (target: EventTarget | null) => boolean
	onClearTaskSelection: () => void
	onKeyboardInteraction: () => void
}

const TASK_DOMAIN_ROW_COMMAND_IDS = new Set<CommandId>([
	COMMAND_IDS.taskComplete,
	COMMAND_IDS.taskArchive,
	COMMAND_IDS.taskDelete,
	COMMAND_IDS.taskSetPriority,
	COMMAND_IDS.taskSetStatus,
	COMMAND_IDS.taskOpenDateMenu,
	COMMAND_IDS.taskChangePlacement,
])

/** 只负责 row 快捷键匹配与目标投影；执行始终进入壳层唯一 Runtime。 */
export function useTaskRowCommandShortcuts({
	tasks,
	focusedTaskId,
	selectedTaskIds,
	ownsEventTarget,
	onClearTaskSelection,
	onKeyboardInteraction,
}: UseTaskRowCommandShortcutsOptions) {
	const shortcutRegistry = useShortcutRegistry()
	const { runtime, context } = useCommandRuntimeContext()
	const rowBindings = useMemo(
		() =>
			shortcutRegistry
				.getByScope('row')
				.filter((binding) => TASK_DOMAIN_ROW_COMMAND_IDS.has(binding.commandId)),
		[shortcutRegistry],
	)
	const taskById = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks])
	const selectedIds = useMemo(
		() => tasks.filter((task) => selectedTaskIds.has(task.id)).map((task) => task.id),
		[selectedTaskIds, tasks],
	)
	const focusedTargetId = focusedTaskId && taskById.has(focusedTaskId) ? focusedTaskId : null
	const targetIds = useMemo(
		() => (selectedIds.length > 0 ? selectedIds : focusedTargetId ? [focusedTargetId] : []),
		[focusedTargetId, selectedIds],
	)
	const targetContext = useMemo(
		() =>
			buildTaskCommandContext({
				baseContext: context,
				tasks,
				targetTaskIds: targetIds,
				focusedTaskId: focusedTargetId,
				rowTargetId: focusedTargetId ?? (targetIds.length === 1 ? targetIds[0] : null),
				rowTargetSource: 'focus',
				clearSelection: selectedIds.length > 0 ? onClearTaskSelection : undefined,
			}),
		[context, focusedTargetId, onClearTaskSelection, selectedIds.length, targetIds, tasks],
	)

	useShortcutDispatcher(SHORTCUT_DISPATCH_PRIORITY.row, (event) => {
		if (!ownsEventTarget(event.target) || targetIds.length === 0) {
			return 'unhandled'
		}

		const result = matchKeybindingEvent({
			bindings: rowBindings,
			event: normalizeKeyboardEvent(event),
			scope: 'row',
			chordState: null,
			now: performance.now(),
		})
		if (result.status !== 'matched') return 'unhandled'

		onKeyboardInteraction()
		if (result.keybinding.preventDefault) event.preventDefault()
		void runtime
			.project(result.keybinding.commandId, targetContext)
			?.execute({ source: 'row-shortcut' })
		return 'handled'
	})
}

function normalizeKeyboardEvent(event: KeyboardEvent): NormalizedKeyEvent {
	return {
		key: event.key,
		metaKey: event.metaKey,
		ctrlKey: event.ctrlKey,
		altKey: event.altKey,
		shiftKey: event.shiftKey,
		defaultPrevented: event.defaultPrevented,
		isComposing: event.isComposing,
		target: event.target,
	}
}

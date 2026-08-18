import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useRef } from 'react'

import {
	CommandRegistry,
	CommandRuntime,
	CommandRuntimeProvider,
	COMMAND_IDS,
	createEmptyCommandContext,
	KeybindingRegistry,
	ShortcutRegistryProvider,
	type Command,
	type CommandContext,
	type CommandInvocation,
} from '@/features/command'
import type { TaskListItem } from '@/shared/types'

import { TASK_ROW_SHORTCUT_BINDINGS } from './taskRowShortcutBindings'
import { useTaskRowCommandShortcuts } from './useTaskRowCommandShortcuts'

const TEST_SHORTCUT_REGISTRY = new KeybindingRegistry(TASK_ROW_SHORTCUT_BINDINGS)
const DOMAIN_COMMAND_IDS = [
	COMMAND_IDS.taskComplete,
	COMMAND_IDS.taskArchive,
	COMMAND_IDS.taskDelete,
	COMMAND_IDS.taskSetPriority,
	COMMAND_IDS.taskSetStatus,
	COMMAND_IDS.taskOpenDateMenu,
	COMMAND_IDS.taskChangePlacement,
] as const

type CommandCall = {
	commandId: string
	context: CommandContext
	invocation: CommandInvocation
}

it('领域快捷键执行壳层唯一 Runtime 的投影，并隔离输入框', async () => {
	const calls: CommandCall[] = []
	renderHarness({ calls, selectedTaskIds: ['task-a', 'task-b'] })

	const row = screen.getByTestId('collection-row')
	fireEvent.keyDown(row, { key: 'w' })
	fireEvent.keyDown(row, { key: 'p' })
	fireEvent.keyDown(row, { key: 'Enter' })
	fireEvent.keyDown(screen.getByRole('textbox'), { key: 'w' })
	fireEvent.keyDown(screen.getByRole('button', { name: '浮层动作' }), { key: 'p' })

	await waitFor(() => expect(calls).toHaveLength(2))
	expect(calls.map((call) => call.commandId)).toEqual([
		COMMAND_IDS.taskComplete,
		COMMAND_IDS.taskSetPriority,
	])
	expect(calls[0]?.context.selection.ids).toEqual(['task-a', 'task-b'])
	expect(calls[0]?.invocation).toEqual({ source: 'row-shortcut' })
})

it('没有选择时使用真实 focused key 作为单任务目标', async () => {
	const calls: CommandCall[] = []
	renderHarness({ calls })

	fireEvent.keyDown(screen.getByTestId('collection-row'), { key: 'w' })

	await waitFor(() => expect(calls).toHaveLength(1))
	expect(calls[0]?.context.selection.ids).toEqual(['task-b'])
	expect(calls[0]?.context.rowTarget).toMatchObject({
		targetId: 'task-b',
		source: 'focus',
	})
})

it('归档、删除与属性快捷键只按 command ID 进入统一执行口', async () => {
	const calls: CommandCall[] = []
	renderHarness({ calls, selectedTaskIds: ['task-a'] })
	const row = screen.getByTestId('collection-row')

	fireEvent.keyDown(row, { key: 'a' })
	fireEvent.keyDown(row, { key: 'Delete' })
	fireEvent.keyDown(row, { key: 'Backspace', ctrlKey: true })
	fireEvent.keyDown(row, { key: 's' })
	fireEvent.keyDown(row, { key: 'd' })
	fireEvent.keyDown(row, { key: 'P', shiftKey: true })

	await waitFor(() => expect(calls).toHaveLength(6))
	expect(calls.map((call) => call.commandId)).toEqual([
		COMMAND_IDS.taskArchive,
		COMMAND_IDS.taskDelete,
		COMMAND_IDS.taskDelete,
		COMMAND_IDS.taskSetStatus,
		COMMAND_IDS.taskOpenDateMenu,
		COMMAND_IDS.taskChangePlacement,
	])
})

function renderHarness({
	calls,
	selectedTaskIds = [],
}: {
	calls: CommandCall[]
	selectedTaskIds?: string[]
}) {
	const tasks = [createTask('task-a'), createTask('task-b')]
	const baseContext = createEmptyCommandContext()
	const runtime = new CommandRuntime({
		registry: new CommandRegistry(
			DOMAIN_COMMAND_IDS.map((commandId): Command => ({
				id: commandId,
				title: commandId,
				category: 'task',
				scope: ['task-list'],
				run: (context, invocation) => {
					calls.push({ commandId, context, invocation })
				},
			})),
		),
		getContext: () => baseContext,
	})

	function Harness() {
		const collectionRowRef = useRef<HTMLDivElement>(null)
		useTaskRowCommandShortcuts({
			tasks,
			focusedTaskId: 'task-b',
			selectedTaskIds: new Set(selectedTaskIds),
			ownsEventTarget: (target) => target === collectionRowRef.current,
			onClearTaskSelection: vi.fn(),
			onKeyboardInteraction: vi.fn(),
		})
		return (
			<>
				<div ref={collectionRowRef} data-testid='collection-row' tabIndex={-1}>
					<input aria-label='编辑任务' />
				</div>
				<button type='button'>浮层动作</button>
			</>
		)
	}

	render(
		<ShortcutRegistryProvider registry={TEST_SHORTCUT_REGISTRY}>
			<CommandRuntimeProvider context={baseContext} runtime={runtime}>
				<Harness />
			</CommandRuntimeProvider>
		</ShortcutRegistryProvider>,
	)
}

function createTask(id: string): TaskListItem {
	return {
		id,
		spaceId: 'space-a',
		spaceName: '工作',
		spaceSlug: 'work',
		projectId: null,
		projectName: null,
		title: id,
		status: 'todo',
		statusChangedAt: '2026-05-15T00:00:00Z',
		priority: 2,
		dueAt: null,
		plannedAt: null,
		remindAt: null,
		completedAt: null,
		canceledAt: null,
		archivedAt: null,
		createdAt: '2026-05-15T00:00:00Z',
		updatedAt: '2026-05-15T00:00:00Z',
	}
}

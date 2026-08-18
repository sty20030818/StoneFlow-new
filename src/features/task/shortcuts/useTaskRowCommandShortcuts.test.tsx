import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useRef } from 'react'

import {
	BulkActionProvider,
	TASK_BULK_ACTION_IDS,
	type BulkAction,
	type BulkActionId,
	type BulkSelectionSnapshot,
} from '@/features/bulk-action'
import { KeybindingRegistry, ShortcutRegistryProvider } from '@/features/command'
import { DangerConfirmProvider } from '@/features/danger-confirm'
import { useDialogStore } from '@/features/shell-dialogs'
import type { TaskListItem } from '@/shared/types'

import { TASK_ROW_SHORTCUT_BINDINGS } from './taskRowShortcutBindings'
import { useTaskRowCommandShortcuts } from './useTaskRowCommandShortcuts'

const TEST_REGISTRY = new KeybindingRegistry(TASK_ROW_SHORTCUT_BINDINGS)

type BulkCall = { actionId: BulkActionId; snapshot: BulkSelectionSnapshot }

beforeEach(() => {
	useDialogStore.setState({
		isCommandOpen: false,
		commandMenuMode: 'default',
		commandSelectionOverride: null,
	})
})

it('领域快捷键读取唯一 collection 快照，并隔离输入框', async () => {
	const bulkCalls: BulkCall[] = []
	const onOpenTask = vi.fn()
	renderHarness({ bulkCalls, onOpenTask, selectedTaskIds: ['task-a', 'task-b'] })

	fireEvent.keyDown(screen.getByTestId('collection-row'), { key: 'w' })
	await waitFor(() =>
		expect(bulkCalls.map((call) => call.snapshot.ids)).toEqual([['task-a', 'task-b']]),
	)

	fireEvent.keyDown(screen.getByTestId('collection-row'), { key: 'p' })
	expect(useDialogStore.getState().commandMenuMode).toBe('task-priority-picker')
	expect(useDialogStore.getState().commandSelectionOverride?.ids).toEqual(['task-a', 'task-b'])

	fireEvent.keyDown(screen.getByTestId('collection-row'), { key: 'Enter' })
	fireEvent.keyDown(screen.getByRole('textbox'), { key: 'w' })
	useDialogStore.getState().closeCommand()
	fireEvent.keyDown(screen.getByRole('button', { name: '浮层动作' }), { key: 'p' })
	expect(onOpenTask).not.toHaveBeenCalled()
	expect(bulkCalls).toHaveLength(1)
	expect(useDialogStore.getState().isCommandOpen).toBe(false)
})

it('没有选择时使用真实 focused key 作为领域目标', async () => {
	const bulkCalls: BulkCall[] = []
	const onOpenTask = vi.fn()
	renderHarness({ bulkCalls, onOpenTask })

	fireEvent.keyDown(screen.getByTestId('collection-row'), { key: 'w' })
	fireEvent.keyDown(screen.getByTestId('collection-row'), { key: 'Enter' })

	await waitFor(() => expect(bulkCalls[0]?.snapshot.ids).toEqual(['task-b']))
	expect(onOpenTask).not.toHaveBeenCalled()
})

it('归档与删除快捷键继续走同一批量执行入口', async () => {
	const bulkCalls: BulkCall[] = []
	renderHarness({ bulkCalls, onOpenTask: vi.fn(), selectedTaskIds: ['task-a'] })

	const row = screen.getByTestId('collection-row')
	fireEvent.keyDown(row, { key: 'a' })
	fireEvent.keyDown(row, { key: 'Delete' })
	fireEvent.keyDown(row, { key: 'Backspace', ctrlKey: true })

	await waitFor(() =>
		expect(bulkCalls.map((call) => call.actionId)).toEqual([
			TASK_BULK_ACTION_IDS.archiveSelected,
			TASK_BULK_ACTION_IDS.deleteSelected,
			TASK_BULK_ACTION_IDS.deleteSelected,
		]),
	)
})

it.each([
	['p', false, 'task-priority-picker'],
	['s', false, 'task-status-picker'],
	['d', false, 'task-date-picker'],
	['P', true, 'task-placement-picker'],
] as const)('%s 继续打开对应任务属性命令', (key, shiftKey, mode) => {
	renderHarness({ bulkCalls: [], onOpenTask: vi.fn(), selectedTaskIds: ['task-a'] })

	fireEvent.keyDown(screen.getByTestId('collection-row'), { key, shiftKey })

	expect(useDialogStore.getState().commandMenuMode).toBe(mode)
	expect(useDialogStore.getState().commandSelectionOverride?.ids).toEqual(['task-a'])
})

function renderHarness({
	bulkCalls,
	onOpenTask,
	selectedTaskIds = [],
}: {
	bulkCalls: BulkCall[]
	onOpenTask: (taskId: string) => void
	selectedTaskIds?: string[]
}) {
	const tasks = [createTask('task-a'), createTask('task-b')]
	const bulkActions = [
		createBulkAction(TASK_BULK_ACTION_IDS.completeSelected, 'complete', bulkCalls),
		createBulkAction(TASK_BULK_ACTION_IDS.archiveSelected, 'archive', bulkCalls),
		createBulkAction(TASK_BULK_ACTION_IDS.deleteSelected, 'delete', bulkCalls),
	]

	function Harness() {
		const collectionRowRef = useRef<HTMLDivElement>(null)
		useTaskRowCommandShortcuts({
			tasks,
			activeTaskId: null,
			focusedTaskId: 'task-b',
			selectedTaskIds: new Set(selectedTaskIds),
			ownsEventTarget: (target) => target === collectionRowRef.current,
			onToggleTaskSelection: vi.fn(),
			onClearTaskSelection: vi.fn(),
			onOpenTask,
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
		<ShortcutRegistryProvider registry={TEST_REGISTRY}>
			<DangerConfirmProvider>
				<BulkActionProvider actions={bulkActions}>
					<Harness />
				</BulkActionProvider>
			</DangerConfirmProvider>
		</ShortcutRegistryProvider>,
	)
}

function createBulkAction(
	actionId: BulkActionId,
	intent: BulkAction['intent'],
	bulkCalls: BulkCall[],
): BulkAction {
	return {
		id: actionId,
		entity: 'task',
		label: actionId,
		intent,
		requiresConfirm: false,
		run: async (snapshot) => {
			bulkCalls.push({ actionId, snapshot })
			return {
				status: 'success',
				actionId,
				entity: 'task',
				requestedIds: [...snapshot.ids],
				succeededIds: [...snapshot.ids],
				failedIds: [],
				skippedIds: [],
			}
		},
	}
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

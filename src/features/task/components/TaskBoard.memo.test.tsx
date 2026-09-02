import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { memo, useMemo, useState } from 'react'

import { BulkActionProvider } from '@/features/bulk-action'
import {
	COMMAND_IDS,
	CommandRegistry,
	CommandRuntime,
	CommandRuntimeProvider,
	createEmptyCommandContext,
	type Command,
} from '@/features/command'
import { DangerConfirmProvider } from '@/features/danger-confirm'
import type { TaskDisplayPropertyKey } from '@/features/display-options'
import { useCollectionInteraction } from '@/features/selection'
import { TaskBoard, type TaskBoardPagination } from '@/features/task/components/TaskBoard'
import type { TaskRowAdapterProps } from '@/features/task/components/TaskRowAdapter'
import { buildTaskBoardFlatItems } from '@/features/task/model/taskBoardModel'
import { TASK_BOARD_STATUS_ORDER } from '@/features/task/model/taskBoardOrder'
import type { TaskListItem } from '@/shared/types'
import { renderWithInteractionProviders } from '@/test/TestInteractionProviders'

const taskRowAdapterRenderCounts = vi.hoisted(() => new Map<string, number>())
const projectedCommandTargets = vi.hoisted(() => vi.fn())

vi.mock('@/features/task/components/TaskRowAdapter', async (importOriginal) => {
	const original =
		await importOriginal<typeof import('@/features/task/components/TaskRowAdapter')>()
	const ActualTaskRowAdapter = original.TaskRowAdapter

	return {
		...original,
		TaskRowAdapter: memo(function CountedTaskRowAdapter(props: TaskRowAdapterProps) {
			taskRowAdapterRenderCounts.set(
				props.task.id,
				(taskRowAdapterRenderCounts.get(props.task.id) ?? 0) + 1,
			)
			return <ActualTaskRowAdapter {...props} />
		}),
	}
})

const BASE_TASK: TaskListItem = {
	id: 'task-1',
	title: '任务 A',
	spaceId: 'space-1',
	spaceName: '工作',
	spaceSlug: 'work',
	projectId: 'project-1',
	projectName: '项目 A',
	status: 'todo',
	statusChangedAt: '2026-06-28T10:00:00.000Z',
	priority: 0,
	dueAt: null,
	plannedAt: null,
	remindAt: null,
	completedAt: null,
	canceledAt: null,
	archivedAt: null,
	createdAt: '2026-06-28T09:00:00.000Z',
	updatedAt: '2026-06-28T11:00:00.000Z',
}
const TASKS: TaskListItem[] = [BASE_TASK, { ...BASE_TASK, id: 'task-2', title: '任务 B' }]
const TASK_IDS = TASKS.map((task) => task.id)
const FLAT_ITEMS = buildTaskBoardFlatItems({
	tasks: TASKS,
	openSections: TASK_BOARD_STATUS_ORDER,
})
const PAGINATION: TaskBoardPagination = {
	sourceKey: 'memo-test',
	loadedPageCount: 1,
	state: 'exhausted',
}
const PROJECT_OPTIONS = [{ id: 'project-1', name: '项目 A', spaceId: 'space-1' }]
const SPACES = [{ id: 'space-1', name: '工作' }]
const VISIBLE_PROPERTIES: TaskDisplayPropertyKey[] = ['priority', 'project']
const NOOP = () => undefined
const ASYNC_NOOP = async () => undefined
const MEMO_TEST_COMMANDS: Command[] = [
	{
		id: COMMAND_IDS.taskOpenDetail,
		title: '打开任务详情',
		category: 'task',
		scope: ['task-list'],
		run: (context) => projectedCommandTargets(context),
	},
]
const MEMO_TEST_COMMAND_RUNTIME = new CommandRuntime({
	registry: new CommandRegistry(MEMO_TEST_COMMANDS),
	getContext: createEmptyCommandContext,
})

describe('TaskBoard memo', () => {
	beforeEach(() => {
		taskRowAdapterRenderCounts.clear()
		projectedCommandTargets.mockClear()
	})

	it('无关父状态、焦点与范围更新不会让未变化兄弟 Adapter 重跑', async () => {
		renderWithInteractionProviders(
			<DangerConfirmProvider>
				<BulkActionProvider actions={[]}>
					<ParentStateHarness />
				</BulkActionProvider>
			</DangerConfirmProvider>,
		)

		const firstRow = screen.getByRole('row', { name: '打开任务 任务 A' })
		const secondRenderCount = taskRowAdapterRenderCounts.get('task-2')
		expect(taskRowAdapterRenderCounts.get('task-1')).toBeGreaterThan(0)
		expect(secondRenderCount).toBeGreaterThan(0)

		fireEvent.click(screen.getByRole('button', { name: '更新无关父状态' }))

		expect(screen.getByTestId('parent-revision')).toHaveTextContent('1')
		expect(taskRowAdapterRenderCounts.get('task-2')).toBe(secondRenderCount)

		fireEvent.click(screen.getByRole('button', { name: '更新命令上下文' }))
		expect(screen.getByTestId('command-revision')).toHaveTextContent('1')
		expect(taskRowAdapterRenderCounts.get('task-2')).toBe(secondRenderCount)
		fireEvent.click(firstRow)
		await waitFor(() =>
			expect(projectedCommandTargets).toHaveBeenCalledWith(
				expect.objectContaining({ space: { currentSpaceId: 'space-1' } }),
			),
		)
		expect(taskRowAdapterRenderCounts.get('task-2')).toBe(secondRenderCount)

		act(() => firstRow.focus())
		await waitFor(() => expect(firstRow).toHaveFocus())
		expect(taskRowAdapterRenderCounts.get('task-2')).toBe(secondRenderCount)

		fireEvent.keyDown(firstRow, { key: 'ArrowDown', shiftKey: true })
		await waitFor(() => expect(firstRow).toHaveAttribute('data-selected', 'true'))
		expect(taskRowAdapterRenderCounts.get('task-2')).toBe(secondRenderCount)
	})
})

function ParentStateHarness() {
	const [revision, setRevision] = useState(0)
	const [commandRevision, setCommandRevision] = useState(0)
	const commandContext = useMemo(
		() => ({
			...createEmptyCommandContext(),
			space: { currentSpaceId: `space-${commandRevision}` },
		}),
		[commandRevision],
	)
	const collectionInteraction = useCollectionInteraction({
		eligibleKeys: TASK_IDS,
		navigableKeys: TASK_IDS,
	})

	return (
		<>
			<button onClick={() => setRevision((value) => value + 1)} type='button'>
				更新无关父状态
			</button>
			<output data-testid='parent-revision'>{revision}</output>
			<button onClick={() => setCommandRevision((value) => value + 1)} type='button'>
				更新命令上下文
			</button>
			<output data-testid='command-revision'>{commandRevision}</output>
			<CommandRuntimeProvider context={commandContext} runtime={MEMO_TEST_COMMAND_RUNTIME}>
				<TaskBoard
					collectionInteraction={collectionInteraction}
					flatItems={FLAT_ITEMS}
					focusIntent={null}
					onCollapseAll={NOOP}
					onEmptyAction={NOOP}
					onExpandAll={NOOP}
					onFocusIntentConsumed={NOOP}
					onRetry={NOOP}
					onSectionOpenChange={NOOP}
					onSelectPlacement={NOOP}
					onToggleTaskStatus={ASYNC_NOOP}
					onUpdateTaskPriority={ASYNC_NOOP}
					onUpdateTaskStatus={ASYNC_NOOP}
					pagination={PAGINATION}
					pendingTaskId={null}
					projectOptions={PROJECT_OPTIONS}
					spaces={SPACES}
					status='ready'
					tasks={TASKS}
					visibleProperties={VISIBLE_PROPERTIES}
				/>
			</CommandRuntimeProvider>
		</>
	)
}

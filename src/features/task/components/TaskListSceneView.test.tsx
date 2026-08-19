import { useState } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { UseTaskDisplayOptionsResult } from '@/features/display-options'
import { CommandSelectionProvider } from '@/features/selection'
import { emitEvent } from '@/shared/events'
import type { TaskListItem } from '@/shared/types'
import { useShellPreferenceStore } from '@/features/shell-dialogs'

import { TaskPreviewProvider } from '../detail/model/TaskPreviewProvider'
import { useTaskPreviewController } from '../detail/model/useTaskPreviewController'
import { useTaskCollectionScene } from '../hooks/useTaskCollectionScene'

const listTaskLinksMock = vi.hoisted(() =>
	vi.fn<({ taskId }: { taskId: string }) => Promise<never>>(),
)

vi.mock('@/features/task/api/taskLinks', () => ({
	listTaskLinks: listTaskLinksMock,
}))

vi.mock('@/features/task/hooks/useTaskListController', () => ({
	useTaskListController: () => ({
		pendingTaskId: null,
		archiveListTask: vi.fn(),
		deleteListTask: vi.fn(),
		toggleTaskStatus: vi.fn(),
		updateTaskDueDate: vi.fn(),
		updateTaskPlacement: vi.fn(),
		updateTaskPriority: vi.fn(),
		updateTaskReminderAt: vi.fn(),
		updateTaskScheduledAt: vi.fn(),
		updateTaskStatus: vi.fn(),
	}),
}))

describe('TaskListSceneView', () => {
	beforeEach(() => {
		listTaskLinksMock.mockReset().mockReturnValue(new Promise(() => undefined))
		useShellPreferenceStore.setState({
			projectTaskBoardOpenSections: ['todo', 'doing', 'waiting', 'done', 'canceled'],
		})
	})

	it('collection scene 独占 flat/selection，并在折叠聚焦分区时输出一次可消费 intent', async () => {
		renderTaskCollectionOwner()

		fireEvent.click(screen.getByRole('button', { name: '聚焦并选择进行中 C' }))
		fireEvent.click(screen.getByRole('button', { name: '折叠进行中' }))

		await waitFor(() => expect(screen.getByTestId('owner-focused')).toHaveTextContent('todo-a'))
		expect(screen.getByTestId('owner-rows')).toHaveTextContent('todo-a,todo-b')
		expect(screen.getByTestId('owner-selected')).toHaveTextContent('doing-c')
		expect(screen.getByTestId('owner-intent')).toHaveTextContent(
			JSON.stringify({
				type: 'group-trigger',
				groupKey: 'h:doing',
				reentry: { type: 'item', key: 'todo-a' },
			}),
		)

		fireEvent.click(screen.getByRole('button', { name: '消费焦点意图' }))
		expect(screen.getByTestId('owner-intent')).toHaveTextContent('none')
	})

	it('显式 task:deleted 批次只按删除前快照迁移一次焦点', async () => {
		renderTaskCollectionOwner()

		fireEvent.click(screen.getByRole('button', { name: '聚焦并选择待执行 B' }))
		fireEvent.click(screen.getByRole('button', { name: '批量删除待执行' }))

		await waitFor(() => expect(screen.getByTestId('owner-focused')).toHaveTextContent('doing-c'))
		expect(screen.getByTestId('owner-intent')).toHaveTextContent(
			JSON.stringify({ type: 'item', key: 'doing-c' }),
		)
	})

	it('键盘 Peek 打开时隐藏当前行焦点边框，关闭后恢复', () => {
		renderTaskCollectionOwner()

		fireEvent.click(screen.getByRole('button', { name: '键盘预览待执行 A' }))
		expect(screen.getByTestId('owner-suppressed-focus')).toHaveTextContent('true')

		fireEvent.click(screen.getByRole('button', { name: '关闭键盘预览' }))
		expect(screen.getByTestId('owner-suppressed-focus')).toHaveTextContent('false')

		fireEvent.click(screen.getByRole('button', { name: '鼠标预览待执行 A' }))
		expect(screen.getByTestId('owner-suppressed-focus')).toHaveTextContent('false')
	})
})

const TEST_DISPLAY = {
	options: {
		groupBy: 'status',
		subGroupBy: 'none',
		orderBy: 'manual',
		orderDirection: 'asc',
		completedOrder: 'natural',
		showCompleted: true,
		showEmptyGroups: false,
		visibleProperties: ['status'],
	},
	status: 'ready',
	error: null,
	isDirty: false,
	personalOverride: {},
	actions: {
		applyPartial: async () => undefined,
		setGrouping: async () => undefined,
		setSubGrouping: async () => undefined,
		setOrdering: async () => undefined,
		setCompletedOrder: async () => undefined,
		setVisibleProperties: async () => undefined,
		setAsDefault: async () => undefined,
		resetToDefault: async () => undefined,
		reload: async () => undefined,
	},
} satisfies UseTaskDisplayOptionsResult

const OWNER_TASKS = [
	createTask({ id: 'todo-a', title: '待执行 A', status: 'todo' }),
	createTask({ id: 'todo-b', title: '待执行 B', status: 'todo' }),
	createTask({ id: 'doing-c', title: '进行中 C', status: 'doing' }),
]

function renderTaskCollectionOwner() {
	return render(
		<CommandSelectionProvider>
			<TaskPreviewProvider>
				<TaskCollectionOwnerHarness />
			</TaskPreviewProvider>
		</CommandSelectionProvider>,
	)
}

function TaskCollectionOwnerHarness() {
	const [tasks, setTasks] = useState(OWNER_TASKS)
	const taskPreviewController = useTaskPreviewController()
	const scene = useTaskCollectionScene({
		source: { items: tasks, status: 'ready' },
		displayPageKey: 'task:all',
		display: TEST_DISPLAY,
		supportsProject: true,
		fallbackSubtitle: '无项目',
		activeTaskId: null,
		onCreateTask: () => undefined,
		projectOptions: [],
		spaces: [],
		showProjectCellOptions: false,
		empty: {},
	})
	const { collectionInteraction, flatItems, focusIntent } = scene.boardProps

	return (
		<div>
			<button onClick={() => taskPreviewController.openPreview('todo-a', 'keyboard')} type='button'>
				键盘预览待执行 A
			</button>
			<button onClick={taskPreviewController.closePreview} type='button'>
				关闭键盘预览
			</button>
			<button onClick={() => taskPreviewController.openPreview('todo-a', 'pointer')} type='button'>
				鼠标预览待执行 A
			</button>
			<button
				onClick={() => {
					collectionInteraction.focusKey('doing-c')
					collectionInteraction.toggleSelection('doing-c')
				}}
				type='button'
			>
				聚焦并选择进行中 C
			</button>
			<button
				onClick={() => {
					collectionInteraction.focusKey('todo-b')
					collectionInteraction.toggleSelection('todo-b')
				}}
				type='button'
			>
				聚焦并选择待执行 B
			</button>
			<button
				onClick={() => scene.boardProps.onSectionOpenChange('h:doing', 'doing', false)}
				type='button'
			>
				折叠进行中
			</button>
			<button
				onClick={() => {
					emitEvent({ type: 'task:deleted', payload: { taskId: 'todo-a' } })
					emitEvent({ type: 'task:deleted', payload: { taskId: 'todo-b' } })
					setTasks((currentTasks) =>
						currentTasks.filter((task) => task.id !== 'todo-a' && task.id !== 'todo-b'),
					)
				}}
				type='button'
			>
				批量删除待执行
			</button>
			<button
				onClick={() => {
					if (focusIntent) scene.boardProps.onFocusIntentConsumed(focusIntent)
				}}
				type='button'
			>
				消费焦点意图
			</button>
			<div data-testid='owner-rows'>
				{flatItems.flatMap((item) => (item.kind === 'row' ? [item.key] : [])).join(',')}
			</div>
			<div data-testid='owner-focused'>{collectionInteraction.focusedKey ?? 'none'}</div>
			<div data-testid='owner-selected'>{[...collectionInteraction.selectedKeys].join(',')}</div>
			<div data-testid='owner-intent'>{focusIntent ? JSON.stringify(focusIntent) : 'none'}</div>
			<div data-testid='owner-suppressed-focus'>
				{String(scene.boardProps.suppressFocusIndicator)}
			</div>
		</div>
	)
}

function createTask(
	overrides: Partial<TaskListItem> & Pick<TaskListItem, 'id' | 'title'>,
): TaskListItem {
	return {
		id: overrides.id,
		title: overrides.title,
		spaceId: 'space-1',
		spaceName: '工作',
		spaceSlug: 'work',
		projectId: null,
		projectName: null,
		status: overrides.status ?? 'todo',
		statusChangedAt: '2026-08-17T08:00:00.000Z',
		priority: 0,
		dueAt: null,
		plannedAt: null,
		remindAt: null,
		completedAt: null,
		canceledAt: null,
		archivedAt: null,
		createdAt: '2026-08-17T08:00:00.000Z',
		updatedAt: '2026-08-17T08:00:00.000Z',
	}
}

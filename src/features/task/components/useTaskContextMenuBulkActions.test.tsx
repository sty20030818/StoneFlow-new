import { act, renderHook } from '@testing-library/react'
import type { PropsWithChildren } from 'react'

import {
	BulkActionProvider,
	TASK_BULK_ACTION_IDS,
	createBulkActionResult,
	type BulkAction,
	type BulkActionId,
	type BulkActionPayload,
	type BulkSelectionSnapshot,
} from '@/features/bulk-action'
import { DangerConfirmProvider } from '@/features/danger-confirm'
import type { TaskPlacementTarget } from '@/features/metadata-fields'
import type { TaskListItem } from '@/shared/types'

import { useTaskContextMenuBulkActions } from './useTaskContextMenuBulkActions'

const toastSuccessSpy = vi.fn()
const toastErrorSpy = vi.fn()

vi.mock('sonner', () => ({
	toast: {
		success: (message: string) => toastSuccessSpy(message),
		error: (message: string) => toastErrorSpy(message),
	},
}))

type BulkActionCall = {
	actionId: BulkActionId
	payload?: BulkActionPayload
	snapshot: BulkSelectionSnapshot
}

function buildTask(partial: Partial<TaskListItem> = {}): TaskListItem {
	return {
		id: 'task-1',
		spaceId: 'space-1',
		spaceName: '个人',
		spaceSlug: 'personal',
		projectId: 'project-1',
		projectName: '项目 A',
		title: '任务 A',
		status: 'todo',
		statusChangedAt: '2026-05-07T08:00:00.000Z',
		priority: 1,
		dueAt: '2026-05-08T08:00:00.000Z',
		plannedAt: '2026-05-09T08:00:00.000Z',
		remindAt: '2026-05-07T09:00:00.000Z',
		completedAt: null,
		canceledAt: null,
		archivedAt: null,
		createdAt: '2026-05-06T08:00:00.000Z',
		updatedAt: '2026-05-07T08:00:00.000Z',
		...partial,
	}
}

describe('useTaskContextMenuBulkActions', () => {
	beforeEach(() => {
		toastSuccessSpy.mockReset()
		toastErrorSpy.mockReset()
	})

	it('把右键属性动作映射到任务 bulk action 和 payload', async () => {
		const calls: BulkActionCall[] = []
		const tasks = [buildTask(), buildTask({ id: 'task-2', title: '任务 B' })]
		const { result } = renderTaskContextMenuBulkActions({ calls })

		await act(async () => {
			result.current.onSelectStatus(tasks, 'done')
			result.current.onSelectPriority(tasks, 3)
			result.current.onSelectDueDate(tasks, null)
			result.current.onSelectPlacement(tasks, {
				kind: 'project',
				projectId: 'project-2',
				spaceId: 'space-1',
			})
			result.current.onSelectPlacement(tasks, {
				kind: 'standalone',
				spaceId: 'space-1',
			})
		})

		expect(calls.map((call) => call.actionId)).toEqual([
			TASK_BULK_ACTION_IDS.setStatusSelected,
			TASK_BULK_ACTION_IDS.setPrioritySelected,
			TASK_BULK_ACTION_IDS.setDateSelected,
			TASK_BULK_ACTION_IDS.setPlacementSelected,
			TASK_BULK_ACTION_IDS.setPlacementSelected,
		])
		expect(calls.map((call) => call.payload)).toEqual([
			{ status: 'done' },
			{ priority: 3 },
			{ dueAt: null },
			{
				target: {
					kind: 'project',
					projectId: 'project-2',
					spaceId: 'space-1',
				} satisfies TaskPlacementTarget,
			},
			{
				target: {
					kind: 'standalone',
					spaceId: 'space-1',
				} satisfies TaskPlacementTarget,
			},
		])
		expect(calls[0].snapshot).toMatchObject({
			entity: 'task',
			ids: ['task-1', 'task-2'],
			source: 'context-menu',
		})
	})
})

function renderTaskContextMenuBulkActions({ calls }: { calls: BulkActionCall[] }) {
	return renderHook(() => useTaskContextMenuBulkActions(), {
		wrapper: ({ children }: PropsWithChildren) => (
			<DangerConfirmProvider>
				<BulkActionProvider actions={createTestBulkActions(calls)}>{children}</BulkActionProvider>
			</DangerConfirmProvider>
		),
	})
}

function createTestBulkActions(calls: BulkActionCall[]): BulkAction[] {
	return Object.values(TASK_BULK_ACTION_IDS).map((actionId) => ({
		id: actionId,
		entity: 'task',
		label: actionId,
		intent: resolveBulkActionIntent(actionId),
		run: async (snapshot, _context, payload) => {
			calls.push({ actionId, payload, snapshot })
			return createBulkActionResult({
				status: 'success',
				actionId,
				snapshot,
				succeededIds: snapshot.ids,
				shouldClearSelection:
					actionId === TASK_BULK_ACTION_IDS.archiveSelected ||
					actionId === TASK_BULK_ACTION_IDS.deleteSelected,
			})
		},
	}))
}

function resolveBulkActionIntent(actionId: BulkActionId): BulkAction['intent'] {
	if (actionId === TASK_BULK_ACTION_IDS.archiveSelected) {
		return 'archive'
	}
	if (actionId === TASK_BULK_ACTION_IDS.deleteSelected) {
		return 'delete'
	}
	if (actionId === TASK_BULK_ACTION_IDS.setPlacementSelected) {
		return 'move'
	}
	if (actionId === TASK_BULK_ACTION_IDS.completeSelected) {
		return 'complete'
	}
	return 'update'
}

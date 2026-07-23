import { TASK_BULK_ACTION_IDS } from '@/features/bulk-action'
import type { TaskListItem } from '@/shared/types'

import {
	getTaskBulkCommandActionId,
	registerTaskCommands,
	runTaskRowBulkCommand,
} from './taskBulkCommandHandlers'

describe('task bulk command handlers', () => {
	it('命令菜单与行快捷键共用 complete/archive/delete action id', () => {
		expect(getTaskBulkCommandActionId('complete')).toBe(TASK_BULK_ACTION_IDS.completeSelected)
		expect(getTaskBulkCommandActionId('archive')).toBe(TASK_BULK_ACTION_IDS.archiveSelected)
		expect(getTaskBulkCommandActionId('delete')).toBe(TASK_BULK_ACTION_IDS.deleteSelected)
	})

	it('registerTaskCommands 绑定 host bulk 端口', async () => {
		const run = vi.fn(
			async (_ctx: unknown, entity: string, actionId: string, _labels: unknown): Promise<void> => {
				void entity
				void actionId
			},
		)
		const actions = registerTaskCommands({
			runEntityBulkActionFromCommand: run,
			activeDetail: null,
			closeEntityDrawer: vi.fn(),
			taskPreviewController: {
				previewState: { open: false },
				openPreview: vi.fn(),
				closePreview: vi.fn(),
			},
		})
		const ctx = {
			selection: { type: 'task' as const, ids: ['t1'] },
		} as never

		await actions.completeSelectedTasks(ctx)
		await actions.requestArchiveSelectedTasks(ctx)
		await actions.requestDeleteSelectedTasks(ctx)

		expect(run).toHaveBeenCalledTimes(3)
		expect(run.mock.calls[0]?.[2]).toBe(TASK_BULK_ACTION_IDS.completeSelected)
		expect(run.mock.calls[1]?.[2]).toBe(TASK_BULK_ACTION_IDS.archiveSelected)
		expect(run.mock.calls[2]?.[2]).toBe(TASK_BULK_ACTION_IDS.deleteSelected)
	})

	it('runTaskRowBulkCommand 用同一 action id 并在成功时可清空 selection', async () => {
		const clearSelection = vi.fn()
		const runBulkAction = vi.fn(async () => ({
			status: 'success' as const,
			actionId: TASK_BULK_ACTION_IDS.archiveSelected,
			entity: 'task' as const,
			requestedIds: ['t1'],
			succeededIds: ['t1'],
			failedIds: [],
			skippedIds: [],
			shouldClearSelection: true,
		}))

		await runTaskRowBulkCommand({
			kind: 'archive',
			tasks: [createTask()],
			runBulkAction,
			clearSelection,
		})

		expect(runBulkAction).toHaveBeenCalledWith(
			TASK_BULK_ACTION_IDS.archiveSelected,
			expect.objectContaining({ ids: ['t1'], source: 'row-shortcut' }),
		)
		expect(clearSelection).toHaveBeenCalled()
	})
})

function createTask(overrides: Partial<TaskListItem> = {}): TaskListItem {
	return {
		id: 't1',
		spaceId: 'space-1',
		spaceName: '工作',
		spaceSlug: 'work',
		projectId: null,
		projectName: null,
		title: '任务',
		note: null,
		status: 'todo',
		statusChangedAt: '2026-01-01T00:00:00Z',
		priority: 0,
		dueAt: null,
		plannedAt: null,
		remindAt: null,
		completedAt: null,
		canceledAt: null,
		archivedAt: null,
		createdAt: '2026-01-01T00:00:00Z',
		updatedAt: '2026-01-01T00:00:00Z',
		...overrides,
	}
}

import { TASK_BULK_ACTION_IDS } from '@/features/bulk-action'
import { createEmptyCommandContext } from '@/features/command'

import { registerTaskCommands } from './taskBulkCommandHandlers'

describe('registerTaskCommands', () => {
	it('将批量、Peek 与打开详情统一绑定到 host 端口', async () => {
		const invocation = { source: 'row-shortcut' } as const
		const run = vi.fn(
			async (
				_ctx: unknown,
				_invocation: unknown,
				entity: string,
				actionId: string,
				_labels: unknown,
			): Promise<void> => {
				void entity
				void actionId
			},
		)
		const openTaskDetail = vi.fn()
		const openPreview = vi.fn()
		const actions = registerTaskCommands({
			runEntityBulkActionFromCommand: run,
			activeDetail: null,
			closeEntityDrawer: vi.fn(),
			openTaskDetail,
			taskPreviewController: {
				previewState: { open: false },
				openPreview,
				closePreview: vi.fn(),
			},
		})
		const emptyContext = createEmptyCommandContext()
		const ctx = {
			...emptyContext,
			selection: {
				...emptyContext.selection,
				type: 'task' as const,
				ids: ['t1'],
				isSingleSelection: true,
			},
		}

		await actions.completeSelectedTasks(ctx, invocation)
		await actions.requestArchiveSelectedTasks(ctx, invocation)
		await actions.requestDeleteSelectedTasks(ctx, invocation)
		actions.peekTask(ctx)
		actions.openTaskDetail(ctx)

		expect(run).toHaveBeenCalledTimes(3)
		expect(run.mock.calls[0]?.[1]).toBe(invocation)
		expect(run.mock.calls[0]?.[3]).toBe(TASK_BULK_ACTION_IDS.completeSelected)
		expect(run.mock.calls[1]?.[3]).toBe(TASK_BULK_ACTION_IDS.archiveSelected)
		expect(run.mock.calls[2]?.[3]).toBe(TASK_BULK_ACTION_IDS.deleteSelected)
		expect(openPreview).toHaveBeenCalledWith('t1', 'keyboard')
		expect(openTaskDetail).toHaveBeenCalledWith('t1')
	})
})

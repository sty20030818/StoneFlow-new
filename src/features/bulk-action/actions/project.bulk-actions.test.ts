import {
	PROJECT_BULK_ACTION_IDS,
	createBulkSelectionSnapshot,
	shouldConfirmAction,
} from '@/features/bulk-action/core'
import type { ProjectBulkAdapter } from '@/features/bulk-action/adapters'

import { projectBulkActions } from './project.bulk-actions'

const snapshot = createBulkSelectionSnapshot({
	entity: 'project',
	ids: ['project-a', 'project-b'],
	source: 'bulk-bar',
	entities: [
		{ id: 'project-a', title: '项目 A' },
		{ id: 'project-b', title: '项目 B' },
	],
})

describe('projectBulkActions', () => {
	it('archive/delete 使用 adapter 执行并成功后清空 selection', async () => {
		const adapter = createAdapter()

		await expect(
			getAction(PROJECT_BULK_ACTION_IDS.archiveSelected).run(snapshot, { adapter }),
		).resolves.toMatchObject({
			status: 'success',
			actionId: PROJECT_BULK_ACTION_IDS.archiveSelected,
			shouldClearSelection: true,
		})
		await expect(
			getAction(PROJECT_BULK_ACTION_IDS.deleteSelected).run(snapshot, { adapter }),
		).resolves.toMatchObject({
			status: 'success',
			actionId: PROJECT_BULK_ACTION_IDS.deleteSelected,
			shouldClearSelection: true,
		})

		expect(adapter.archiveProject).toHaveBeenCalledWith(['project-a', 'project-b'])
		expect(adapter.deleteProject).toHaveBeenCalledWith(['project-a', 'project-b'])
	})

	it('归档和删除声明确认策略，删除为 destructive', () => {
		const archiveAction = getAction(PROJECT_BULK_ACTION_IDS.archiveSelected)
		const deleteAction = getAction(PROJECT_BULK_ACTION_IDS.deleteSelected)

		expect(shouldConfirmAction(archiveAction, snapshot)).toBe(true)
		expect(archiveAction.getConfirmCopy?.(snapshot)).toEqual({
			title: '归档选中项目？',
			description: '将归档 2 个项目。归档后可在归档页中恢复。',
			confirmLabel: '确认归档',
		})
		expect(deleteAction.tone).toBe('destructive')
		expect(shouldConfirmAction(deleteAction, snapshot)).toBe(true)
		expect(deleteAction.getConfirmCopy?.(snapshot)).toEqual({
			title: '删除选中项目？',
			description: '将删除 2 个项目。删除后可在回收站中恢复。',
			confirmLabel: '确认删除',
		})
	})

	it('缺 adapter 时返回 failed', async () => {
		await expect(
			getAction(PROJECT_BULK_ACTION_IDS.archiveSelected).run(snapshot, {}),
		).resolves.toMatchObject({
			status: 'failed',
			actionId: PROJECT_BULK_ACTION_IDS.archiveSelected,
		})
	})

	it('部分失败或跳过时返回 partial 且不清空 selection', async () => {
		const adapter = createAdapter({
			archiveProject: vi.fn<ProjectBulkAdapter['archiveProject']>(() =>
				Promise.resolve({
					requestedIds: ['project-a', 'project-b'],
					succeededIds: ['project-a'],
					failedIds: [],
					skippedIds: ['project-b'],
				}),
			),
		})

		await expect(
			getAction(PROJECT_BULK_ACTION_IDS.archiveSelected).run(snapshot, { adapter }),
		).resolves.toMatchObject({
			status: 'partial',
			shouldClearSelection: false,
			succeededIds: ['project-a'],
			skippedIds: ['project-b'],
		})
	})
})

function getAction(actionId: string) {
	const action = projectBulkActions.find((item) => item.id === actionId)
	if (!action) {
		throw new Error(`missing test action: ${actionId}`)
	}
	return action
}

function createAdapter(overrides: Partial<ProjectBulkAdapter> = {}): ProjectBulkAdapter {
	const report = {
		requestedIds: ['project-a', 'project-b'],
		succeededIds: ['project-a', 'project-b'],
		failedIds: [],
		skippedIds: [],
	}

	return {
		archiveProject: vi.fn<ProjectBulkAdapter['archiveProject']>(() => Promise.resolve(report)),
		deleteProject: vi.fn<ProjectBulkAdapter['deleteProject']>(() => Promise.resolve(report)),
		...overrides,
	}
}

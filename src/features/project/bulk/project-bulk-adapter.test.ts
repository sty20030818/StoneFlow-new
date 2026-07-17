import { emitEvent } from '@/shared/events'

import type { ProjectDetail } from '../model/types'
import { createProjectBulkAdapter } from './project-bulk-adapter'

vi.mock('@/shared/events', () => ({
	emitEvent: vi.fn<(event: unknown) => void>(),
}))

describe('ProjectBulkAdapter', () => {
	it('懒加载可见项目列表，只在执行项目批量操作时读取', async () => {
		const refreshLoadedSlices = vi.fn<() => Promise<void>>(() => Promise.resolve())
		const loadAvailableProjectIds = vi.fn<() => Promise<string[]>>(() =>
			Promise.resolve(['project-a']),
		)
		const archiveProject = vi.fn<(projectId: string) => Promise<ProjectDetail>>((projectId) =>
			Promise.resolve(createProjectDetail(projectId)),
		)
		const adapter = createProjectBulkAdapter({
			availableProjectIds: loadAvailableProjectIds,
			archiveProject: archiveProject as never,
			refreshLoadedSlices,
		})

		expect(loadAvailableProjectIds).not.toHaveBeenCalled()

		const result = await adapter.archiveProject(['project-a'])

		expect(result.succeededIds).toEqual(['project-a'])
		expect(loadAvailableProjectIds).toHaveBeenCalledTimes(1)
		expect(archiveProject).toHaveBeenCalledTimes(1)
	})

	it('archive 多 id 后只刷新一次', async () => {
		const refreshLoadedSlices = vi.fn<() => Promise<void>>(() => Promise.resolve())
		const archiveProject = vi.fn<(projectId: string) => Promise<ProjectDetail>>((projectId) =>
			Promise.resolve(createProjectDetail(projectId)),
		)
		const adapter = createProjectBulkAdapter({
			availableProjectIds: ['project-a', 'project-b'],
			archiveProject: archiveProject as never,
			refreshLoadedSlices,
		})

		const result = await adapter.archiveProject(['project-a', 'project-b'])

		expect(result).toEqual({
			requestedIds: ['project-a', 'project-b'],
			succeededIds: ['project-a', 'project-b'],
			failedIds: [],
			skippedIds: [],
		})
		expect(archiveProject).toHaveBeenCalledTimes(2)
		expect(refreshLoadedSlices).toHaveBeenCalledTimes(1)
	})

	it('delete 单个 id 失败时不中断其余 id', async () => {
		const refreshLoadedSlices = vi.fn<() => Promise<void>>(() => Promise.resolve())
		const deleteProject = vi.fn<(projectId: string) => Promise<ProjectDetail>>((projectId) => {
			if (projectId === 'project-b') {
				return Promise.reject(new Error('boom'))
			}
			return Promise.resolve(createProjectDetail(projectId))
		})
		const adapter = createProjectBulkAdapter({
			availableProjectIds: ['project-a', 'project-b', 'project-c'],
			deleteProject: deleteProject as never,
			refreshLoadedSlices,
		})

		const result = await adapter.deleteProject(['project-a', 'project-b', 'project-c'])

		expect(result).toEqual({
			requestedIds: ['project-a', 'project-b', 'project-c'],
			succeededIds: ['project-a', 'project-c'],
			failedIds: ['project-b'],
			skippedIds: [],
		})
		expect(deleteProject).toHaveBeenCalledTimes(3)
		expect(refreshLoadedSlices).toHaveBeenCalledTimes(1)
	})

	it('跳过当前切片不存在的 id', async () => {
		const refreshLoadedSlices = vi.fn<() => Promise<void>>(() => Promise.resolve())
		const archiveProject = vi.fn<(projectId: string) => Promise<ProjectDetail>>((projectId) =>
			Promise.resolve(createProjectDetail(projectId)),
		)
		const adapter = createProjectBulkAdapter({
			availableProjectIds: ['project-a'],
			archiveProject: archiveProject as never,
			refreshLoadedSlices,
		})

		const result = await adapter.archiveProject(['project-a', 'missing-project'])

		expect(result).toEqual({
			requestedIds: ['project-a', 'missing-project'],
			succeededIds: ['project-a'],
			failedIds: [],
			skippedIds: ['missing-project'],
		})
		expect(archiveProject).toHaveBeenCalledTimes(1)
		expect(refreshLoadedSlices).toHaveBeenCalledTimes(1)
	})

	it('archive/delete 触发 project 与 lifecycle 事件', async () => {
		const refreshLoadedSlices = vi.fn<() => Promise<void>>(() => Promise.resolve())
		const archiveProject = vi.fn<(projectId: string) => Promise<ProjectDetail>>((projectId) =>
			Promise.resolve(createProjectDetail(projectId)),
		)
		const deleteProject = vi.fn<(projectId: string) => Promise<ProjectDetail>>((projectId) =>
			Promise.resolve(createProjectDetail(projectId)),
		)
		const adapter = createProjectBulkAdapter({
			availableProjectIds: ['project-a', 'project-b'],
			archiveProject: archiveProject as never,
			deleteProject: deleteProject as never,
			refreshLoadedSlices,
		})

		await adapter.archiveProject(['project-a'])
		await adapter.deleteProject(['project-b'])

		expect(emitEvent).toHaveBeenCalledWith({
			type: 'project:updated',
			payload: { projectId: 'project-a' },
		})
		expect(emitEvent).toHaveBeenCalledWith({
			type: 'lifecycle:changed',
			payload: { entityType: 'project', entityId: 'project-a', operation: 'archive' },
		})
		expect(emitEvent).toHaveBeenCalledWith({
			type: 'project:deleted',
			payload: { projectId: 'project-b' },
		})
		expect(emitEvent).toHaveBeenCalledWith({
			type: 'lifecycle:changed',
			payload: { entityType: 'project', entityId: 'project-b', operation: 'delete' },
		})
	})
})

function createProjectDetail(projectId: string): ProjectDetail {
	return {
		id: projectId,
		spaceId: 'space-a',
		name: projectId,
		description: null,
		dueAt: null,
		sortOrder: 1000,
		completedAt: null,
		archivedAt: null,
		deletedAt: null,
		createdAt: '2026-05-17T00:00:00.000Z',
		updatedAt: '2026-05-17T00:00:00.000Z',
		spaceName: 'Space A',
		taskCount: 3,
		activeTaskCount: 2,
	}
}

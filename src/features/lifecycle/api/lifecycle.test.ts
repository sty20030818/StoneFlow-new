import { invoke } from '@tauri-apps/api/core'

import {
	deleteLifecycleEntry,
	listLifecycleEntries,
	permanentlyDeleteLifecycleEntry,
	restoreLifecycleEntry,
} from '@/features/lifecycle/api/lifecycle'
import { deleteProject, restoreProject } from '@/features/project/api/projects'
import { deleteSpace, restoreSpace } from '@/features/space/api/spaces'
import { deleteTask, restoreTask } from '@/features/task/api/tasks'

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn<(cmd: string, args?: Record<string, unknown>) => Promise<unknown>>(),
}))

vi.mock('@/features/project/api/projects', () => ({
	deleteProject: vi.fn<(projectId: string) => Promise<unknown>>(),
	restoreProject: vi.fn<(projectId: string) => Promise<unknown>>(),
}))

vi.mock('@/features/space/api/spaces', () => ({
	deleteSpace: vi.fn<(spaceId: string) => Promise<unknown>>(),
	restoreSpace: vi.fn<(spaceId: string) => Promise<unknown>>(),
}))

vi.mock('@/features/task/api/tasks', () => ({
	deleteTask: vi.fn<(taskId: string) => Promise<unknown>>(),
	restoreTask: vi.fn<(taskId: string) => Promise<unknown>>(),
}))

const mockedInvoke = vi.mocked(invoke)

describe('lifecycle api', () => {
	afterEach(() => {
		mockedInvoke.mockReset()
		vi.mocked(deleteProject).mockReset()
		vi.mocked(restoreProject).mockReset()
		vi.mocked(deleteSpace).mockReset()
		vi.mocked(restoreSpace).mockReset()
		vi.mocked(deleteTask).mockReset()
		vi.mocked(restoreTask).mockReset()
	})

	it('读取归档与回收站列表时发送统一生命周期载荷', async () => {
		mockedInvoke.mockResolvedValue([])

		await listLifecycleEntries({
			mode: 'archive',
			scope: { type: 'space', spaceId: 'space-1' },
			entityFilter: 'task',
		})
		await listLifecycleEntries({
			mode: 'trash',
			scope: { type: 'all' },
		})

		expect(mockedInvoke).toHaveBeenNthCalledWith(1, 'list_archive_entries', {
			input: {
				scope: { type: 'space', spaceId: 'space-1' },
				entityFilter: 'task',
			},
		})
		expect(mockedInvoke).toHaveBeenNthCalledWith(2, 'list_trash_entries', {
			input: {
				scope: { type: 'all' },
				entityFilter: null,
			},
		})
	})

	it('恢复、软删除与永久删除会路由到正确命令', async () => {
		vi.mocked(deleteSpace).mockResolvedValue({} as Awaited<ReturnType<typeof deleteSpace>>)
		vi.mocked(restoreProject).mockResolvedValue({} as Awaited<ReturnType<typeof restoreProject>>)
		mockedInvoke.mockResolvedValue(undefined)

		await deleteLifecycleEntry({
			id: 'space-1',
			entityType: 'space',
			title: '工作',
			spaceId: 'space-1',
			spaceName: '工作',
			projectId: null,
			projectName: null,
			archivedAt: '2026-05-01T00:00:00Z',
			deletedAt: null,
			sourceType: 'self',
			sourceId: 'space-1',
			restoreHint: '',
		})
		await restoreLifecycleEntry({
			id: 'project-1',
			entityType: 'project',
			title: '项目 A',
			spaceId: 'space-1',
			spaceName: '工作',
			projectId: 'project-1',
			projectName: '项目 A',
			archivedAt: null,
			deletedAt: '2026-05-01T00:00:00Z',
			sourceType: 'self',
			sourceId: 'project-1',
			restoreHint: '',
		})
		await permanentlyDeleteLifecycleEntry({
			id: 'task-1',
			entityType: 'task',
			title: '任务 A',
			spaceId: 'space-1',
			spaceName: '工作',
			projectId: 'project-1',
			projectName: '项目 A',
			archivedAt: null,
			deletedAt: '2026-05-01T00:00:00Z',
			sourceType: 'project',
			sourceId: 'project-1',
			restoreHint: '',
		})

		expect(deleteSpace).toHaveBeenCalledWith('space-1')
		expect(restoreProject).toHaveBeenCalledWith('project-1')
		expect(mockedInvoke).toHaveBeenCalledWith('permanently_delete_task', {
			input: { taskId: 'task-1' },
		})
	})
})

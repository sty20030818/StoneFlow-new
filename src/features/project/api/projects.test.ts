import { invoke } from '@tauri-apps/api/core'

import {
	archiveProject,
	createProject,
	listProjectOverview,
	listSidebarProjects,
	updateProject,
} from '@/features/project/api/projects'

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn<(cmd: string, args?: Record<string, unknown>) => Promise<unknown>>(),
}))

const mockedInvoke = vi.mocked(invoke)

describe('projects api', () => {
	afterEach(() => {
		mockedInvoke.mockReset()
	})

	it('读取 Project Overview 时发送 scope 与 viewKey', async () => {
		mockedInvoke.mockResolvedValue([])

		await listProjectOverview({ type: 'space', spaceId: 'space-1' }, 'completed')

		expect(mockedInvoke).toHaveBeenCalledWith('list_project_overview', {
			input: {
				scope: {
					type: 'space',
					spaceId: 'space-1',
				},
				viewKey: 'completed',
			},
		})
	})

	it('读取 Sidebar Projects 时固定请求完整可见列表', async () => {
		mockedInvoke.mockResolvedValue([])

		await listSidebarProjects({ type: 'all' })

		expect(mockedInvoke).toHaveBeenCalledWith('list_sidebar_projects', {
			input: {
				scope: { type: 'all' },
				showCompleted: true,
				maxVisible: null,
			},
		})
	})

	it('创建、更新和归档 Project 时保持 camelCase 载荷', async () => {
		mockedInvoke.mockResolvedValue({
			id: 'project-1',
			spaceId: 'space-1',
			spaceName: '个人',
			name: '阶段 5',
			description: null,
			dueAt: null,
			position: 1000,
			taskCount: 0,
			activeTaskCount: 0,
			completedAt: null,
			archivedAt: null,
			deletedAt: null,
			createdAt: '2026-04-30T00:00:00Z',
			updatedAt: '2026-04-30T00:00:00Z',
		})

		await createProject({
			spaceId: 'space-1',
			name: '阶段 5',
			description: null,
			dueAt: null,
		})
		await updateProject({
			projectId: 'project-1',
			name: '阶段 5 收口',
			description: '接 Project 真数据',
			dueAt: '2026-05-01',
			position: 2000,
		})
		await archiveProject('project-1')

		expect(mockedInvoke).toHaveBeenNthCalledWith(1, 'create_project', {
			input: {
				spaceId: 'space-1',
				name: '阶段 5',
				description: null,
				dueAt: null,
			},
		})
		expect(mockedInvoke).toHaveBeenNthCalledWith(2, 'update_project', {
			input: {
				projectId: 'project-1',
				name: '阶段 5 收口',
				description: '接 Project 真数据',
				dueAt: '2026-05-01',
				position: 2000,
			},
		})
		expect(mockedInvoke).toHaveBeenNthCalledWith(3, 'archive_project', {
			input: { projectId: 'project-1' },
		})
	})
})

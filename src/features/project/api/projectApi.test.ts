import { invoke } from '@tauri-apps/api/core'
import type * as TauriCore from '@tauri-apps/api/core'

import { createProject } from '@/features/project/api/createProject'
import { getProjectExecutionView } from '@/features/project/api/getProjectExecutionView'
import { listProjects } from '@/features/project/api/listProjects'

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn<typeof TauriCore.invoke>(),
}))

const mockedInvoke = vi.mocked(invoke)

describe('project api', () => {
	afterEach(() => {
		vi.clearAllMocks()
	})

	it('映射一层 Project 树', async () => {
		mockedInvoke.mockResolvedValue({
			projects: [
				{
					id: 'project-1',
					name: '执行层',
					status: 'active',
					sort_order: 0,
					children: [
						{
							id: 'project-child',
							name: '子项目收口',
							status: 'active',
							sort_order: 0,
							children: [],
						},
					],
				},
			],
		})

		await expect(listProjects({ spaceSlug: 'work' })).resolves.toEqual([
			{
				id: 'project-1',
				parentProjectId: null,
				name: '执行层',
				status: 'active',
				sortOrder: 0,
				children: [
					{
						id: 'project-child',
						parentProjectId: 'project-1',
						name: '子项目收口',
						status: 'active',
						sortOrder: 0,
						children: [],
					},
				],
			},
		])

		expect(mockedInvoke).toHaveBeenCalledWith('list_projects', {
			input: {
				space_slug: 'work',
			},
		})
	})

	it('创建子项目时传递父项目 ID', async () => {
		mockedInvoke.mockResolvedValue({
			id: 'project-child',
			space_id: 'space-1',
			parent_project_id: 'project-1',
			name: '子项目收口',
			status: 'active',
			note: null,
			sort_order: 0,
			created_at: '2026-04-21T08:00:00Z',
			updated_at: '2026-04-21T08:00:00Z',
		})

		await expect(
			createProject({
				spaceSlug: 'work',
				name: '子项目收口',
				note: null,
				parentProjectId: 'project-1',
			}),
		).resolves.toMatchObject({
			id: 'project-child',
			parentProjectId: 'project-1',
		})

		expect(mockedInvoke).toHaveBeenCalledWith('create_project', {
			input: {
				space_slug: 'work',
				name: '子项目收口',
				note: null,
				parent_project_id: 'project-1',
			},
		})
	})

	it('映射 Project 执行视图直属子项目入口', async () => {
		mockedInvoke.mockResolvedValue({
			project: {
				id: 'project-1',
				name: '执行层',
				status: 'active',
				sort_order: 0,
			},
			child_projects: [
				{
					id: 'project-child',
					name: '子项目收口',
					status: 'active',
					sort_order: 0,
				},
			],
			tasks: [
				{
					id: 'task-1',
					title: '执行任务',
					note: null,
					priority: 'high',
					status: 'todo',
					due_at: '2026-04-22T08:00:00Z',
					completed_at: null,
					created_at: '2026-04-20T08:00:00Z',
					updated_at: '2026-04-21T08:00:00Z',
				},
			],
		})

		await expect(
			getProjectExecutionView({
				spaceSlug: 'work',
				projectId: 'project-1',
			}),
		).resolves.toMatchObject({
			childProjects: [
				{
					id: 'project-child',
					parentProjectId: 'project-1',
					name: '子项目收口',
				},
			],
			tasks: [
				{
					id: 'task-1',
					tags: [],
					dueAt: '2026-04-22T08:00:00Z',
					createdAt: '2026-04-20T08:00:00Z',
				},
			],
		})
	})
})

import { invoke } from '@tauri-apps/api/core'
import type * as TauriCore from '@tauri-apps/api/core'

import { getFocusViewTasks } from '@/features/focus/api/getFocusViewTasks'
import { listFocusViews } from '@/features/focus/api/listFocusViews'
import { updateTaskPinState } from '@/features/focus/api/updateTaskPinState'

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn<typeof TauriCore.invoke>(),
}))

const mockedInvoke = vi.mocked(invoke)

describe('focus api', () => {
	afterEach(() => {
		vi.clearAllMocks()
	})

	it('映射系统 Focus 视图列表', async () => {
		mockedInvoke.mockResolvedValue({
			views: [
				{
					id: 'view-focus',
					key: 'focus',
					name: 'Focus',
					sort_order: 0,
					is_enabled: true,
				},
				{
					id: 'view-recent',
					key: 'recent',
					name: '最近添加',
					sort_order: 2,
					is_enabled: false,
				},
			],
		})

		await expect(listFocusViews({ spaceSlug: 'default' })).resolves.toEqual([
			{
				id: 'view-focus',
				key: 'focus',
				name: 'Focus',
				sortOrder: 0,
				isEnabled: true,
			},
			{
				id: 'view-recent',
				key: 'recent',
				name: '最近添加',
				sortOrder: 2,
				isEnabled: false,
			},
		])

		expect(mockedInvoke).toHaveBeenCalledWith('list_focus_views', {
			input: {
				space_slug: 'default',
			},
		})
	})

	it('映射单个 Focus 视图任务集合', async () => {
		mockedInvoke.mockResolvedValue({
			view: {
				id: 'view-upcoming',
				key: 'upcoming',
				name: 'Upcoming',
				sort_order: 1,
				is_enabled: true,
			},
			tasks: [
				{
					id: 'task-1',
					project_id: 'project-1',
					title: '补齐截止时间',
					note: '优先验证排序',
					priority: 'high',
					status: 'todo',
					pinned: false,
					due_at: '2026-04-21T08:00:00Z',
					created_at: '2026-04-20T08:00:00Z',
					updated_at: '2026-04-20T09:00:00Z',
				},
				{
					id: 'task-2',
					project_id: 'project-1',
					title: '没有备注和截止时间',
					note: null,
					priority: 'urgent',
					status: 'done',
					pinned: true,
					due_at: null,
					created_at: '2026-04-20T10:00:00Z',
					updated_at: '2026-04-20T11:00:00Z',
				},
			],
		})

		await expect(
			getFocusViewTasks({
				spaceSlug: 'default',
				viewKey: 'upcoming',
			}),
		).resolves.toEqual({
			view: {
				id: 'view-upcoming',
				key: 'upcoming',
				name: 'Upcoming',
				sortOrder: 1,
				isEnabled: true,
			},
			tasks: [
				{
					id: 'task-1',
					projectId: 'project-1',
					title: '补齐截止时间',
					note: '优先验证排序',
					priority: 'high',
					status: 'todo',
					pinned: false,
					dueAt: '2026-04-21T08:00:00Z',
					createdAt: '2026-04-20T08:00:00Z',
					updatedAt: '2026-04-20T09:00:00Z',
				},
				{
					id: 'task-2',
					projectId: 'project-1',
					title: '没有备注和截止时间',
					note: null,
					priority: 'urgent',
					status: 'done',
					pinned: true,
					dueAt: null,
					createdAt: '2026-04-20T10:00:00Z',
					updatedAt: '2026-04-20T11:00:00Z',
				},
			],
		})

		expect(mockedInvoke).toHaveBeenCalledWith('get_focus_view_tasks', {
			input: {
				space_slug: 'default',
				view_key: 'upcoming',
			},
		})
	})

	it('映射 pin 状态切换结果', async () => {
		mockedInvoke.mockResolvedValue({
			task_id: 'task-1',
			pinned: true,
			updated_at: '2026-04-20T10:00:00Z',
		})

		await expect(
			updateTaskPinState({
				spaceSlug: 'default',
				taskId: 'task-1',
				pinned: true,
			}),
		).resolves.toEqual({
			taskId: 'task-1',
			pinned: true,
			updatedAt: '2026-04-20T10:00:00Z',
		})

		expect(mockedInvoke).toHaveBeenCalledWith('update_task_pin_state', {
			input: {
				space_slug: 'default',
				task_id: 'task-1',
				pinned: true,
			},
		})
	})

	it('映射 unpin 状态切换结果', async () => {
		mockedInvoke.mockResolvedValue({
			task_id: 'task-1',
			pinned: false,
			updated_at: '2026-04-20T10:30:00Z',
		})

		await expect(
			updateTaskPinState({
				spaceSlug: 'default',
				taskId: 'task-1',
				pinned: false,
			}),
		).resolves.toEqual({
			taskId: 'task-1',
			pinned: false,
			updatedAt: '2026-04-20T10:30:00Z',
		})

		expect(mockedInvoke).toHaveBeenCalledWith('update_task_pin_state', {
			input: {
				space_slug: 'default',
				task_id: 'task-1',
				pinned: false,
			},
		})
	})
})

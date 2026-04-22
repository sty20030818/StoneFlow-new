import { act, renderHook, waitFor } from '@testing-library/react'

import { useShellLayoutStore } from '@/app/layouts/shell/model/useShellLayoutStore'
import { deleteTaskToTrash } from '@/features/task-drawer/api/deleteTaskToTrash'
import { getTaskDrawerDetail } from '@/features/task-drawer/api/getTaskDrawerDetail'
import { listTaskResources } from '@/features/task-drawer/api/listTaskResources'
import { createTaskResource } from '@/features/task-drawer/api/createTaskResource'
import { openTaskResource } from '@/features/task-drawer/api/openTaskResource'
import { deleteTaskResource } from '@/features/task-drawer/api/deleteTaskResource'
import { updateTaskDrawerFields } from '@/features/task-drawer/api/updateTaskDrawerFields'
import type { TaskDrawerDetail, TaskDrawerTask } from '@/features/task-drawer/model/types'
import { useTaskDrawer } from '@/features/task-drawer/model/useTaskDrawer'

vi.mock('@/features/task-drawer/api/getTaskDrawerDetail', () => ({
	getTaskDrawerDetail: vi.fn<typeof getTaskDrawerDetail>(),
}))

vi.mock('@/features/task-drawer/api/updateTaskDrawerFields', () => ({
	updateTaskDrawerFields: vi.fn<typeof updateTaskDrawerFields>(),
}))

vi.mock('@/features/task-drawer/api/deleteTaskToTrash', () => ({
	deleteTaskToTrash: vi.fn<typeof deleteTaskToTrash>(),
}))

vi.mock('@/features/task-drawer/api/listTaskResources', () => ({
	listTaskResources: vi.fn<typeof listTaskResources>(),
}))

vi.mock('@/features/task-drawer/api/createTaskResource', () => ({
	createTaskResource: vi.fn<typeof createTaskResource>(),
}))

vi.mock('@/features/task-drawer/api/openTaskResource', () => ({
	openTaskResource: vi.fn<typeof openTaskResource>(),
}))

vi.mock('@/features/task-drawer/api/deleteTaskResource', () => ({
	deleteTaskResource: vi.fn<typeof deleteTaskResource>(),
}))

const mockedGetTaskDrawerDetail = vi.mocked(getTaskDrawerDetail)
const mockedUpdateTaskDrawerFields = vi.mocked(updateTaskDrawerFields)
const mockedDeleteTaskToTrash = vi.mocked(deleteTaskToTrash)

describe('useTaskDrawer', () => {
	afterEach(() => {
		vi.clearAllMocks()
		useShellLayoutStore.setState({
			taskDataVersion: 0,
			projectDataVersion: 0,
		})
	})

	it('保存成功后刷新 Drawer 详情并触发任务列表刷新', async () => {
		const initialDetail = createDetail({ title: '旧任务标题' })
		const savedTask = createTask({ title: '新任务标题' })
		const refreshedDetail = createDetail({ title: '新任务标题' })

		mockedGetTaskDrawerDetail
			.mockResolvedValueOnce(initialDetail)
			.mockResolvedValueOnce(refreshedDetail)
		mockedUpdateTaskDrawerFields.mockResolvedValue(savedTask)

		const { result } = renderHook(() => useTaskDrawer('default', 'task-1'))

		await waitFor(() => {
			expect(result.current.detail?.task.title).toBe('旧任务标题')
		})

		act(() => {
			result.current.updateDraft({ title: '新任务标题' })
		})

		await act(async () => {
			await result.current.save()
		})

		expect(mockedUpdateTaskDrawerFields).toHaveBeenCalledWith(
			expect.objectContaining({
				spaceSlug: 'default',
				taskId: 'task-1',
				title: '新任务标题',
			}),
		)
		expect(mockedGetTaskDrawerDetail).toHaveBeenCalledTimes(2)
		expect(result.current.detail?.task.title).toBe('新任务标题')
		expect(result.current.feedback).toBe('已保存“新任务标题”')
		expect(useShellLayoutStore.getState().taskDataVersion).toBe(1)
	})

	it('删除失败时保留当前详情并展示错误反馈', async () => {
		mockedGetTaskDrawerDetail.mockResolvedValue(createDetail({ title: '保留的任务' }))
		mockedDeleteTaskToTrash.mockRejectedValue(new Error('delete task rejected'))

		const { result } = renderHook(() => useTaskDrawer('default', 'task-1'))

		await waitFor(() => {
			expect(result.current.detail?.task.title).toBe('保留的任务')
		})

		let deleted = true
		await act(async () => {
			deleted = await result.current.deleteTask()
		})

		expect(deleted).toBe(false)
		expect(result.current.detail?.task.title).toBe('保留的任务')
		expect(result.current.deleteError).toBe('delete task rejected')
		expect(useShellLayoutStore.getState().taskDataVersion).toBe(0)
	})
})

function createDetail(taskPatch: Partial<TaskDrawerTask> = {}): TaskDrawerDetail {
	return {
		task: createTask(taskPatch),
		projects: [
			{
				id: 'project-1',
				name: '执行层',
				sortOrder: 0,
			},
		],
		resources: [],
	}
}

function createTask(taskPatch: Partial<TaskDrawerTask> = {}): TaskDrawerTask {
	return {
		id: 'task-1',
		projectId: 'project-1',
		title: '任务标题',
		note: null,
		priority: 'high',
		status: 'todo',
		createdAt: '2026-04-22T07:00:00Z',
		completedAt: null,
		updatedAt: '2026-04-22T08:00:00Z',
		...taskPatch,
	}
}

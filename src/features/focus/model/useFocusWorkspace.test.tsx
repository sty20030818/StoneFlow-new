import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'

import { useShellLayoutStore } from '@/app/layouts/shell/model/useShellLayoutStore'
import { getFocusViewTasks } from '@/features/focus/api/getFocusViewTasks'
import { listFocusViews } from '@/features/focus/api/listFocusViews'
import { updateTaskPinState } from '@/features/focus/api/updateTaskPinState'
import { useFocusWorkspace } from '@/features/focus/model/useFocusWorkspace'

vi.mock('@/features/focus/api/listFocusViews', () => ({
	listFocusViews: vi.fn<typeof listFocusViews>(),
}))

vi.mock('@/features/focus/api/getFocusViewTasks', () => ({
	getFocusViewTasks: vi.fn<typeof getFocusViewTasks>(),
}))

vi.mock('@/features/focus/api/updateTaskPinState', () => ({
	updateTaskPinState: vi.fn<typeof updateTaskPinState>(),
}))

const mockedListFocusViews = vi.mocked(listFocusViews)
const mockedGetFocusViewTasks = vi.mocked(getFocusViewTasks)
const mockedUpdateTaskPinState = vi.mocked(updateTaskPinState)

describe('useFocusWorkspace', () => {
	afterEach(() => {
		vi.clearAllMocks()
		useShellLayoutStore.setState({
			currentSpaceId: 'default',
			activeSection: 'inbox',
			isCommandOpen: false,
			isTaskCreateOpen: false,
			isProjectCreateOpen: false,
			isDrawerOpen: false,
			activeDrawerKind: null,
			activeDrawerId: null,
			taskDataVersion: 0,
			projectDataVersion: 0,
		})
	})

	it('加载 Focus 视图和当前 tab 的真实任务', async () => {
		mockedListFocusViews.mockResolvedValue([
			{
				id: 'view-focus',
				key: 'focus',
				name: 'Focus',
				sortOrder: 0,
				isEnabled: true,
			},
		])
		mockedGetFocusViewTasks.mockResolvedValue({
			view: {
				id: 'view-focus',
				key: 'focus',
				name: 'Focus',
				sortOrder: 0,
				isEnabled: true,
			},
			tasks: [
				{
					id: 'task-1',
					projectId: 'project-1',
					title: '收口 Focus 查询',
					note: '验证真实视图',
					priority: 'high',
					status: 'todo',
					pinned: true,
					dueAt: null,
					createdAt: '2026-04-20T08:00:00Z',
					updatedAt: '2026-04-20T09:00:00Z',
				},
			],
		})

		render(<FocusWorkspaceHarness />)

		await waitFor(() => {
			expect(mockedListFocusViews).toHaveBeenCalledWith({ spaceSlug: 'default' })
		})
		await waitFor(() => {
			expect(mockedGetFocusViewTasks).toHaveBeenCalledWith({
				spaceSlug: 'default',
				viewKey: 'focus',
			})
		})

		expect(await screen.findByText('Focus')).toBeInTheDocument()
		expect(screen.getByText('收口 Focus 查询')).toBeInTheDocument()
	})

	it('pin 状态切换成功后回写任务并展示反馈', async () => {
		mockedListFocusViews.mockResolvedValue([
			{
				id: 'view-upcoming',
				key: 'upcoming',
				name: 'Upcoming',
				sortOrder: 1,
				isEnabled: true,
			},
		])
		mockedGetFocusViewTasks
			.mockResolvedValueOnce({
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
						title: '补齐 pin 动作',
						note: null,
						priority: 'high',
						status: 'todo',
						pinned: false,
						dueAt: '2026-04-21T08:00:00Z',
						createdAt: '2026-04-20T08:00:00Z',
						updatedAt: '2026-04-20T09:00:00Z',
					},
				],
			})
			.mockResolvedValueOnce({
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
						title: '补齐 pin 动作',
						note: null,
						priority: 'high',
						status: 'todo',
						pinned: true,
						dueAt: '2026-04-21T08:00:00Z',
						createdAt: '2026-04-20T08:00:00Z',
						updatedAt: '2026-04-20T10:00:00Z',
					},
				],
			})
		mockedUpdateTaskPinState.mockResolvedValue({
			taskId: 'task-1',
			pinned: true,
			updatedAt: '2026-04-20T10:00:00Z',
		})

		render(<FocusWorkspaceHarness />)

		await screen.findByText('补齐 pin 动作')
		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: '切换 pin 补齐 pin 动作' }))
		})

		await waitFor(() => {
			expect(mockedUpdateTaskPinState).toHaveBeenCalledWith({
				spaceSlug: 'default',
				taskId: 'task-1',
				pinned: true,
			})
		})

		expect(await screen.findByRole('status')).toHaveTextContent('已将“补齐 pin 动作”加入 Focus')
		expect(screen.getByText('已 Pin')).toBeInTheDocument()
	})

	it('pin 状态切换失败后展示错误提示', async () => {
		mockedListFocusViews.mockResolvedValue([
			{
				id: 'view-focus',
				key: 'focus',
				name: 'Focus',
				sortOrder: 0,
				isEnabled: true,
			},
		])
		mockedGetFocusViewTasks.mockResolvedValue({
			view: {
				id: 'view-focus',
				key: 'focus',
				name: 'Focus',
				sortOrder: 0,
				isEnabled: true,
			},
			tasks: [
				{
					id: 'task-1',
					projectId: 'project-1',
					title: '失败反馈',
					note: null,
					priority: 'urgent',
					status: 'todo',
					pinned: true,
					dueAt: null,
					createdAt: '2026-04-20T08:00:00Z',
					updatedAt: '2026-04-20T09:00:00Z',
				},
			],
		})
		mockedUpdateTaskPinState.mockRejectedValue(new Error('pin update rejected'))

		render(<FocusWorkspaceHarness />)

		await screen.findByText('失败反馈')
		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: '切换 pin 失败反馈' }))
		})

		await waitFor(() => {
			expect(screen.getByRole('alert')).toHaveTextContent('pin update rejected')
		})

		expect(screen.getByText('失败反馈')).toBeInTheDocument()
	})
})

function FocusWorkspaceHarness() {
	const { views, tasks, feedback, loadError, toggleTaskPin } = useFocusWorkspace('default')

	return (
		<div>
			<div>
				{views.map((view) => (
					<span key={view.id}>{view.name}</span>
				))}
			</div>
			{feedback ? <p role='status'>{feedback}</p> : null}
			{loadError ? <p role='alert'>{loadError}</p> : null}
			<div>
				{tasks.map((task) => (
					<div key={task.id}>
						<span>{task.title}</span>
						<span>{task.pinned ? '已 Pin' : '未 Pin'}</span>
						<button onClick={() => void toggleTaskPin(task)} type='button'>
							{`切换 pin ${task.title}`}
						</button>
					</div>
				))}
			</div>
		</div>
	)
}

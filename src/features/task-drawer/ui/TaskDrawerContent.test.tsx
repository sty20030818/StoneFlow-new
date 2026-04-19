import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { useTaskDrawer } from '@/features/task-drawer/model/useTaskDrawer'
import { TaskDrawerContent } from '@/features/task-drawer/ui/TaskDrawerContent'

vi.mock('@/features/task-drawer/model/useTaskDrawer', () => ({
	useTaskDrawer: vi.fn<typeof useTaskDrawer>(),
}))

const mockedUseTaskDrawer = vi.mocked(useTaskDrawer)
type TaskDrawerHookState = ReturnType<typeof useTaskDrawer>
type TaskDrawerDraftPatch = Parameters<TaskDrawerHookState['updateDraft']>[0]

describe('TaskDrawerContent', () => {
	afterEach(() => {
		vi.clearAllMocks()
	})

	it('展示加载态', () => {
		mockedUseTaskDrawer.mockReturnValue(createHookState({ isLoading: true }))

		render(
			<TaskDrawerContent currentSpaceId='default' onClose={vi.fn<() => void>()} taskId='task-1' />,
		)

		expect(screen.getByText('正在加载任务详情...')).toBeInTheDocument()
		expect(screen.getByText(/工作 的真实数据/)).toBeInTheDocument()
	})

	it('加载失败时支持重试和关闭', () => {
		const refresh = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)
		const onClose = vi.fn<() => void>()

		mockedUseTaskDrawer.mockReturnValue(
			createHookState({
				isLoading: false,
				loadError: 'task `task-1` does not exist',
				refresh,
			}),
		)

		render(<TaskDrawerContent currentSpaceId='default' onClose={onClose} taskId='task-1' />)

		expect(screen.getByRole('alert')).toHaveTextContent('task `task-1` does not exist')

		fireEvent.click(screen.getByRole('button', { name: '重试' }))
		expect(refresh).toHaveBeenCalledTimes(1)

		fireEvent.click(screen.getByRole('button', { name: '关闭' }))
		expect(onClose).toHaveBeenCalledTimes(1)
	})

	it('展示真实任务详情并透传编辑动作', () => {
		const updateDraft = vi.fn<(patch: TaskDrawerDraftPatch) => void>()
		const save = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)

		mockedUseTaskDrawer.mockReturnValue(
			createHookState({
				detail: createDetail(),
				draft: {
					title: 'M2-E Task Drawer',
					note: '补齐详情编辑',
					priority: 'high',
					projectId: 'project-1',
					status: 'todo',
				},
				isDirty: true,
				updateDraft,
				save,
				feedback: '已保存“M2-E Task Drawer”',
			}),
		)

		render(
			<TaskDrawerContent currentSpaceId='default' onClose={vi.fn<() => void>()} taskId='task-1' />,
		)

		expect(screen.getByDisplayValue('M2-E Task Drawer')).toBeInTheDocument()
		expect(screen.getByDisplayValue('补齐详情编辑')).toBeInTheDocument()
		expect(screen.getByRole('status')).toHaveTextContent('已保存“M2-E Task Drawer”')

		fireEvent.change(screen.getByLabelText('标题'), {
			target: { value: '更新后的标题' },
		})
		fireEvent.change(screen.getByLabelText('描述 / 备注'), {
			target: { value: '更新后的备注' },
		})
		fireEvent.change(screen.getByLabelText('优先级'), {
			target: { value: 'urgent' },
		})
		fireEvent.change(screen.getByLabelText('项目'), {
			target: { value: '' },
		})
		fireEvent.change(screen.getByLabelText('状态'), {
			target: { value: 'done' },
		})

		expect(updateDraft).toHaveBeenNthCalledWith(1, { title: '更新后的标题' })
		expect(updateDraft).toHaveBeenNthCalledWith(2, { note: '更新后的备注' })
		expect(updateDraft).toHaveBeenNthCalledWith(3, { priority: 'urgent' })
		expect(updateDraft).toHaveBeenNthCalledWith(4, { projectId: '' })
		expect(updateDraft).toHaveBeenNthCalledWith(5, { status: 'done' })

		fireEvent.click(screen.getByRole('button', { name: '保存修改' }))
		expect(save).toHaveBeenCalledTimes(1)
	})

	it('保存失败时展示错误反馈', () => {
		mockedUseTaskDrawer.mockReturnValue(
			createHookState({
				detail: createDetail(),
				draft: {
					title: 'M2-E Task Drawer',
					note: '',
					priority: '',
					projectId: '',
					status: 'todo',
				},
				isDirty: true,
				saveError: 'task drawer update request does not change task',
			}),
		)

		render(
			<TaskDrawerContent currentSpaceId='default' onClose={vi.fn<() => void>()} taskId='task-1' />,
		)

		expect(screen.getByRole('alert')).toHaveTextContent(
			'task drawer update request does not change task',
		)
	})

	it('删除成功后关闭 Drawer', async () => {
		const deleteTask = vi.fn<() => Promise<boolean>>().mockResolvedValue(true)
		const onClose = vi.fn<() => void>()

		mockedUseTaskDrawer.mockReturnValue(
			createHookState({
				detail: createDetail(),
				deleteTask,
			}),
		)

		render(<TaskDrawerContent currentSpaceId='default' onClose={onClose} taskId='task-1' />)

		fireEvent.click(screen.getByRole('button', { name: '删除任务' }))

		await waitFor(() => {
			expect(deleteTask).toHaveBeenCalledTimes(1)
			expect(onClose).toHaveBeenCalledTimes(1)
		})
	})

	it('删除失败时展示错误反馈并保持 Drawer 打开', async () => {
		const deleteTask = vi.fn<() => Promise<boolean>>().mockResolvedValue(false)
		const onClose = vi.fn<() => void>()

		mockedUseTaskDrawer.mockReturnValue(
			createHookState({
				detail: createDetail(),
				deleteTask,
				deleteError: 'failed to soft delete task',
			}),
		)

		render(<TaskDrawerContent currentSpaceId='default' onClose={onClose} taskId='task-1' />)

		fireEvent.click(screen.getByRole('button', { name: '删除任务' }))

		await waitFor(() => {
			expect(deleteTask).toHaveBeenCalledTimes(1)
		})
		expect(onClose).not.toHaveBeenCalled()
		expect(screen.getByRole('alert')).toHaveTextContent('failed to soft delete task')
	})
})

function createHookState(overrides: Partial<TaskDrawerHookState> = {}) {
	return {
		detail: null,
		draft: {
			title: '',
			note: '',
			priority: '',
			projectId: '',
			status: 'todo' as const,
		},
		isDirty: false,
		isLoading: false,
		isSaving: false,
		isDeleting: false,
		loadError: null,
		saveError: null,
		deleteError: null,
		feedback: null,
		refresh: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
		updateDraft: vi.fn<(patch: TaskDrawerDraftPatch) => void>(),
		save: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
		deleteTask: vi.fn<() => Promise<boolean>>().mockResolvedValue(false),
		...overrides,
	}
}

function createDetail() {
	return {
		task: {
			id: 'task-1',
			title: 'M2-E Task Drawer',
			note: '补齐详情编辑',
			priority: 'high',
			projectId: 'project-1',
			status: 'todo' as const,
			createdAt: '2026-04-20T08:00:00Z',
			updatedAt: '2026-04-20T09:00:00Z',
			completedAt: null,
		},
		projects: [
			{
				id: 'project-1',
				name: '执行层',
				sortOrder: 0,
			},
		],
	}
}

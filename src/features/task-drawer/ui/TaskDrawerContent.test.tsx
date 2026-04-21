import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { open as openDialog } from '@tauri-apps/plugin-dialog'

import { useTaskDrawer } from '@/features/task-drawer/model/useTaskDrawer'
import { TaskDrawerContent } from '@/features/task-drawer/ui/TaskDrawerContent'

vi.mock('@/features/task-drawer/model/useTaskDrawer', () => ({
	useTaskDrawer: vi.fn<typeof useTaskDrawer>(),
}))

vi.mock('@tauri-apps/plugin-dialog', () => ({
	open: vi.fn<typeof openDialog>(),
}))

const mockedUseTaskDrawer = vi.mocked(useTaskDrawer)
const mockedOpenDialog = vi.mocked(openDialog)
type TaskDrawerHookState = ReturnType<typeof useTaskDrawer>
type TaskDrawerDraftPatch = Parameters<TaskDrawerHookState['updateDraft']>[0]

describe('TaskDrawerContent', () => {
	beforeAll(() => {
		Object.defineProperty(HTMLElement.prototype, 'hasPointerCapture', {
			configurable: true,
			value: () => false,
		})
		Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', {
			configurable: true,
			value: () => undefined,
		})
		Object.defineProperty(HTMLElement.prototype, 'releasePointerCapture', {
			configurable: true,
			value: () => undefined,
		})
		Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
			configurable: true,
			value: () => undefined,
		})
	})

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

	it('展示真实任务详情并透传编辑动作', async () => {
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
		await act(async () => {
			fireEvent.keyDown(screen.getByRole('combobox', { name: '优先级' }), {
				key: 'ArrowDown',
			})
		})
		fireEvent.click(await screen.findByRole('option', { name: '紧急' }))
		await act(async () => {
			fireEvent.keyDown(screen.getByRole('combobox', { name: '项目' }), {
				key: 'ArrowDown',
			})
		})
		fireEvent.click(await screen.findByRole('option', { name: '未归类' }))
		await act(async () => {
			fireEvent.keyDown(screen.getByRole('combobox', { name: '状态' }), {
				key: 'ArrowDown',
			})
		})
		fireEvent.click(await screen.findByRole('option', { name: '已完成' }))

		expect(updateDraft).toHaveBeenNthCalledWith(1, { title: '更新后的标题' })
		expect(updateDraft).toHaveBeenNthCalledWith(2, { note: '更新后的备注' })
		expect(updateDraft).toHaveBeenNthCalledWith(3, { priority: 'urgent' })
		expect(updateDraft).toHaveBeenNthCalledWith(4, { projectId: '' })
		expect(updateDraft).toHaveBeenNthCalledWith(5, { status: 'done' })

		fireEvent.click(screen.getByRole('button', { name: '保存修改' }))
		expect(save).toHaveBeenCalledTimes(1)
	})

	it('展示资源列表并透传打开和移除动作', () => {
		const openResource = vi.fn<(resourceId: string) => Promise<boolean>>().mockResolvedValue(true)
		const deleteResource = vi.fn<(resourceId: string) => Promise<boolean>>().mockResolvedValue(true)

		mockedUseTaskDrawer.mockReturnValue(
			createHookState({
				detail: createDetail({
					resources: [
						{
							id: 'resource-1',
							taskId: 'task-1',
							type: 'doc_link',
							title: '需求文档',
							target: 'https://stoneflow.local/spec',
							sortOrder: 0,
							createdAt: '2026-04-20T08:00:00Z',
							updatedAt: '2026-04-20T08:00:00Z',
						},
					],
				}),
				openResource,
				deleteResource,
			}),
		)

		render(
			<TaskDrawerContent currentSpaceId='default' onClose={vi.fn<() => void>()} taskId='task-1' />,
		)

		expect(screen.getByText('需求文档')).toBeInTheDocument()
		expect(screen.getByText(/链接 · stoneflow.local\/spec/)).toBeInTheDocument()

		fireEvent.click(screen.getByRole('button', { name: '打开 需求文档' }))
		fireEvent.click(screen.getByRole('button', { name: '移除 需求文档' }))

		expect(openResource).toHaveBeenCalledWith('resource-1')
		expect(deleteResource).toHaveBeenCalledWith('resource-1')
	})

	it('添加链接资源时使用 Resource 动作而不是保存任务', async () => {
		const addResource = vi.fn<TaskDrawerHookState['addResource']>().mockResolvedValue(true)
		const save = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)

		mockedUseTaskDrawer.mockReturnValue(
			createHookState({
				detail: createDetail(),
				addResource,
				save,
			}),
		)

		render(
			<TaskDrawerContent currentSpaceId='default' onClose={vi.fn<() => void>()} taskId='task-1' />,
		)

		fireEvent.change(screen.getByLabelText('资源标题'), {
			target: { value: '设计稿' },
		})
		fireEvent.change(screen.getByLabelText('资源 URL'), {
			target: { value: 'https://stoneflow.local/design' },
		})
		fireEvent.click(screen.getByRole('button', { name: '添加链接' }))

		await waitFor(() => {
			expect(addResource).toHaveBeenCalledWith({
				type: 'doc_link',
				title: '设计稿',
				target: 'https://stoneflow.local/design',
			})
		})
		expect(save).not.toHaveBeenCalled()
	})

	it('选择本地文件后创建 local_file 资源', async () => {
		const addResource = vi.fn<TaskDrawerHookState['addResource']>().mockResolvedValue(true)
		mockedOpenDialog.mockResolvedValue('/Users/sty/Docs/M3-C.md')
		mockedUseTaskDrawer.mockReturnValue(
			createHookState({
				detail: createDetail(),
				addResource,
			}),
		)

		render(
			<TaskDrawerContent currentSpaceId='default' onClose={vi.fn<() => void>()} taskId='task-1' />,
		)

		fireEvent.click(screen.getByRole('button', { name: '选择文件' }))

		await waitFor(() => {
			expect(mockedOpenDialog).toHaveBeenCalledWith({
				directory: false,
				multiple: false,
			})
			expect(addResource).toHaveBeenCalledWith({
				type: 'local_file',
				title: 'M3-C.md',
				target: '/Users/sty/Docs/M3-C.md',
			})
		})
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
		isResourceLoading: false,
		isAddingResource: false,
		pendingResourceId: null,
		loadError: null,
		saveError: null,
		deleteError: null,
		resourceError: null,
		feedback: null,
		resourceFeedback: null,
		refresh: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
		refreshResources: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
		updateDraft: vi.fn<(patch: TaskDrawerDraftPatch) => void>(),
		save: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
		deleteTask: vi.fn<() => Promise<boolean>>().mockResolvedValue(false),
		addResource: vi.fn<TaskDrawerHookState['addResource']>().mockResolvedValue(false),
		openResource: vi.fn<TaskDrawerHookState['openResource']>().mockResolvedValue(false),
		deleteResource: vi.fn<TaskDrawerHookState['deleteResource']>().mockResolvedValue(false),
		...overrides,
	}
}

function createDetail(overrides: Partial<NonNullable<TaskDrawerHookState['detail']>> = {}) {
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
		resources: [],
		...overrides,
	}
}

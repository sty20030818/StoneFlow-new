import { fireEvent, screen, waitFor } from '@testing-library/react'

import { SubmitRegistryProvider, useSubmitRegistryActions } from '@/features/submit'
import { renderWithInteractionProviders as render } from '@/test/TestInteractionProviders'

import { TaskCreateContent } from './TaskCreateContent'

const createTaskMock = vi.fn()
const openPageMock = vi.fn()

vi.mock('@/features/task/hooks', () => ({
	useCreateTaskMutation: () => ({ mutateAsync: createTaskMock }),
}))

vi.mock('@/features/entity-detail', () => ({
	useEntityDetailController: () => ({ openPage: openPageMock }),
}))

describe('TaskCreateContent', () => {
	beforeEach(() => {
		createTaskMock.mockReset()
		openPageMock.mockReset()
		createTaskMock.mockResolvedValue(createTaskDetail())
	})

	it('标题为空时禁用提交', () => {
		renderTaskCreate()

		expect(screen.getByRole('button', { name: '创建任务' })).toBeDisabled()
		expect(createTaskMock).not.toHaveBeenCalled()
	})

	it('创建更多会提交当前草稿、清空文本并回到下一条', async () => {
		renderTaskCreate()

		fireEvent.change(screen.getByPlaceholderText('任务标题'), { target: { value: '任务 A' } })
		fireEvent.change(screen.getByPlaceholderText('添加描述...'), { target: { value: '备注 A' } })
		fireEvent.click(screen.getByRole('switch'))
		fireEvent.click(screen.getByRole('button', { name: '创建任务' }))

		await waitFor(() => expect(createTaskMock).toHaveBeenCalledTimes(1))
		expect(screen.getByPlaceholderText('任务标题')).toHaveValue('')
		expect(screen.getByPlaceholderText('添加描述...')).toHaveValue('')
		expect(screen.getByText('已创建 1 条任务')).toBeInTheDocument()
		expect(screen.getByRole('switch')).toHaveAttribute('data-state', 'unchecked')
		expect(openPageMock).not.toHaveBeenCalled()
	})

	it('continue 进入下一条，open 关闭弹窗并打开刚创建任务', async () => {
		const onClose = vi.fn()
		renderTaskCreate({ onClose, withActions: true })

		fireEvent.change(screen.getByPlaceholderText('任务标题'), { target: { value: '任务 B' } })
		fireEvent.click(screen.getByRole('button', { name: '执行继续提交' }))
		await waitFor(() => expect(createTaskMock).toHaveBeenCalledTimes(1))
		expect(screen.getByPlaceholderText('任务标题')).toHaveValue('')
		expect(screen.getByText('已创建 1 条任务')).toBeInTheDocument()

		fireEvent.change(screen.getByPlaceholderText('任务标题'), { target: { value: '任务 C' } })
		fireEvent.click(screen.getByRole('button', { name: '执行打开提交' }))
		await waitFor(() => expect(createTaskMock).toHaveBeenCalledTimes(2))
		expect(onClose).toHaveBeenCalledOnce()
		expect(openPageMock).toHaveBeenCalledWith({ kind: 'task', id: 'task-created' })
	})
})

function renderTaskCreate({
	onClose = vi.fn(),
	withActions = false,
}: {
	onClose?: () => void
	withActions?: boolean
} = {}) {
	return render(
		<SubmitRegistryProvider>
			<TaskCreateContent
				currentScope={{ type: 'space', spaceId: 'space-a' }}
				initialPlacement='standalone'
				initialProjectId={null}
				initialStatus='todo'
				onClose={onClose}
				projects={[
					{ id: 'project-a', spaceId: 'space-a', name: '项目 A' },
					{ id: 'project-b', spaceId: 'space-b', name: '项目 B' },
				]}
				projectsLoading={false}
				selectedSpaceId='space-a'
				spaces={[
					{
						id: 'space-a',
						name: '工作',
						iconKey: 'folder',
						colorKey: 'blue',
						isDefault: true,
						position: 0,
						archivedAt: null,
						deletedAt: null,
						createdAt: '2026-05-19T10:00:00.000Z',
						updatedAt: '2026-05-19T10:00:00.000Z',
					},
				]}
			/>
			{withActions ? <SubmitActionProbe /> : null}
		</SubmitRegistryProvider>,
	)
}

function SubmitActionProbe() {
	const actions = useSubmitRegistryActions()
	return (
		<div>
			<button onClick={() => void actions.submitActiveTarget('continue')} type='button'>
				执行继续提交
			</button>
			<button onClick={() => void actions.submitActiveTarget('open')} type='button'>
				执行打开提交
			</button>
		</div>
	)
}

function createTaskDetail() {
	return {
		id: 'task-created',
		spaceId: 'space-a',
		spaceName: '工作',
		spaceSlug: 'work',
		projectId: null,
		projectName: null,
		title: '任务',
		note: null,
		status: 'todo' as const,
		statusChangedAt: '2026-05-19T10:00:00.000Z',
		priority: 0 as const,
		dueAt: null,
		plannedAt: null,
		remindAt: null,
		completedAt: null,
		canceledAt: null,
		archivedAt: null,
		createdAt: '2026-05-19T10:00:00.000Z',
		updatedAt: '2026-05-19T10:00:00.000Z',
		position: 1,
		deletedAt: null,
	}
}

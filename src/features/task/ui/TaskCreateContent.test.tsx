/** @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { SubmitRegistryProvider, useSubmitRegistryActions } from '@/features/submit/model'
import { TaskCreateContent } from './TaskCreateContent'

const createTaskMock = vi.fn()
const openDrawerMock = vi.fn()

vi.mock('@/features/task/model/useTaskStore', () => ({
	useTaskStore: (selector: (state: { createTask: typeof createTaskMock }) => unknown) =>
		selector({
			createTask: createTaskMock,
		}),
}))

vi.mock('@/app/layouts/shell/model/useDrawerStore', () => ({
	useDrawerStore: (selector: (state: { openDrawer: typeof openDrawerMock }) => unknown) =>
		selector({
			openDrawer: openDrawerMock,
		}),
}))

describe('TaskCreateContent', () => {
	beforeEach(() => {
		createTaskMock.mockReset()
		openDrawerMock.mockReset()
		createTaskMock.mockResolvedValue(createTaskDetail())
	})

	it('勾选创建更多后，普通创建会保留元数据并自动关闭开关', async () => {
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
		expect(openDrawerMock).not.toHaveBeenCalled()
	})

	it('submitAndContinue 会直接进入下一条草稿并累加计数', async () => {
		renderTaskCreate({ withActions: true })

		fireEvent.change(screen.getByPlaceholderText('任务标题'), { target: { value: '任务 B' } })
		fireEvent.change(screen.getByPlaceholderText('添加描述...'), { target: { value: '备注 B' } })
		fireEvent.click(screen.getByRole('button', { name: '执行继续提交' }))

		await waitFor(() => expect(createTaskMock).toHaveBeenCalledTimes(1))
		expect(screen.getByPlaceholderText('任务标题')).toHaveValue('')
		expect(screen.getByText('已创建 1 条任务')).toBeInTheDocument()
	})

	it('submitAndOpen 会关闭弹窗并打开刚创建任务', async () => {
		const onClose = vi.fn()
		renderTaskCreate({ onClose, withActions: true })

		fireEvent.change(screen.getByPlaceholderText('任务标题'), { target: { value: '任务 C' } })
		fireEvent.click(screen.getByRole('button', { name: '执行打开提交' }))

		await waitFor(() => expect(createTaskMock).toHaveBeenCalledTimes(1))
		expect(onClose).toHaveBeenCalledTimes(1)
		expect(openDrawerMock).toHaveBeenCalledWith('task', 'task-created')
	})

	it('描述输入区位于统一滚动容器内', () => {
		renderTaskCreate()

		const scrollContainer = screen
			.getByPlaceholderText('添加描述...')
			.closest('[data-scroll-container="true"]')

		expect(scrollContainer).toHaveAttribute('data-scroll-container', 'true')
		expect(scrollContainer?.className).toContain('px-5')
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
				initialPlacement='inbox'
				initialProjectId={null}
				initialStatus='todo'
				onClose={onClose}
				projects={[
					{
						id: 'project-a',
						spaceId: 'space-a',
						name: '项目 A',
					},
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
						sortOrder: 0,
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
		inboxAt: '2026-05-19T10:00:00.000Z',
		title: '任务',
		note: null,
		status: 'todo' as const,
		statusChangedAt: '2026-05-19T10:00:00.000Z',
		priority: 0 as const,
		dueAt: null,
		scheduledAt: null,
		reminderAt: null,
		completedAt: null,
		canceledAt: null,
		archivedAt: null,
		createdAt: '2026-05-19T10:00:00.000Z',
		updatedAt: '2026-05-19T10:00:00.000Z',
		sortOrder: 1,
		deletedAt: null,
	}
}

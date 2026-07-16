/** @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import {
	SubmitRegistryProvider,
	useSubmitRegistryActions,
	useSubmitRegistryContext,
} from '@/features/submit/model'
import { TaskCreateContent } from './TaskCreateContent'

const createTaskMock = vi.fn()
const openPageMock = vi.fn()

vi.mock('@/features/task/hooks', () => ({
	useCreateTaskMutation: () => ({
		mutateAsync: createTaskMock,
	}),
}))

vi.mock('@/features/entity-detail', () => ({
	useEntityDetailController: () => ({
		openPage: openPageMock,
	}),
}))

describe('TaskCreateContent', () => {
	beforeEach(() => {
		createTaskMock.mockReset()
		openPageMock.mockReset()
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
		expect(openPageMock).not.toHaveBeenCalled()
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
		expect(openPageMock).toHaveBeenCalledWith({ kind: 'task', id: 'task-created' })
	})

	it('描述输入区位于统一滚动容器内', () => {
		renderTaskCreate()

		const scrollContainer = screen
			.getByPlaceholderText('添加描述...')
			.closest('[data-scroll-container="true"]')

		expect(scrollContainer).toHaveAttribute('data-scroll-container', 'true')
		expect(scrollContainer?.className).toContain('px-5')
	})

	it('状态和优先级使用统一字段控件并写入创建 payload', async () => {
		renderTaskCreate()

		fireEvent.change(screen.getByPlaceholderText('任务标题'), { target: { value: '任务 D' } })
		expect(screen.getByText('待执行')).toBeInTheDocument()
		fireEvent.pointerDown(screen.getByRole('button', { name: '状态' }))
		fireEvent.click(await screen.findByRole('menuitem', { name: /进行中/ }))
		expect(screen.getByText('无优先级')).toBeInTheDocument()
		fireEvent.pointerDown(screen.getByRole('button', { name: '优先级' }))
		fireEvent.click(await screen.findByRole('menuitem', { name: /高/ }))
		fireEvent.click(screen.getByRole('button', { name: '创建任务' }))

		await waitFor(() => expect(createTaskMock).toHaveBeenCalledTimes(1))
		expect(createTaskMock).toHaveBeenCalledWith(
			expect.objectContaining({
				status: 'doing',
				priority: 3,
			}),
		)
	})

	it('归属菜单可在收件箱、独立事项和项目之间切换并保持提交语义', async () => {
		renderTaskCreate()

		fireEvent.change(screen.getByPlaceholderText('任务标题'), { target: { value: '任务 E' } })
		expect(screen.getByRole('button', { name: '归属' })).toHaveTextContent('收件箱')
		fireEvent.pointerDown(screen.getByRole('button', { name: '归属' }))
		await screen.findByRole('menu')
		expect(screen.getByText('工作')).toBeInTheDocument()
		expect(screen.queryByText('生活')).not.toBeInTheDocument()
		expect(getShortcutHintDigits()).toEqual(['0', '1'])
		expect(getPlacementMenuitemTexts()).toEqual([
			'收件箱0Inbox',
			'独立事项1No Project',
			'项目 AProject · 工作',
		])
		fireEvent.click(await screen.findByRole('menuitem', { name: /独立事项/ }))
		fireEvent.click(screen.getByRole('button', { name: '创建任务' }))

		await waitFor(() => expect(createTaskMock).toHaveBeenCalledTimes(1))
		expect(createTaskMock).toHaveBeenLastCalledWith(
			expect.objectContaining({
				spaceId: 'space-a',
				placement: { kind: 'noProject' },
			}),
		)

		createTaskMock.mockClear()
		fireEvent.change(screen.getByPlaceholderText('任务标题'), { target: { value: '任务 F' } })
		expect(screen.getByRole('button', { name: '归属' })).toHaveTextContent('独立事项')
		fireEvent.pointerDown(screen.getByRole('button', { name: '归属' }))
		fireEvent.click(await screen.findByRole('menuitem', { name: /项目 A/ }))
		fireEvent.click(screen.getByRole('button', { name: '创建任务' }))

		await waitFor(() => expect(createTaskMock).toHaveBeenCalledTimes(1))
		expect(createTaskMock).toHaveBeenLastCalledWith(
			expect.objectContaining({
				spaceId: null,
				placement: { kind: 'project', projectId: 'project-a' },
			}),
		)

		createTaskMock.mockClear()
		fireEvent.change(screen.getByPlaceholderText('任务标题'), { target: { value: '任务 G' } })
		fireEvent.pointerDown(screen.getByRole('button', { name: '归属' }))
		fireEvent.click(await screen.findByRole('menuitem', { name: /收件箱/ }))
		fireEvent.click(screen.getByRole('button', { name: '创建任务' }))

		await waitFor(() => expect(createTaskMock).toHaveBeenCalledTimes(1))
		expect(createTaskMock).toHaveBeenLastCalledWith(
			expect.objectContaining({
				spaceId: 'space-a',
				placement: { kind: 'inbox' },
			}),
		)
	})

	it('日期下拉位于标签前，并将截止、计划、提醒写入创建 payload', async () => {
		renderTaskCreate()

		fireEvent.change(screen.getByPlaceholderText('任务标题'), { target: { value: '任务 G' } })
		expect(screen.getByRole('button', { name: '截止时间' })).toHaveTextContent('添加时间')
		expect(screen.getByRole('button', { name: '计划时间' })).toHaveTextContent('添加时间')
		expect(screen.getByRole('button', { name: '提醒时间' })).toHaveTextContent('添加时间')
		fireEvent.pointerDown(screen.getByRole('button', { name: '截止时间' }))
		fireEvent.click(await screen.findByRole('menuitem', { name: /今天/ }))
		fireEvent.pointerDown(screen.getByRole('button', { name: '计划时间' }))
		fireEvent.click(await screen.findByRole('menuitem', { name: /今天/ }))
		fireEvent.pointerDown(screen.getByRole('button', { name: '提醒时间' }))
		fireEvent.click(await screen.findByRole('menuitem', { name: /今天/ }))
		fireEvent.click(screen.getByRole('button', { name: '创建任务' }))

		await waitFor(() => expect(createTaskMock).toHaveBeenCalledTimes(1))
		expect(createTaskMock).toHaveBeenCalledWith(
			expect.objectContaining({
				dueAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
				scheduledAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
				reminderAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
			}),
		)
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
					{
						id: 'project-b',
						spaceId: 'space-b',
						name: '项目 B',
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
			{withActions ? <SubmitStateProbe /> : null}
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

function SubmitStateProbe() {
	const submitState = useSubmitRegistryContext()

	return (
		<div>
			<div data-testid='task-active-target'>{submitState.activeTarget?.id ?? 'none'}</div>
			<div data-testid='task-can-continue'>
				{submitState.canSubmitIntent('continue') ? 'enabled' : 'disabled'}
			</div>
			<div data-testid='task-can-open'>
				{submitState.canSubmitIntent('open') ? 'enabled' : 'disabled'}
			</div>
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

function getShortcutHintDigits() {
	return [...document.querySelectorAll('[data-slot="shortcut-menu-item-hint"]')].map(
		(item) => item.textContent,
	)
}

function getPlacementMenuitemTexts() {
	return [...document.querySelectorAll('[role="menuitem"]')].map((item) =>
		item.textContent?.replace(/\s+/g, ' ').trim(),
	)
}

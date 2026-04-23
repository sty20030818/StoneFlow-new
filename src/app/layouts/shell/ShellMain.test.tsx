import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'

import { useShellLayoutStore } from '@/app/layouts/shell/model/useShellLayoutStore'
import { ShellMain } from '@/app/layouts/shell/ShellMain'
import { useTaskDrawer } from '@/features/task-drawer/model/useTaskDrawer'

vi.mock('@/features/task-drawer/model/useTaskDrawer', () => ({
	useTaskDrawer: vi.fn<typeof useTaskDrawer>(),
}))

const mockedUseTaskDrawer = vi.mocked(useTaskDrawer)

describe('ShellMain', () => {
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
		useShellLayoutStore.setState({
			currentSpaceId: 'work',
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

	it('点击外部空白时关闭 Drawer', async () => {
		useShellLayoutStore.setState({
			isDrawerOpen: true,
			activeDrawerKind: 'project',
			activeDrawerId: 'engineering',
		})

		render(
			<>
				<div data-testid='outside-blank'>outside blank</div>
				<ShellMain
					activeDrawerId='engineering'
					activeDrawerKind='project'
					currentSpaceId='work'
					onCloseDrawer={() => useShellLayoutStore.getState().closeDrawer()}
				>
					<div>workspace content</div>
				</ShellMain>
			</>,
		)

		expect(screen.getByText('workspace content')).toBeInTheDocument()
		expect(screen.getByRole('dialog', { name: 'Project detail' })).toBeInTheDocument()
		expect(screen.getByText('Active')).toHaveAttribute('data-variant', 'primary')
		expect(screen.getByText('Code')).toHaveAttribute('data-variant', 'secondary')

		fireEvent.pointerDown(screen.getByTestId('outside-blank'))

		await waitFor(() => {
			expect(useShellLayoutStore.getState()).toMatchObject({
				isDrawerOpen: false,
				activeDrawerKind: null,
				activeDrawerId: null,
			})
		})
	})

	it('点击外部按钮时保留 Drawer 并执行原动作', () => {
		useShellLayoutStore.setState({
			isDrawerOpen: true,
			activeDrawerKind: 'project',
			activeDrawerId: 'engineering',
		})

		const handleHeaderAction = vi.fn<() => void>()

		render(
			<>
				<button onClick={handleHeaderAction} type='button'>
					header action
				</button>
				<ShellMain
					activeDrawerId='engineering'
					activeDrawerKind='project'
					currentSpaceId='work'
					onCloseDrawer={() => useShellLayoutStore.getState().closeDrawer()}
				>
					<div>workspace content</div>
				</ShellMain>
			</>,
		)

		const button = screen.getByRole('button', { name: 'header action' })
		fireEvent.pointerDown(button)
		fireEvent.click(button)

		expect(handleHeaderAction).toHaveBeenCalledTimes(1)
		expect(useShellLayoutStore.getState()).toMatchObject({
			isDrawerOpen: true,
			activeDrawerKind: 'project',
			activeDrawerId: 'engineering',
		})
	})

	it('点击另一张 task card 时直接切换 Drawer 内容', () => {
		useShellLayoutStore.setState({
			isDrawerOpen: true,
			activeDrawerKind: 'project',
			activeDrawerId: 'engineering',
		})

		render(
			<>
				<div data-shell-task-card='true' data-task-id='task-2'>
					<button
						onClick={() => useShellLayoutStore.getState().openDrawer('task', 'task-2')}
						type='button'
					>
						switch to task 2
					</button>
				</div>
				<ShellMain
					activeDrawerId='engineering'
					activeDrawerKind='project'
					currentSpaceId='work'
					onCloseDrawer={() => useShellLayoutStore.getState().closeDrawer()}
				>
					<div>workspace content</div>
				</ShellMain>
			</>,
		)

		fireEvent.pointerDown(screen.getByRole('button', { name: 'switch to task 2' }))
		fireEvent.click(screen.getByRole('button', { name: 'switch to task 2' }))

		expect(useShellLayoutStore.getState()).toMatchObject({
			isDrawerOpen: true,
			activeDrawerKind: 'task',
			activeDrawerId: 'task-2',
		})
	})

	it('Drawer 自有 Select 打开时，外部空白先只关闭 Select 不关闭 Drawer', async () => {
		mockedUseTaskDrawer.mockReturnValue(createTaskDrawerHookState())
		useShellLayoutStore.setState({
			isDrawerOpen: true,
			activeDrawerKind: 'task',
			activeDrawerId: 'task-1',
		})

		render(
			<>
				<div data-testid='outside-blank'>outside blank</div>
				<ShellMain
					activeDrawerId='task-1'
					activeDrawerKind='task'
					currentSpaceId='work'
					onCloseDrawer={() => useShellLayoutStore.getState().closeDrawer()}
				>
					<div>workspace content</div>
				</ShellMain>
			</>,
		)

		await act(async () => {
			fireEvent.keyDown(screen.getByRole('combobox', { name: '优先级' }), {
				key: 'ArrowDown',
			})
		})
		expect(await screen.findByRole('option', { name: '紧急' })).toBeInTheDocument()

		await act(async () => {
			fireEvent.pointerDown(screen.getByTestId('outside-blank'))
		})

		await waitFor(() => {
			expect(screen.queryByRole('option', { name: '紧急' })).not.toBeInTheDocument()
		})
		expect(useShellLayoutStore.getState()).toMatchObject({
			isDrawerOpen: true,
			activeDrawerKind: 'task',
			activeDrawerId: 'task-1',
		})

		await act(async () => {
			fireEvent.pointerDown(screen.getByTestId('outside-blank'))
		})

		await waitFor(() => {
			expect(useShellLayoutStore.getState()).toMatchObject({
				isDrawerOpen: false,
				activeDrawerKind: null,
				activeDrawerId: null,
			})
		})
	})
})

function createTaskDrawerHookState() {
	return {
		detail: {
			task: {
				id: 'task-1',
				title: 'M3-A Task Drawer',
				note: '验证 Drawer 外部点击策略',
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
		},
		draft: {
			title: 'M3-A Task Drawer',
			note: '验证 Drawer 外部点击策略',
			priority: 'high',
			projectId: 'project-1',
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
		updateDraft: vi.fn<(patch: Record<string, unknown>) => void>(),
		save: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
		deleteTask: vi.fn<() => Promise<boolean>>().mockResolvedValue(false),
		addResource: vi
			.fn<
				(input: {
					type: 'doc_link' | 'local_file' | 'local_folder'
					title: string
					target: string
				}) => Promise<boolean>
			>()
			.mockResolvedValue(false),
		openResource: vi.fn<(resourceId: string) => Promise<boolean>>().mockResolvedValue(false),
		deleteResource: vi.fn<(resourceId: string) => Promise<boolean>>().mockResolvedValue(false),
	}
}

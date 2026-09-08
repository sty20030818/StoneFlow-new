import { act, cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import type { ProjectDetail, ProjectOption } from '@/features/project'
import { useDialogStore } from '@/features/shell-dialogs'
import { SubmitRegistryProvider } from '@/features/submit'
import { useShellCreateDialogState } from '@/layout/model/useShellCreateDialogState'
import type { Scope, Space, TaskDetail } from '@/shared/types'
import { renderWithInteractionProviders as render } from '@/test/TestInteractionProviders'

import { ShellCreationOverlays } from './ShellCreationOverlays'

const { createTask, createProject, navigate, openPage } = vi.hoisted(() => ({
	createTask: vi.fn(),
	createProject: vi.fn(),
	navigate: vi.fn(),
	openPage: vi.fn(),
}))

vi.mock('@tauri-apps/api/core', async (importOriginal) => ({
	...(await importOriginal<typeof import('@tauri-apps/api/core')>()),
	invoke: (command: string, args: { input: unknown }) => {
		if (command === 'create_task') return createTask(args.input)
		if (command === 'create_project') return createProject(args.input)
		throw new Error(`创建组合测试不应调用 ${command}`)
	},
}))

vi.mock('@tanstack/react-router', async (importOriginal) => ({
	...(await importOriginal<typeof import('@tanstack/react-router')>()),
	useNavigate: () => navigate,
}))

vi.mock('@/features/entity-detail', () => ({
	useEntityDetailController: () => ({ openPage }),
}))

describe('ShellCreationOverlays 创建组合', () => {
	let queryClient: QueryClient

	beforeEach(() => {
		queryClient = new QueryClient({
			defaultOptions: {
				queries: { retry: false, gcTime: 0 },
				mutations: { retry: false, gcTime: 0 },
			},
		})
		vi.clearAllMocks()
		createTask.mockReset().mockResolvedValue(createdTask)
		createProject.mockReset().mockResolvedValue(createdProject)
		useDialogStore.setState(useDialogStore.getInitialState())
	})

	afterEach(() => {
		cleanup()
		queryClient.clear()
		useDialogStore.setState(useDialogStore.getInitialState())
		vi.useRealTimers()
	})

	function renderCreation({
		kind = 'task',
		projectId,
		availableSpaces = spaces,
	}: {
		kind?: 'task' | 'project'
		projectId?: string
		availableSpaces?: Space[]
	} = {}) {
		if (kind === 'task') useDialogStore.getState().openTaskCreateDialog({ projectId })
		else useDialogStore.getState().openProjectCreateDialog()
		return render(
			<QueryClientProvider client={queryClient}>
				<SubmitRegistryProvider>
					<CreationHarness availableSpaces={availableSpaces} />
				</SubmitRegistryProvider>
			</QueryClientProvider>,
		)
	}

	it('顶部切换 Space 后以新空间提交独立事项，保留已经输入的文本', async () => {
		renderCreation()
		fillTask()
		await selectSpace('生活')

		expect(screen.getByRole('button', { name: '空间' })).toHaveTextContent('生活')
		expect(screen.getByRole('textbox', { name: '任务标题' })).toHaveValue('整理行程')
		fireEvent.click(screen.getByRole('button', { name: '创建任务' }))

		await waitFor(() => expect(createTask).toHaveBeenCalledOnce())
		expect(createTask).toHaveBeenCalledWith(
			expect.objectContaining({
				spaceId: 'space-b',
				placement: { kind: 'standalone', projectId: null },
				title: '整理行程',
				note: '确认交通与住宿',
			}),
		)
	})

	it('项目入口预填所属 Space，显式换空间后清除旧项目而保留其他字段', async () => {
		renderCreation({ projectId: 'project-b' })
		expect(screen.getByRole('button', { name: '空间' })).toHaveTextContent('生活')
		expect(screen.getByRole('button', { name: '归属' })).toHaveTextContent('旅行项目')
		fillTask()
		await selectMenuOption('状态', /进行中/)
		await selectMenuOption('优先级', /^高/)
		await selectSpace('工作')

		expect(screen.getByRole('button', { name: '归属' })).toHaveTextContent('独立事项')
		expect(screen.getByRole('textbox', { name: '任务描述' })).toHaveValue('确认交通与住宿')
		fireEvent.click(screen.getByRole('button', { name: '创建任务' }))
		await waitFor(() => expect(createTask).toHaveBeenCalledOnce())
		expect(createTask).toHaveBeenCalledWith(
			expect.objectContaining({
				spaceId: 'space-a',
				placement: { kind: 'standalone', projectId: null },
				title: '整理行程',
				status: 'doing',
				priority: 3,
			}),
		)
	})

	it('属性栏选择跨 Space 的项目后 Header 与提交目标同步', async () => {
		renderCreation()
		fillTask()
		await selectMenuOption('归属', /旅行项目/)

		expect(screen.getByRole('button', { name: '空间' })).toHaveTextContent('生活')
		expect(screen.getByRole('button', { name: '归属' })).toHaveTextContent('旅行项目')
		fireEvent.click(screen.getByRole('button', { name: '创建任务' }))
		await waitFor(() => expect(createTask).toHaveBeenCalledOnce())
		expect(createTask).toHaveBeenCalledWith(
			expect.objectContaining({
				spaceId: null,
				placement: { kind: 'project', projectId: 'project-b' },
				title: '整理行程',
			}),
		)
	})

	it('归属菜单选择另一 Space 的独立事项后 Header 与提交空间同步', async () => {
		renderCreation({ projectId: 'project-a' })
		fillTask()
		fireEvent.click(screen.getByRole('button', { name: '归属' }))
		const targetSpace = await screen.findByRole('group', { name: '生活' })
		fireEvent.click(within(targetSpace).getByRole('menuitem', { name: /独立事项/ }))

		expect(screen.getByRole('button', { name: '空间' })).toHaveTextContent('生活')
		expect(screen.getByRole('button', { name: '归属' })).toHaveTextContent('独立事项')
		expect(screen.getByRole('textbox', { name: '任务描述' })).toHaveValue('确认交通与住宿')
		fireEvent.click(screen.getByRole('button', { name: '创建任务' }))
		await waitFor(() => expect(createTask).toHaveBeenCalledOnce())
		expect(createTask).toHaveBeenCalledWith(
			expect.objectContaining({
				spaceId: 'space-b',
				placement: { kind: 'standalone', projectId: null },
			}),
		)
	})

	it('未知项目预填不能写入，重新选择有效 Space 后可继续创建', async () => {
		renderCreation({ projectId: 'project-unavailable' })
		fillTask()
		expect(screen.getByRole('button', { name: '创建任务' })).toBeDisabled()
		fireEvent.submit(screen.getByRole('form', { name: '创建任务' }))
		expect(await screen.findByRole('alert')).toHaveTextContent('创建归属已不可用')
		expect(createTask).not.toHaveBeenCalled()

		await selectSpace('生活')
		expect(screen.getByRole('textbox', { name: '任务标题' })).toHaveValue('整理行程')
		fireEvent.click(screen.getByRole('button', { name: '创建任务' }))
		await waitFor(() => expect(createTask).toHaveBeenCalledOnce())
		expect(createTask).toHaveBeenCalledWith(
			expect.objectContaining({
				spaceId: 'space-b',
				placement: { kind: 'standalone', projectId: null },
			}),
		)
	})

	it.each([
		{ kind: 'task', title: '任务标题', submit: '创建任务' },
		{ kind: 'project', title: '项目名称', submit: '创建项目' },
	] as const)('没有可用 Space 时 $submit 不可提交', async (entry) => {
		renderCreation({ kind: entry.kind, availableSpaces: [] })
		fireEvent.change(screen.getByRole('textbox', { name: entry.title }), {
			target: { value: '暂不创建' },
		})
		expect(screen.getByRole('button', { name: '空间' })).toHaveTextContent('选择空间')
		expect(screen.getByRole('button', { name: entry.submit })).toBeDisabled()
		fireEvent.submit(screen.getByRole('form', { name: entry.submit }))
		expect(await screen.findByRole('alert')).toHaveTextContent('不可用')
		expect(createTask).not.toHaveBeenCalled()
		expect(createProject).not.toHaveBeenCalled()
	})

	it.each([
		{ kind: 'task', title: '任务标题', description: '任务描述', submit: '创建任务' },
		{ kind: 'project', title: '项目名称', description: '项目说明', submit: '创建项目' },
	] as const)('$submit 重复提交只写一次，失败保留内容与归属并支持重试', async (entry) => {
		const mutation = entry.kind === 'task' ? createTask : createProject
		const pending = Promise.withResolvers<never>()
		mutation.mockReturnValueOnce(pending.promise)
		renderCreation({ kind: entry.kind })
		fireEvent.change(screen.getByRole('textbox', { name: entry.title }), {
			target: { value: '周末出行' },
		})
		fireEvent.change(screen.getByRole('textbox', { name: entry.description }), {
			target: { value: '带上相机' },
		})
		await selectSpace('生活')
		const form = screen.getByRole('form', { name: entry.submit })
		fireEvent.submit(form)
		fireEvent.submit(form)
		await waitFor(() => expect(mutation).toHaveBeenCalledOnce())
		expect(screen.getByRole('button', { name: '创建中…' })).toBeDisabled()
		expect(screen.getByRole('button', { name: '空间' })).toBeDisabled()
		expect(screen.getByRole('switch')).toBeDisabled()
		fireEvent.submit(form)
		expect(mutation).toHaveBeenCalledOnce()
		await act(async () => pending.reject(new Error('暂时无法保存，请重试')))

		expect(await screen.findByRole('alert')).toHaveTextContent('暂时无法保存，请重试')
		expect(screen.getByRole('textbox', { name: entry.title })).toHaveValue('周末出行')
		expect(screen.getByRole('textbox', { name: entry.description })).toHaveValue('带上相机')
		expect(screen.getByRole('button', { name: '空间' })).toHaveTextContent('生活')
		expect(screen.queryByText(/已创建 \d/)).not.toBeInTheDocument()
		expect(navigate).not.toHaveBeenCalled()
		expect(openPage).not.toHaveBeenCalled()

		fireEvent.click(screen.getByRole('button', { name: entry.submit }))
		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
		expect(mutation).toHaveBeenCalledTimes(2)
		expect(mutation.mock.calls[1][0]).toEqual(mutation.mock.calls[0][0])
		expect(mutation.mock.calls[1][0]).toEqual(expect.objectContaining({ spaceId: 'space-b' }))
		expect(navigate.mock.calls).toEqual(
			entry.kind === 'project' ? [[{ to: '/space-b/projects/project-created' }]] : [],
		)
		expect(openPage).not.toHaveBeenCalled()
	})

	it.each([
		{
			kind: 'task',
			title: '任务标题',
			description: '任务描述',
			submit: '创建任务',
			count: '已创建 1 条任务',
		},
		{
			kind: 'project',
			title: '项目名称',
			description: '项目说明',
			submit: '创建项目',
			count: '已创建 1 个项目',
		},
	] as const)('$submit 创建更多成功一次后复位，下一次普通提交退出弹窗', async (entry) => {
		const mutation = entry.kind === 'task' ? createTask : createProject
		renderCreation({ kind: entry.kind })
		fireEvent.change(screen.getByRole('textbox', { name: entry.title }), {
			target: { value: '第一条' },
		})
		fireEvent.change(screen.getByRole('textbox', { name: entry.description }), {
			target: { value: '第一条说明' },
		})
		fireEvent.click(screen.getByRole('switch'))
		fireEvent.click(screen.getByRole('button', { name: entry.submit }))

		expect(await screen.findByText(entry.count)).toBeInTheDocument()
		expect(screen.getByRole('dialog')).toBeInTheDocument()
		expect(screen.getByRole('textbox', { name: entry.title })).toHaveValue('')
		expect(screen.getByRole('textbox', { name: entry.description })).toHaveValue('')
		expect(screen.getByRole('switch')).not.toBeChecked()
		await waitFor(() => expect(screen.getByRole('textbox', { name: entry.title })).toHaveFocus())
		expect(navigate).not.toHaveBeenCalled()
		expect(openPage).not.toHaveBeenCalled()

		fireEvent.change(screen.getByRole('textbox', { name: entry.title }), {
			target: { value: '第二条' },
		})
		fireEvent.click(screen.getByRole('button', { name: entry.submit }))
		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
		expect(mutation).toHaveBeenCalledTimes(2)
		expect(navigate).toHaveBeenCalledTimes(entry.kind === 'project' ? 1 : 0)
	})

	it.each([
		{ kind: 'task', title: '任务标题', submit: '创建任务' },
		{ kind: 'project', title: '项目名称', submit: '创建项目' },
	] as const)('$submit 关闭后旧提交成功不关闭新创建会话或跳转', async (entry) => {
		const mutation = entry.kind === 'task' ? createTask : createProject
		const pending = Promise.withResolvers<TaskDetail | ProjectDetail>()
		mutation.mockReturnValueOnce(pending.promise)
		renderCreation({ kind: entry.kind })
		fireEvent.change(screen.getByRole('textbox', { name: entry.title }), {
			target: { value: '正在保存的内容' },
		})
		fireEvent.click(screen.getByRole('button', { name: entry.submit }))
		await waitFor(() => expect(mutation).toHaveBeenCalledOnce())
		fireEvent.click(screen.getByRole('button', { name: '关闭创建窗口' }))
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

		act(() => useDialogStore.getState().openTaskCreateDialog())
		fillTask()
		await act(async () => pending.resolve(entry.kind === 'task' ? createdTask : createdProject))

		expect(screen.getByRole('dialog', { name: '新建任务' })).toBeInTheDocument()
		expect(screen.getByRole('textbox', { name: '任务标题' })).toHaveValue('整理行程')
		expect(screen.getByRole('textbox', { name: '任务描述' })).toHaveValue('确认交通与住宿')
		expect(mutation).toHaveBeenCalledOnce()
		expect(navigate).not.toHaveBeenCalled()
		expect(openPage).not.toHaveBeenCalled()
	})

	it('Task 放大与恢复普通呈现不丢失文本或已选属性，也不提交', async () => {
		renderCreation()
		fillTask()
		await selectMenuOption('优先级', /^高/)
		fireEvent.click(screen.getByRole('button', { name: '全屏创建' }))

		expect(screen.getByRole('textbox', { name: '任务标题' })).toHaveValue('整理行程')
		expect(screen.getByRole('textbox', { name: '任务描述' })).toHaveValue('确认交通与住宿')
		expect(screen.getByRole('button', { name: '优先级' })).toHaveTextContent('高')
		fireEvent.click(screen.getByRole('button', { name: '退出全屏创建' }))
		expect(screen.getByRole('textbox', { name: '任务标题' })).toHaveValue('整理行程')
		expect(screen.getByRole('button', { name: '全屏创建' })).toBeInTheDocument()
		expect(createTask).not.toHaveBeenCalled()
	})

	it.each(['截止时间', '计划时间', '提醒时间'])(
		'%s 从更多设置、修改、胶囊清除，提交不残留日期',
		async (label) => {
			vi.setSystemTime(new Date(2026, 8, 8, 12))
			renderCreation()
			fillTask()
			expect(screen.queryByRole('button', { name: label })).not.toBeInTheDocument()
			await selectDateFromMore(`设置${label}`, /^明天/)
			expect(await screen.findByRole('button', { name: label })).toHaveTextContent('9/9')

			await selectDateFromMore(`更改${label}`, /^今天/)
			expect(screen.getByRole('button', { name: label })).toHaveTextContent('9/8')
			await selectMenuOption(label, /移除当前日期/)
			await waitFor(() =>
				expect(screen.queryByRole('button', { name: label })).not.toBeInTheDocument(),
			)
			await waitFor(() => expect(screen.getByRole('button', { name: '更多属性' })).toHaveFocus())
			fireEvent.click(screen.getByRole('button', { name: '更多属性' }))
			expect(await screen.findByRole('menuitem', { name: `设置${label}` })).toBeInTheDocument()
			fireEvent.keyDown(screen.getByRole('menu', { name: '更多属性' }), { key: 'Escape' })
			fireEvent.click(screen.getByRole('button', { name: '创建任务' }))
			await waitFor(() => expect(createTask).toHaveBeenCalledOnce())
			expect(createTask).toHaveBeenCalledWith(
				expect.objectContaining({ dueAt: null, plannedAt: null, remindAt: null }),
			)
		},
	)

	it('自定义日期取消保留父创建弹窗、文本与已有日期，不误提交', async () => {
		vi.setSystemTime(new Date(2026, 8, 8, 12))
		renderCreation()
		fillTask()
		await selectDateFromMore('设置截止时间', /^明天/)
		const createDialog = screen.getByRole('dialog', { name: '新建任务' })
		const title = screen.getByRole('textbox', { name: '任务标题' })
		await selectMenuOption('截止时间', /自定义日期/)
		expect(await screen.findByRole('dialog', { name: '编辑截止时间' })).toBeInTheDocument()
		expect(createDialog).toBeInTheDocument()
		expect(title).toHaveValue('整理行程')
		fireEvent.click(within(screen.getByRole('grid')).getByText('20'))
		fireEvent.click(screen.getByRole('button', { name: '取消' }))

		await waitFor(() =>
			expect(screen.queryByRole('dialog', { name: '编辑截止时间' })).not.toBeInTheDocument(),
		)
		expect(screen.getByRole('dialog', { name: '新建任务' })).toBe(createDialog)
		expect(screen.getByRole('textbox', { name: '任务标题' })).toBe(title)
		expect(screen.getByRole('textbox', { name: '任务描述' })).toHaveValue('确认交通与住宿')
		expect(screen.getByRole('button', { name: '截止时间' })).toHaveTextContent('9/9')
		expect(createTask).not.toHaveBeenCalled()
		fireEvent.click(screen.getByRole('button', { name: '创建任务' }))
		await waitFor(() => expect(createTask).toHaveBeenCalledOnce())
		expect(createTask).toHaveBeenCalledWith(expect.objectContaining({ dueAt: '2026-09-09' }))
	})

	it('三个日期按固定顺序显示，预设与自定义日期各自进入创建 DTO', async () => {
		vi.setSystemTime(new Date(2026, 8, 8, 12))
		renderCreation()
		fillTask()
		await selectDateFromMore('设置提醒时间', /^一周后/)
		await selectDateFromMore('设置截止时间', /^今天/)
		await selectDateFromMore('设置计划时间', /^明天/)
		await selectMenuOption('截止时间', /自定义日期/)
		fireEvent.click(within(await screen.findByRole('grid')).getByText('20'))
		fireEvent.click(screen.getByRole('button', { name: '保存截止时间' }))
		await waitFor(() =>
			expect(screen.queryByRole('dialog', { name: '编辑截止时间' })).not.toBeInTheDocument(),
		)

		const dateLabels = ['截止时间', '计划时间', '提醒时间', '更多属性']
		expect(
			screen
				.getAllByRole('button')
				.map((button) => button.getAttribute('aria-label'))
				.filter((label) => dateLabels.includes(label ?? '')),
		).toEqual(dateLabels)
		expect(screen.getByRole('button', { name: '截止时间' })).toHaveTextContent('9/20')
		expect(screen.getByRole('button', { name: '计划时间' })).toHaveTextContent('9/9')
		expect(screen.getByRole('button', { name: '提醒时间' })).toHaveTextContent('9/15')
		fireEvent.click(screen.getByRole('button', { name: '创建任务' }))
		await waitFor(() => expect(createTask).toHaveBeenCalledOnce())
		expect(createTask).toHaveBeenCalledWith(
			expect.objectContaining({
				title: '整理行程',
				dueAt: '2026-09-20',
				plannedAt: '2026-09-09',
				remindAt: '2026-09-15',
			}),
		)
	})
})
function CreationHarness({ availableSpaces }: { availableSpaces: Space[] }) {
	const state = useShellCreateDialogState({
		currentScope,
		spaces: availableSpaces,
		projectOptions,
		sidebarProjectsLoading: false,
	})
	return (
		<ShellCreationOverlays
			{...state}
			currentScope={currentScope}
			spaces={availableSpaces}
			projectOptions={projectOptions}
			projectsLoading={false}
		/>
	)
}

function fillTask() {
	fireEvent.change(screen.getByRole('textbox', { name: '任务标题' }), {
		target: { value: '整理行程' },
	})
	fireEvent.change(screen.getByRole('textbox', { name: '任务描述' }), {
		target: { value: '确认交通与住宿' },
	})
}

async function selectSpace(name: string) {
	await selectMenuOption('空间', new RegExp(name))
}

async function selectMenuOption(button: string, option: RegExp) {
	fireEvent.click(screen.getByRole('button', { name: button }))
	fireEvent.click(await screen.findByRole('menuitem', { name: option }))
}

async function selectDateFromMore(action: string, option: RegExp) {
	fireEvent.click(screen.getByRole('button', { name: '更多属性' }))
	const trigger = await screen.findByRole('menuitem', { name: action })
	act(() => trigger.focus())
	fireEvent.keyDown(trigger, { key: 'ArrowRight' })
	fireEvent.click(await screen.findByRole('menuitem', { name: option }))
}

const currentScope: Scope = { type: 'space', spaceId: 'space-a' }
const projectOptions: ProjectOption[] = [
	{ id: 'project-a', spaceId: 'space-a', name: '工作项目' },
	{ id: 'project-b', spaceId: 'space-b', name: '旅行项目' },
]
const spaces: Space[] = [
	{
		id: 'space-a',
		name: '工作',
		iconKey: 'folder',
		colorKey: 'blue',
		isDefault: true,
		position: 0,
		archivedAt: null,
		deletedAt: null,
		createdAt: '2026-09-08T00:00:00.000Z',
		updatedAt: '2026-09-08T00:00:00.000Z',
	},
	{
		id: 'space-b',
		name: '生活',
		iconKey: 'home',
		colorKey: 'green',
		isDefault: false,
		position: 1,
		archivedAt: null,
		deletedAt: null,
		createdAt: '2026-09-08T00:00:00.000Z',
		updatedAt: '2026-09-08T00:00:00.000Z',
	},
]

const createdTask: TaskDetail = {
	id: 'task-created',
	spaceId: 'space-b',
	spaceName: '生活',
	spaceSlug: 'life',
	projectId: null,
	projectName: null,
	title: '整理行程',
	note: null,
	status: 'todo',
	statusChangedAt: '2026-09-08T00:00:00.000Z',
	priority: 0,
	dueAt: null,
	plannedAt: null,
	remindAt: null,
	completedAt: null,
	canceledAt: null,
	archivedAt: null,
	createdAt: '2026-09-08T00:00:00.000Z',
	updatedAt: '2026-09-08T00:00:00.000Z',
	position: 0,
	deletedAt: null,
}

const createdProject: ProjectDetail = {
	id: 'project-created',
	spaceId: 'space-b',
	spaceName: '生活',
	name: '旅行项目',
	description: null,
	status: 'todo',
	priority: 0,
	plannedAt: null,
	dueAt: null,
	remindAt: null,
	statusChangedAt: '2026-09-08T00:00:00.000Z',
	position: 0,
	completedAt: null,
	archivedAt: null,
	deletedAt: null,
	createdAt: '2026-09-08T00:00:00.000Z',
	updatedAt: '2026-09-08T00:00:00.000Z',
	taskCount: 0,
	activeTaskCount: 0,
}

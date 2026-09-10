import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'

import {
	COMMAND_IDS,
	CommandRegistry,
	CommandRuntime,
	KeybindingRegistry,
	ShortcutRegistryProvider,
	createEmptyCommandContext,
	type Command,
	type CommandContext,
	type CommandInvocation,
} from '@/features/command'

import { BulkActionBar } from './BulkActionBar'

const TEST_SHORTCUT_REGISTRY = new KeybindingRegistry([])

describe('BulkActionBar', () => {
	it('没有选中项时不打开 ActionBar', () => {
		const context = createEmptyCommandContext()
		const runtime = createRuntime([createCommand(COMMAND_IDS.openCommandMenu, '打开命令菜单')])

		renderBulkActionBar(<BulkActionBar context={context} runtime={runtime} />)

		expect(screen.queryByRole('toolbar', { name: '批量操作' })).not.toBeInTheDocument()
	})

	it('清空选择后保留操作栏直到 HeroUI 退出动效结束', async () => {
		const runtime = createRuntime([createCommand(COMMAND_IDS.openCommandMenu, '打开命令菜单')])
		const { rerender } = renderBulkActionBar(
			<BulkActionBar context={createSelectionContext('task', ['task-a'])} runtime={runtime} />,
		)
		const actionBar = screen.getByRole('toolbar', { name: '批量操作' })

		rerender(<BulkActionBar context={createEmptyCommandContext()} runtime={runtime} />)

		expect(actionBar).toBeInTheDocument()
		await waitFor(() => expect(actionBar).not.toBeInTheDocument())
	})

	it('从 CommandContext 显示选中数量并直接清空唯一选择状态', () => {
		const clearSelection = vi.fn<() => void>()
		const context = createSelectionContext('task', ['task-a', 'task-b', 'task-c'], {
			clearSelection,
		})
		const runtime = createRuntime([createCommand(COMMAND_IDS.openCommandMenu, '打开命令菜单')])

		renderBulkActionBar(<BulkActionBar context={context} runtime={runtime} />)

		const actionBar = screen.getByRole('toolbar', { name: '批量操作' })
		expect(actionBar).toHaveTextContent('3')
		expect(actionBar).not.toHaveTextContent('已选')
		expect(within(actionBar).getAllByRole('separator')).toHaveLength(2)
		fireEvent.click(screen.getByRole('button', { name: '清空已选' }))
		expect(clearSelection).toHaveBeenCalledTimes(1)
	})

	it('任务动作依次显示命令菜单、归档、删除，并使用捕获的选择快照', () => {
		const runOpen = vi.fn<(ctx: CommandContext, invocation: CommandInvocation) => void>()
		const runArchive = vi.fn<(ctx: CommandContext, invocation: CommandInvocation) => void>()
		const runDelete = vi.fn<(ctx: CommandContext, invocation: CommandInvocation) => void>()
		const capturedContext = createSelectionContext('task', ['task-a', 'task-b'])
		const laterContext = createSelectionContext('task', ['task-c'])
		const runtime = createRuntime(
			[
				createCommand(COMMAND_IDS.openCommandMenu, '打开命令菜单', { run: runOpen }),
				createCommand(COMMAND_IDS.taskArchive, '归档任务', { run: runArchive }),
				createCommand(COMMAND_IDS.taskDelete, '删除任务', { run: runDelete }),
				createCommand(COMMAND_IDS.projectArchive, '归档项目'),
			],
			() => laterContext,
		)

		renderBulkActionBar(<BulkActionBar context={capturedContext} runtime={runtime} />)

		const actionBar = screen.getByRole('toolbar', { name: '批量操作' })
		const openButton = screen.getByRole('button', { name: '打开命令菜单' })
		const archiveButton = screen.getByRole('button', { name: '归档任务' })
		const deleteButton = screen.getByRole('button', { name: '删除任务' })
		expect(within(actionBar).getAllByRole('button')).toEqual([
			openButton,
			archiveButton,
			deleteButton,
			screen.getByRole('button', { name: '清空已选' }),
		])
		expect(archiveButton).toHaveClass('button--tertiary')
		expect(archiveButton).toHaveClass('button--icon-only')
		expect(archiveButton.querySelector('svg')).not.toBeNull()
		expect(deleteButton).toHaveClass('button--danger')
		expect(deleteButton).toHaveClass('button--icon-only')
		expect(deleteButton.querySelector('svg')).not.toBeNull()
		expect(within(actionBar).getAllByRole('separator')).toHaveLength(3)

		fireEvent.click(openButton)
		fireEvent.click(archiveButton)
		fireEvent.click(deleteButton)
		for (const run of [runOpen, runArchive, runDelete]) {
			expect(run).toHaveBeenCalledExactlyOnceWith(capturedContext, { source: 'bulk-bar' })
		}
	})

	it('项目动作使用 projection 捕获的目标快照与 bulk-bar 调用来源', async () => {
		const runArchive = vi.fn<(ctx: CommandContext, invocation: CommandInvocation) => void>()
		const capturedContext = createSelectionContext('project', ['project-a', 'project-b'])
		const laterContext = createSelectionContext('project', ['project-c'])
		const runtime = createRuntime(
			[
				createCommand(COMMAND_IDS.projectArchive, '归档项目', { run: runArchive }),
				createCommand(COMMAND_IDS.projectDelete, '删除项目'),
			],
			() => laterContext,
		)

		renderBulkActionBar(<BulkActionBar context={capturedContext} runtime={runtime} />)
		fireEvent.click(screen.getByRole('button', { name: '归档项目' }))

		await waitFor(() => {
			expect(runArchive).toHaveBeenCalledWith(capturedContext, { source: 'bulk-bar' })
		})
		const actionBar = screen.getByRole('toolbar', { name: '批量操作' })
		const deleteButton = screen.getByRole('button', { name: '删除项目' })
		expect(deleteButton).toHaveClass('button--danger')
		expect(deleteButton.querySelector('svg')).not.toBeNull()
		expect(within(actionBar).getAllByRole('separator')).toHaveLength(3)
	})

	it.each([
		{
			page: 'archive' as const,
			visibleLabel: '移入回收站',
			hiddenLabel: '永久删除',
		},
		{
			page: 'trash' as const,
			visibleLabel: '永久删除',
			hiddenLabel: '移入回收站',
		},
	])(
		'生命周期 $page 只显示当前路由可见的 canonical 动作',
		({ page, visibleLabel, hiddenLabel }) => {
			const context = createSelectionContext('lifecycle', ['entry-a'], { page })
			const runtime = createRuntime([
				createCommand(COMMAND_IDS.lifecycleRestore, '恢复'),
				createCommand(COMMAND_IDS.lifecycleDelete, '移入回收站', {
					isVisible: (target) => target.route.page === 'archive',
				}),
				createCommand(COMMAND_IDS.lifecycleDeletePermanently, '永久删除', {
					isVisible: (target) => target.route.page === 'trash',
				}),
			])

			renderBulkActionBar(<BulkActionBar context={context} runtime={runtime} />)

			expect(screen.getByRole('button', { name: '恢复' })).toBeInTheDocument()
			expect(screen.getByRole('button', { name: visibleLabel })).toBeInTheDocument()
			expect(screen.queryByRole('button', { name: hiddenLabel })).not.toBeInTheDocument()
		},
	)

	it('禁用按钮直接消费 projection 的 disabled reason', () => {
		const context = createSelectionContext('project', ['project-a'])
		const runtime = createRuntime([
			createCommand(COMMAND_IDS.projectArchive, '归档项目', {
				isEnabled: () => false,
				getDisabledReason: () => '当前项目不可归档',
			}),
		])

		renderBulkActionBar(<BulkActionBar context={context} runtime={runtime} />)

		expect(screen.getByRole('button', { name: '归档项目' })).toBeDisabled()
		expect(screen.getByRole('group', { name: '当前项目不可归档' })).toBeInTheDocument()
	})
})

function createRuntime(commands: Command[], getContext = createEmptyCommandContext) {
	return new CommandRuntime({
		registry: new CommandRegistry(commands),
		getContext,
	})
}

function createCommand(
	id: Command['id'],
	title: string,
	overrides: Partial<Command> = {},
): Command {
	return {
		id,
		title,
		category: 'general',
		scope: ['global'],
		run: () => undefined,
		...overrides,
	}
}

function createSelectionContext(
	type: NonNullable<CommandContext['selection']['type']>,
	ids: string[],
	options: {
		clearSelection?: () => void
		page?: CommandContext['route']['page']
	} = {},
): CommandContext {
	const context = createEmptyCommandContext()
	return {
		...context,
		route: {
			...context.route,
			page: options.page ?? context.route.page,
		},
		selection: {
			type,
			ids,
			entities: ids.map((id) => ({ id, type, title: id })),
			primaryEntity: ids[0] ? { id: ids[0], type, title: ids[0] } : undefined,
			clearSelection: options.clearSelection ?? (() => undefined),
			source:
				type === 'project' ? 'project-list' : type === 'lifecycle' ? 'lifecycle-list' : 'task-list',
			hasSelection: ids.length > 0,
			isSingleSelection: ids.length === 1,
			isMultiSelection: ids.length > 1,
		},
	}
}

function renderBulkActionBar(ui: React.ReactNode) {
	return render(ui, {
		wrapper: ({ children }) => (
			<ShortcutRegistryProvider registry={TEST_SHORTCUT_REGISTRY}>
				{children}
			</ShortcutRegistryProvider>
		),
	})
}

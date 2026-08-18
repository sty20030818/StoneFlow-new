import { fireEvent, render, screen, waitFor } from '@testing-library/react'

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

		const { container } = renderBulkActionBar(<BulkActionBar context={context} runtime={runtime} />)

		expect(container).toBeEmptyDOMElement()
	})

	it('从 CommandContext 显示选中数量并直接清空唯一选择状态', () => {
		const clearSelection = vi.fn<() => void>()
		const context = createSelectionContext('task', ['task-a', 'task-b', 'task-c'], {
			clearSelection,
		})
		const runtime = createRuntime([createCommand(COMMAND_IDS.openCommandMenu, '打开命令菜单')])

		renderBulkActionBar(<BulkActionBar context={context} runtime={runtime} />)

		expect(screen.getByRole('toolbar', { name: '批量操作' })).toBeInTheDocument()
		expect(screen.getByText('已选 3 项')).toBeInTheDocument()
		fireEvent.click(screen.getByRole('button', { name: '清空已选' }))
		expect(clearSelection).toHaveBeenCalledTimes(1)
	})

	it('任务选择只显示 canonical 打开命令菜单动作', () => {
		const run = vi.fn<(ctx: CommandContext, invocation: CommandInvocation) => void>()
		const context = createSelectionContext('task', ['task-a'])
		const runtime = createRuntime([
			createCommand(COMMAND_IDS.openCommandMenu, '打开命令菜单', { run }),
			createCommand(COMMAND_IDS.projectArchive, '归档项目'),
		])

		renderBulkActionBar(<BulkActionBar context={context} runtime={runtime} />)
		fireEvent.click(screen.getByRole('button', { name: '打开命令菜单' }))

		expect(screen.queryByRole('button', { name: '归档项目' })).not.toBeInTheDocument()
		expect(run).toHaveBeenCalledWith(context, { source: 'bulk-bar' })
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
		expect(screen.getByRole('button', { name: '删除项目' })).toBeInTheDocument()
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
	return render(
		<ShortcutRegistryProvider registry={TEST_SHORTCUT_REGISTRY}>{ui}</ShortcutRegistryProvider>,
	)
}

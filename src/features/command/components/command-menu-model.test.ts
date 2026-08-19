import { buildCommandMenuGroups } from './command-menu-model'
import {
	CommandRegistry,
	CommandRuntime,
	COMMAND_IDS,
	createEmptyCommandContext,
	type Command,
	type CommandContext,
} from '@/features/command/core'
import { DEFAULT_KEYBINDINGS, KeybindingRegistry } from '@/features/command/keybinding'

const shortcutRegistry = new KeybindingRegistry(DEFAULT_KEYBINDINGS)

const context = createEmptyCommandContext()

describe('buildCommandMenuGroups', () => {
	it('过滤隐藏命令，保留 disabled 命令和原因', () => {
		const runtime = createRuntime([
			createCommand(COMMAND_IDS.openCommandMenu, {
				category: 'general',
			}),
			createCommand('test.hidden', {
				category: 'general',
				isVisible: () => false,
			}),
			createCommand(COMMAND_IDS.newView, {
				title: '新建视图',
				category: 'new',
				isEnabled: () => false,
				getDisabledReason: () => '视图创建入口尚未接入',
			}),
		])

		const groups = buildCommandMenuGroups(runtime, context, shortcutRegistry)
		const entries = groups.flatMap((group) => group.entries)

		expect(entries.map((entry) => entry.id)).toEqual([COMMAND_IDS.newView])
		expect(entries[0]).toMatchObject({
			label: '新建视图',
			enabled: false,
			disabledReason: '视图创建入口尚未接入',
			target: context,
		})
		expect(entries[0]).not.toHaveProperty('command')
		expect(entries[0]?.execute).toEqual(expect.any(Function))
	})

	it('按 priority 从高到低排序', () => {
		const runtime = createRuntime([
			createCommand('test.low', {
				category: 'new',
				getPriority: () => 1,
			}),
			createCommand('test.high', {
				category: 'new',
				getPriority: () => 10,
			}),
		])

		const [group] = buildCommandMenuGroups(runtime, context, shortcutRegistry)

		expect(group.entries.map((entry) => entry.id)).toEqual(['test.high', 'test.low'])
	})

	it('完整 V1 分类会生成菜单分组', () => {
		const runtime = createRuntime([
			createCommand('test.task', { category: 'task' }),
			createCommand('test.move', { category: 'move' }),
			createCommand('test.project', { category: 'project' }),
			createCommand('test.view', { category: 'view' }),
			createCommand('test.filter', { category: 'filter' }),
			createCommand('test.standalone', { category: 'task' }),
			createCommand('test.layout', { category: 'layout' }),
			createCommand('test.system', { category: 'system' }),
		])

		const groups = buildCommandMenuGroups(runtime, context, shortcutRegistry)

		expect(groups.map((group) => group.key)).toEqual(['action', 'project', 'task'])
	})

	it('有 task selection 时前置批量操作分组，并保留 disabled reason', () => {
		const runtime = createRuntime([
			createCommand(COMMAND_IDS.taskComplete, { category: 'task' }),
			createCommand(COMMAND_IDS.taskArchive, { category: 'task' }),
			createCommand(COMMAND_IDS.taskSetPriority, {
				category: 'task',
				isEnabled: () => false,
				getDisabledReason: () => '优先级 scoped picker 尚未接入',
			}),
			createCommand('test.normalTask', { category: 'task' }),
		])

		const groups = buildCommandMenuGroups(runtime, createTaskSelectionContext(), shortcutRegistry)

		expect(groups[0]?.key).toBe('bulk')
		expect(groups[0]?.entries.map((entry) => entry.id)).toEqual([
			COMMAND_IDS.taskComplete,
			COMMAND_IDS.taskArchive,
			COMMAND_IDS.taskSetPriority,
		])
		expect(groups[0]?.entries[2]).toMatchObject({
			enabled: false,
			disabledReason: '优先级 scoped picker 尚未接入',
		})
		expect(groups.find((group) => group.key === 'task')?.entries.map((entry) => entry.id)).toEqual([
			'test.normalTask',
		])
	})

	it.each([
		{
			page: 'archive' as const,
			expectedIds: [COMMAND_IDS.lifecycleRestore, COMMAND_IDS.lifecycleDelete],
		},
		{
			page: 'trash' as const,
			expectedIds: [COMMAND_IDS.lifecycleRestore, COMMAND_IDS.lifecycleDeletePermanently],
		},
	])('$page 页只显示适用的 lifecycle 批量命令', ({ page, expectedIds }) => {
		const runtime = createRuntime([
			createCommand(COMMAND_IDS.lifecycleRestore, { category: 'lifecycle' }),
			createCommand(COMMAND_IDS.lifecycleDelete, {
				category: 'lifecycle',
				isVisible: (ctx) => ctx.route.page === 'archive',
			}),
			createCommand(COMMAND_IDS.lifecycleDeletePermanently, {
				category: 'lifecycle',
				isVisible: (ctx) => ctx.route.page === 'trash',
			}),
		])

		const groups = buildCommandMenuGroups(
			runtime,
			createLifecycleSelectionContext({ page }),
			shortcutRegistry,
		)

		expect(groups[0]?.key).toBe('bulk')
		expect(groups[0]?.entries.map((entry) => entry.id)).toEqual(expectedIds)
	})

	it('project selection 显示归档和删除批量命令', () => {
		const runtime = createRuntime([
			createCommand(COMMAND_IDS.projectArchive, { category: 'project' }),
			createCommand(COMMAND_IDS.projectDelete, { category: 'project' }),
			createCommand('test.normalProject', { category: 'project' }),
		])

		const groups = buildCommandMenuGroups(
			runtime,
			createProjectSelectionContext(),
			shortcutRegistry,
		)

		expect(groups[0]?.key).toBe('bulk')
		expect(groups[0]?.entries.map((entry) => entry.id)).toEqual([
			COMMAND_IDS.projectArchive,
			COMMAND_IDS.projectDelete,
		])
		expect(
			groups.find((group) => group.key === 'project')?.entries.map((entry) => entry.id),
		).toEqual(['test.normalProject'])
	})
})

function createRuntime(commands: Command[]) {
	return new CommandRuntime({
		registry: new CommandRegistry(commands),
		getContext: () => context,
	})
}

function createTaskSelectionContext(): CommandContext {
	return {
		...context,
		selection: {
			type: 'task',
			ids: ['task-a'],
			entities: [{ id: 'task-a', type: 'task', title: '任务 A' }],
			primaryEntity: { id: 'task-a', type: 'task', title: '任务 A' },
			source: 'task-list',
			hasSelection: true,
			isSingleSelection: true,
			isMultiSelection: false,
		},
	}
}

function createLifecycleSelectionContext({ page }: { page: 'archive' | 'trash' }): CommandContext {
	return {
		...context,
		route: {
			page,
		},
		selection: {
			type: 'lifecycle',
			ids: ['entry-a'],
			entities: [
				{
					id: 'entry-a',
					type: 'lifecycle',
					title: '条目 A',
					lifecycleMode: page,
					lifecycleEntityType: 'task',
				},
			],
			primaryEntity: {
				id: 'entry-a',
				type: 'lifecycle',
				title: '条目 A',
				lifecycleMode: page,
				lifecycleEntityType: 'task',
			},
			source: 'task-list',
			hasSelection: true,
			isSingleSelection: true,
			isMultiSelection: false,
		},
	}
}

function createProjectSelectionContext(): CommandContext {
	return {
		...context,
		selection: {
			type: 'project',
			ids: ['project-a'],
			entities: [{ id: 'project-a', type: 'project', title: '项目 A' }],
			primaryEntity: { id: 'project-a', type: 'project', title: '项目 A' },
			source: 'project-list',
			hasSelection: true,
			isSingleSelection: true,
			isMultiSelection: false,
		},
	}
}

function createCommand(id: string, overrides: Partial<Command> = {}): Command {
	return {
		id,
		title: id,
		category: 'general',
		scope: ['global'],
		run: () => {},
		...overrides,
	}
}

import { buildCommandMenuGroups, getCommandMenuShortcut } from './command-menu-model'
import {
	CommandRegistry,
	CommandRuntime,
	COMMAND_IDS,
	createEmptyCommandContext,
	type Command,
} from '@/features/command/core'

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
				category: 'new',
				isEnabled: () => false,
				getDisabledReason: () => '视图创建入口尚未接入',
			}),
		])

		const groups = buildCommandMenuGroups(runtime, context)
		const entries = groups.flatMap((group) => group.entries)

		expect(entries.map((entry) => entry.command.id)).toEqual([COMMAND_IDS.newView])
		expect(entries[0]).toMatchObject({
			disabled: true,
			disabledReason: '视图创建入口尚未接入',
		})
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

		const [group] = buildCommandMenuGroups(runtime, context)

		expect(group.entries.map((entry) => entry.command.id)).toEqual(['test.high', 'test.low'])
	})

	it('快捷键文案来自默认 keybinding registry', () => {
		expect(getCommandMenuShortcut(COMMAND_IDS.newQuickTask)).toBe('C')
		expect(getCommandMenuShortcut(COMMAND_IDS.newFullTask)).toBe('N T')
	})
})

function createRuntime(commands: Command[]) {
	return new CommandRuntime({
		registry: new CommandRegistry(commands),
		getContext: () => context,
	})
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

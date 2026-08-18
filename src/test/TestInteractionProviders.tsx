import { render, type RenderOptions } from '@testing-library/react'
import type { PropsWithChildren, ReactNode } from 'react'

import {
	DEFAULT_KEYBINDINGS,
	CommandRegistry,
	CommandRuntime,
	CommandRuntimeProvider,
	COMMAND_IDS,
	createEmptyCommandContext,
	KeybindingRegistry,
	ShortcutRegistryProvider,
	type Command,
} from '@/features/command'
import { SELECTION_SHORTCUT_BINDINGS } from '@/features/selection/shortcut-contribution'
import { TASK_ROW_SHORTCUT_BINDINGS } from '@/features/task/shortcut-contribution'

const TEST_SHORTCUT_REGISTRY = new KeybindingRegistry([
	...DEFAULT_KEYBINDINGS,
	...SELECTION_SHORTCUT_BINDINGS,
	...TASK_ROW_SHORTCUT_BINDINGS,
])
const TEST_COMMAND_CONTEXT = createEmptyCommandContext()
const TEST_COMMANDS: Command[] = [
	[COMMAND_IDS.taskOpenDetail, '打开任务详情'],
	[COMMAND_IDS.taskPeek, '预览任务'],
	[COMMAND_IDS.taskComplete, '完成任务'],
	[COMMAND_IDS.taskSetPriority, '设置任务优先级'],
	[COMMAND_IDS.taskSetStatus, '设置任务状态'],
	[COMMAND_IDS.taskOpenDateMenu, '设置任务日期'],
	[COMMAND_IDS.taskChangePlacement, '移动到...'],
	[COMMAND_IDS.taskArchive, '归档任务'],
	[COMMAND_IDS.taskDelete, '删除任务'],
].map(([id, title]) => ({
	id,
	title,
	category: 'task',
	scope: ['task-list'],
	run: () => undefined,
}))
const TEST_COMMAND_RUNTIME = new CommandRuntime({
	registry: new CommandRegistry(TEST_COMMANDS),
	getContext: () => TEST_COMMAND_CONTEXT,
})

/** 为组件测试提供与应用组合根一致的快捷键上下文。 */
export function TestInteractionProviders({ children }: PropsWithChildren) {
	return (
		<ShortcutRegistryProvider registry={TEST_SHORTCUT_REGISTRY}>
			<CommandRuntimeProvider context={TEST_COMMAND_CONTEXT} runtime={TEST_COMMAND_RUNTIME}>
				{children}
			</CommandRuntimeProvider>
		</ShortcutRegistryProvider>
	)
}

export function renderWithInteractionProviders(node: ReactNode, options?: RenderOptions) {
	return render(<TestInteractionProviders>{node}</TestInteractionProviders>, options)
}

import * as React from 'react'
import { mergeProps, mergeRefs } from '@react-aria/utils'

import type { CommandId } from '@/features/command/core'
import type { KeybindingScope } from '@/features/command/keybinding'
import { resolveCommandShortcut, useShortcutRegistry } from '@/features/command/shortcuts'
import { ShortcutTokens } from '@/shared/components/ShortcutTokens'
import { ActionTooltip } from '@/shared/components/tooltip'

type CommandTooltipRowProps = {
	commandId: CommandId
	label: React.ReactNode
	scope?: KeybindingScope
}

type CommandShortcutProps = {
	commandId: CommandId
	scope?: KeybindingScope
	className?: string
}

function useCommandShortcutTokens(commandId: CommandId, scope: KeybindingScope) {
	const registry = useShortcutRegistry()

	return resolveCommandShortcut({
		registry,
		commandId,
		scope,
		mode: 'primary',
	})
}

/** 在菜单、按钮等组合组件中渲染 canonical 主快捷键，不复制键帽字符串。 */
function CommandShortcut({ commandId, scope = 'global', className }: CommandShortcutProps) {
	const tokens = useCommandShortcutTokens(commandId, scope)

	if (!tokens) {
		return null
	}

	return <ShortcutTokens className={className} tokens={tokens} />
}

/**
 * Command Tooltip 的内容适配器：只负责把 Registry 中的主快捷键投影为统一键帽。
 * 可单独放入 Sidebar / ContextMenu 自己管理的 Tooltip Root，避免 overlay trigger 嵌套。
 */
function CommandTooltipRow({ commandId, label, scope = 'global' }: CommandTooltipRowProps) {
	const tokens = useCommandShortcutTokens(commandId, scope)

	return (
		<ActionTooltip.Row
			label={label}
			shortcut={tokens ? <ShortcutTokens tokens={tokens} /> : undefined}
		/>
	)
}

type TooltipRootControlProps = Pick<
	React.ComponentProps<typeof ActionTooltip>,
	'defaultOpen' | 'isOpen' | 'onOpenChange'
>

type CommandActionTooltipProps = TooltipRootControlProps &
	Omit<React.ComponentPropsWithoutRef<'span'>, 'children' | 'onOpenChange'> & {
		children: React.ReactElement<Record<string, unknown>>
		commandId: CommandId
		label: React.ReactNode
		scope?: KeybindingScope
	}

type DisabledCommandActionTooltipProps = TooltipRootControlProps & {
	children: React.ReactElement<Record<string, unknown>>
	commandId: CommandId
	label: string
	scope?: KeybindingScope
}

/**
 * Command 绑定操作的标准 Tooltip。
 * 顶层剩余属性与 ref 会合并到唯一真实 trigger，供 Dropdown/Popover 等组合组件复用。
 */
const CommandActionTooltip = React.forwardRef<HTMLElement, CommandActionTooltipProps>(
	function CommandActionTooltip(
		{
			children,
			commandId,
			defaultOpen,
			isOpen,
			label,
			onOpenChange,
			scope = 'global',
			...triggerProps
		},
		ref,
	) {
		const tokens = useCommandShortcutTokens(commandId, scope)
		const mergedTriggerProps = mergeProps(triggerProps, children.props)
		mergedTriggerProps.ref = mergeRefs(
			ref,
			children.props.ref as React.Ref<HTMLElement> | undefined,
		)
		const trigger = React.cloneElement(children, mergedTriggerProps)

		return (
			<ActionTooltip
				defaultOpen={defaultOpen}
				isOpen={isOpen}
				label={label}
				onOpenChange={onOpenChange}
				shortcut={tokens ? <ShortcutTokens tokens={tokens} /> : undefined}
			>
				{trigger}
			</ActionTooltip>
		)
	},
)

/** 让原生 disabled 控件仍可 hover / focus，同时复用同一命令提示内容。 */
function DisabledCommandActionTooltip({
	children,
	label,
	...tooltipProps
}: DisabledCommandActionTooltipProps) {
	return (
		<CommandActionTooltip {...tooltipProps} label={label}>
			<span
				aria-disabled='true'
				aria-label={label}
				className='inline-flex max-w-full cursor-not-allowed'
				data-slot='disabled-command-action-tooltip-trigger'
				role='group'
				tabIndex={0}
			>
				{children}
			</span>
		</CommandActionTooltip>
	)
}

export { CommandActionTooltip, CommandShortcut, CommandTooltipRow, DisabledCommandActionTooltip }

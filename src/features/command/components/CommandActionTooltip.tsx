import * as React from 'react'
import { Slot } from 'radix-ui'

import type { CommandId } from '@/features/command/core'
import type { KeybindingScope } from '@/features/command/keybinding'
import {
	getShortcutAccessibilityLabel,
	resolveCommandShortcut,
	useShortcutRegistry,
} from '@/features/command/shortcuts'
import { ActionTooltip } from '@/shared/components/tooltip'

import { ShortcutTokens } from './ShortcutTokens'

type CommandTooltipRowProps = {
	commandId: CommandId
	label: React.ReactNode
	scope?: KeybindingScope
}

type CommandShortcutProps = {
	commandId: CommandId
	scope?: KeybindingScope
	className?: string
	kbdClassName?: string
	separatorClassName?: string
}

/** 在菜单、按钮等组合组件中渲染 canonical 主快捷键，不复制键帽字符串。 */
function CommandShortcut({
	commandId,
	scope = 'global',
	className,
	kbdClassName,
	separatorClassName,
}: CommandShortcutProps) {
	const registry = useShortcutRegistry()
	const tokens = resolveCommandShortcut({
		registry,
		commandId,
		scope,
		mode: 'primary',
	})

	if (!tokens) {
		return null
	}

	return (
		<ShortcutTokens
			accessibilityLabel={getShortcutAccessibilityLabel(tokens)}
			className={className}
			kbdClassName={kbdClassName}
			separatorClassName={separatorClassName}
			tokens={tokens}
		/>
	)
}

/**
 * Command Tooltip 的内容适配器：只负责把 Registry 中的主快捷键投影为统一键帽。
 * 可单独放入 Sidebar / ContextMenu 自己管理的 Tooltip Root，避免 overlay trigger 嵌套。
 */
function CommandTooltipRow({ commandId, label, scope = 'global' }: CommandTooltipRowProps) {
	const registry = useShortcutRegistry()
	const tokens = resolveCommandShortcut({
		registry,
		commandId,
		scope,
		mode: 'primary',
	})

	return (
		<ActionTooltip.Row
			label={label}
			shortcut={
				tokens ? (
					<ShortcutTokens
						accessibilityLabel={getShortcutAccessibilityLabel(tokens)}
						tokens={tokens}
					/>
				) : undefined
			}
		/>
	)
}

type TooltipRootControlProps = Pick<
	React.ComponentProps<typeof ActionTooltip>,
	'defaultOpen' | 'delayDuration' | 'disableHoverableContent' | 'onOpenChange' | 'open'
>

type CommandActionTooltipProps = TooltipRootControlProps &
	Omit<React.ComponentPropsWithoutRef<'span'>, 'children' | 'onOpenChange'> & {
		children: React.ReactElement
		commandId: CommandId
		contentProps?: Omit<React.ComponentProps<typeof ActionTooltip.Content>, 'children'>
		label: React.ReactNode
		scope?: KeybindingScope
	}

/**
 * Command 绑定操作的标准 Tooltip。
 * 顶层剩余属性会经 Slot 转发到真实 trigger，因此可安全作为 Dropdown/Popover 的 asChild 子节点。
 */
const CommandActionTooltip = React.forwardRef<HTMLElement, CommandActionTooltipProps>(
	function CommandActionTooltip(
		{
			children,
			commandId,
			contentProps,
			defaultOpen,
			delayDuration,
			disableHoverableContent,
			label,
			onOpenChange,
			open,
			scope = 'global',
			...triggerProps
		},
		ref,
	) {
		return (
			<ActionTooltip
				defaultOpen={defaultOpen}
				delayDuration={delayDuration}
				disableHoverableContent={disableHoverableContent}
				onOpenChange={onOpenChange}
				open={open}
			>
				<ActionTooltip.Trigger asChild>
					<Slot.Root {...triggerProps} ref={ref}>
						{children}
					</Slot.Root>
				</ActionTooltip.Trigger>
				<ActionTooltip.Content {...contentProps}>
					<CommandTooltipRow commandId={commandId} label={label} scope={scope} />
				</ActionTooltip.Content>
			</ActionTooltip>
		)
	},
)

export { CommandActionTooltip, CommandShortcut, CommandTooltipRow }
export type { CommandActionTooltipProps, CommandShortcutProps, CommandTooltipRowProps }

import { useState, type ComponentType, type ReactNode } from 'react'
import { Link, useMatchRoute, useRouterState } from '@tanstack/react-router'

import { CommandTooltipRow, type CommandId } from '@/features/command'
import { ContextMenu, ContextMenuTrigger } from '@/shared/components/base/context-menu'
import { SidebarMenuBadge, SidebarMenuButton } from '@/shared/components/base/sidebar'
import {
	sidebarMenuIconClass,
	sidebarMenuLabelClass,
	sidebarNavBadgeSlotClass,
	sidebarShellNavLinkStretchClass,
} from '@/shared/components/patterns/sidebar-item'
import { ActionTooltip } from '@/shared/components/tooltip'

type SidebarNavRowLayoutProps = {
	icon: ComponentType<{ className?: string }>
	label: ReactNode
	badge?: string
}

/** 仅负责三列内容（图标 / 标题 / 数字槽），不关心路由与菜单。 */
function SidebarNavRowLayout({ icon: Icon, label, badge }: SidebarNavRowLayoutProps) {
	return (
		<>
			<Icon className={sidebarMenuIconClass} />
			{label}
			<span className={sidebarNavBadgeSlotClass}>
				{badge ? <SidebarMenuBadge>{badge}</SidebarMenuBadge> : null}
			</span>
		</>
	)
}

function useSidebarNavIsActive(to: string) {
	const matchRoute = useMatchRoute()
	const pathname = useRouterState({ select: (state) => state.location.pathname })
	return Boolean(matchRoute({ to: to as never, pending: false })) || pathname === to
}

export type SidebarNavRowProps = {
	to: string
	label: string
	icon: ComponentType<{ className?: string }>
	commandId: CommandId
	badge?: string
	/** 须自带 ContextMenuContent；不传则不包裹 ContextMenu。 */
	contextMenuContent?: ReactNode
}

/**
 * 固定导航动作：Tooltip 始终从 Command Registry 解析主快捷键。
 * 右键菜单打开时显式关闭 Tooltip，避免两个浮层争夺焦点与锚点。
 */
export function SidebarNavRow({
	to,
	label,
	icon,
	commandId,
	badge,
	contextMenuContent,
}: SidebarNavRowProps) {
	const isActive = useSidebarNavIsActive(to)
	const [contextMenuOpen, setContextMenuOpen] = useState(false)
	const [tooltipOpen, setTooltipOpen] = useState(false)
	const buttonRow = (
		<SidebarMenuButton asChild isActive={isActive}>
			<Link from='/' to={to as never}>
				<SidebarNavRowLayout
					badge={badge}
					icon={icon}
					label={<span className={sidebarMenuLabelClass}>{label}</span>}
				/>
			</Link>
		</SidebarMenuButton>
	)

	const tooltip = (
		<ActionTooltip
			onOpenChange={(open) => setTooltipOpen(open && !contextMenuOpen)}
			open={tooltipOpen && !contextMenuOpen}
		>
			<ActionTooltip.Trigger asChild>
				{contextMenuContent ? (
					<ContextMenuTrigger asChild onContextMenu={(event) => event.stopPropagation()}>
						{buttonRow}
					</ContextMenuTrigger>
				) : (
					buttonRow
				)}
			</ActionTooltip.Trigger>
			<ActionTooltip.Content side='right' sideOffset={8}>
				<CommandTooltipRow commandId={commandId} label={label} />
			</ActionTooltip.Content>
		</ActionTooltip>
	)

	return (
		<div className={sidebarShellNavLinkStretchClass}>
			{contextMenuContent ? (
				<ContextMenu
					onOpenChange={(open) => {
						setContextMenuOpen(open)
						if (open) {
							setTooltipOpen(false)
						}
					}}
					open={contextMenuOpen}
				>
					{tooltip}
					{contextMenuContent}
				</ContextMenu>
			) : (
				tooltip
			)}
		</div>
	)
}

export type SidebarProjectNavRowProps = Omit<SidebarNavRowProps, 'commandId' | 'contextMenuContent'>

/** 动态项目不是全局命令；仍按 Sidebar 导航口径始终展示名称 Tooltip。 */
export function SidebarProjectNavRow({ to, label, icon, badge }: SidebarProjectNavRowProps) {
	const isActive = useSidebarNavIsActive(to)
	const buttonRow = (
		<SidebarMenuButton asChild isActive={isActive}>
			<Link from='/' to={to as never}>
				<SidebarNavRowLayout
					badge={badge}
					icon={icon}
					label={<span className={sidebarMenuLabelClass}>{label}</span>}
				/>
			</Link>
		</SidebarMenuButton>
	)

	return (
		<div className={sidebarShellNavLinkStretchClass}>
			<ActionTooltip>
				<ActionTooltip.Trigger asChild>{buttonRow}</ActionTooltip.Trigger>
				<ActionTooltip.Content side='right' sideOffset={8}>
					<ActionTooltip.Row label={label} />
				</ActionTooltip.Content>
			</ActionTooltip>
		</div>
	)
}

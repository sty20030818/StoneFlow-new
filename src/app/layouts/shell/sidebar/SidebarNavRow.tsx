import type { ComponentType, ReactNode } from 'react'
import { Link, useMatchRoute, useRouterState } from '@tanstack/react-router'

import { ContextMenu, ContextMenuTrigger } from '@/shared/ui/base/context-menu'
import { SidebarMenuBadge, SidebarMenuButton } from '@/shared/ui/base/sidebar'
import {
	sidebarMenuIconClass,
	sidebarMenuLabelClass,
	sidebarNavBadgeSlotClass,
	sidebarShellNavLinkStretchClass,
} from '@/shared/ui/patterns/sidebar-item'

/** 仅负责三列内容（图标 / 标题 / 数字槽），不关心路由与菜单 */
export function SidebarNavRowLayout({
	icon: Icon,
	label,
	badge,
}: {
	icon: ComponentType<{ className?: string }>
	label: string
	badge?: string
}) {
	return (
		<>
			<Icon className={sidebarMenuIconClass} />
			<span className={sidebarMenuLabelClass}>{label}</span>
			<span className={sidebarNavBadgeSlotClass}>
				{badge ? <SidebarMenuBadge>{badge}</SidebarMenuBadge> : null}
			</span>
		</>
	)
}

export type SidebarNavRowProps = {
	to: string
	label: string
	icon: ComponentType<{ className?: string }>
	badge?: string
	/** 折叠为 icon rail 时的 Tooltip；省略则用 label */
	tooltip?: string
	/** 须自带 ContextMenuContent；不传则不包裹 ContextMenu */
	contextMenuContent?: ReactNode
}

/**
 * Shell 侧栏统一导航行：Stretch + SidebarMenuButton + NavLink + 可选右键菜单。
 * 菜单内容由调用方注入，避免在此处分叉业务分支。
 */
export function SidebarNavRow({
	to,
	label,
	icon,
	badge,
	tooltip,
	contextMenuContent,
}: SidebarNavRowProps) {
	const matchRoute = useMatchRoute()
	const pathname = useRouterState({ select: (state) => state.location.pathname })
	const isActive = Boolean(matchRoute({ to: to as never, pending: false })) || pathname === to

	const buttonRow = (
		<SidebarMenuButton asChild isActive={isActive} tooltip={tooltip ?? label}>
			<Link from='/' to={to as never}>
				<SidebarNavRowLayout badge={badge} icon={icon} label={label} />
			</Link>
		</SidebarMenuButton>
	)

	const stretchedRow = <div className={sidebarShellNavLinkStretchClass}>{buttonRow}</div>

	if (!contextMenuContent) {
		return stretchedRow
	}

	return (
		<ContextMenu>
			<ContextMenuTrigger asChild onContextMenu={(event) => event.stopPropagation()}>
				{stretchedRow}
			</ContextMenuTrigger>
			{contextMenuContent}
		</ContextMenu>
	)
}

import { useState, type ComponentType, type ReactNode } from 'react'
import { useMatchRoute, useRouterState } from '@tanstack/react-router'
import { ContextMenu, Sidebar } from '@heroui-pro/react'

import { CommandTooltipRow, type CommandId } from '@/features/command'

type SidebarNavRowLayoutProps = {
	icon: ComponentType<{ className?: string }>
	label: ReactNode
	badge?: string
}

function SidebarNavRowLayout({ icon: Icon, label, badge }: SidebarNavRowLayoutProps) {
	return (
		<>
			<Sidebar.MenuIcon>
				<Icon className='size-4' />
			</Sidebar.MenuIcon>
			<Sidebar.MenuLabel>{label}</Sidebar.MenuLabel>
			{badge ? <Sidebar.MenuChip>{badge}</Sidebar.MenuChip> : null}
		</>
	)
}

function useSidebarNavIsActive(to: string) {
	const matchRoute = useMatchRoute()
	const pathname = useRouterState({
		select: (state) => state.location.pathname,
	})
	return Boolean(matchRoute({ to: to as never, pending: false })) || pathname === to
}

export type SidebarNavRowProps = {
	to: string
	label: string
	icon: ComponentType<{ className?: string }>
	commandId: CommandId
	badge?: string
	/** HeroUI ContextMenu.Popover；不传则仅渲染导航项。 */
	contextMenuContent?: ReactNode
}

/** HeroUI Sidebar 导航项；路由高亮、Tooltip 与右键菜单共用一个 TreeItem。 */
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
	const content = <SidebarNavRowLayout badge={badge} icon={icon} label={label} />

	return (
		<Sidebar.MenuItem
			href={to}
			id={`nav:${commandId}`}
			isCurrent={isActive}
			textValue={label}
			tooltipProps={{
				content: <CommandTooltipRow commandId={commandId} label={label} />,
				closeDelay: 0,
				delay: 0,
				placement: 'right',
			}}
		>
			{contextMenuContent ? (
				<ContextMenu open={contextMenuOpen} onOpenChange={setContextMenuOpen}>
					<ContextMenu.Trigger
						className='flex w-full min-w-0 items-center gap-2 group-data-[sidebar-mode=icon]/sidebar:justify-center group-data-[sidebar-mode=icon]/sidebar:gap-0'
						data-open={contextMenuOpen || undefined}
					>
						{content}
					</ContextMenu.Trigger>
					{contextMenuContent}
				</ContextMenu>
			) : (
				content
			)}
		</Sidebar.MenuItem>
	)
}

export type SidebarProjectNavRowProps = Omit<
	SidebarNavRowProps,
	'commandId' | 'contextMenuContent'
> & {
	projectId: string
}

/** 动态项目没有全局命令，但仍使用 HeroUI Sidebar 自带 Tooltip。 */
export function SidebarProjectNavRow({
	to,
	label,
	icon,
	badge,
	projectId,
}: SidebarProjectNavRowProps) {
	const isActive = useSidebarNavIsActive(to)

	return (
		<Sidebar.MenuItem
			href={to}
			id={`project:${projectId}`}
			isCurrent={isActive}
			textValue={label}
			tooltipProps={{
				content: label,
				closeDelay: 0,
				delay: 0,
				placement: 'right',
			}}
		>
			<SidebarNavRowLayout badge={badge} icon={icon} label={label} />
		</Sidebar.MenuItem>
	)
}

import type { ComponentType } from 'react'
import { NavLink, useMatch, useNavigate } from 'react-router-dom'

import {
	SHELL_FOOTER_ITEMS,
	SHELL_NAV_ITEMS,
	SHELL_SPACES,
	type ShellProjectLink,
} from '@/app/layouts/shell/config'
import {
	selectProjectTreeCollapsed,
	toProjectTreeKey,
	useShellPreferenceStore,
} from '@/app/layouts/shell/model/useShellPreferenceStore'
import type { ShellSectionKey } from '@/app/layouts/shell/types'
import type {
	SidebarItemVisibilityTarget,
	SidebarMainItemKey,
	SidebarSettings,
} from '@/features/settings/api/sidebarSettings'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/base/button'
import {
	ContextMenu,
	ContextMenuCheckboxItem,
	ContextMenuContent,
	ContextMenuGroup,
	ContextMenuItem,
	ContextMenuLabel,
	ContextMenuSeparator,
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuSubTrigger,
	ContextMenuTrigger,
} from '@/shared/ui/base/context-menu'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/shared/ui/base/dropdown-menu'
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupAction,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuBadge,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
	SidebarRail,
} from '@/shared/ui/base/sidebar'
import { useSidebar } from '@/shared/ui/base/sidebar-context'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shared/ui/base/collapsible'
import {
	CheckIcon,
	ChevronRightIcon,
	ChevronsUpDownIcon,
	ExternalLinkIcon,
	FolderIcon,
	FolderPlusIcon,
	PanelLeftIcon,
	PlusIcon,
	RotateCcwIcon,
	Trash2Icon,
} from 'lucide-react'

type ShellNavBadges = Partial<Record<ShellSectionKey, string>>

type ShellSidebarProps = {
	currentSpaceId: string
	projects: ShellProjectLink[]
	settings: SidebarSettings
	navBadges?: ShellNavBadges
	onOpenProjectCreateDialog: (parentProjectId?: string | null) => void
	onUpdateItemVisibility: (target: SidebarItemVisibilityTarget, visible: boolean) => void
	onResetMainItemsVisibility: () => void
}

type SidebarRouteItem = {
	label: string
	icon: ComponentType<{ className?: string }>
	to: string
	badge?: string
	size?: 'default' | 'sm'
}

type MainNavItemViewModel = SidebarRouteItem & {
	key: SidebarMainItemKey
	visible: boolean
	order: number
}

const SIDEBAR_ENTITY_SELECTOR = [
	'a[href]',
	'button',
	'[data-slot="dropdown-menu-trigger"]',
	'[data-slot="dropdown-menu-content"]',
	'[data-slot="context-menu-content"]',
].join(', ')

export function ShellSidebar({
	currentSpaceId,
	projects,
	settings,
	navBadges = {},
	onOpenProjectCreateDialog,
	onUpdateItemVisibility,
	onResetMainItemsVisibility,
}: ShellSidebarProps) {
	const navigate = useNavigate()
	const { isMobile } = useSidebar()
	const activeSpace = SHELL_SPACES.find((space) => space.id === currentSpaceId) ?? SHELL_SPACES[0]
	const projectTreeCollapsed = useShellPreferenceStore(selectProjectTreeCollapsed)
	const setProjectTreeCollapsed = useShellPreferenceStore((state) => state.setProjectTreeCollapsed)

	const mainNavItems = SHELL_NAV_ITEMS.map((item) => ({
		...item,
		badge: navBadges[item.section],
		to: item.to(currentSpaceId),
		visible: settings.mainItems[item.key as SidebarMainItemKey].visible,
		order: settings.mainItems[item.key as SidebarMainItemKey].order,
	})) satisfies MainNavItemViewModel[]
	const visibleNavItems = [...mainNavItems]
		.filter((item) => item.visible)
		.sort((left, right) => left.order - right.order)
	const visibleNavItemCount = visibleNavItems.length
	const footerItems = [...SHELL_FOOTER_ITEMS]
		.map((item) => ({
			...item,
			badge: navBadges[item.section],
			to: item.to(currentSpaceId),
			visible: settings.footerItems[item.key].visible,
			order: settings.footerItems[item.key].order,
		}))
		.filter((item) => item.visible)
		.sort((left, right) => left.order - right.order)
	const projectLinks = settings.projectSection.maxVisible
		? projects.slice(0, settings.projectSection.maxVisible)
		: projects

	const handleSidebarContextMenu = (event: React.MouseEvent<HTMLElement>) => {
		const target = event.target
		if (!(target instanceof HTMLElement)) {
			event.preventDefault()
			return
		}

		if (target.closest(SIDEBAR_ENTITY_SELECTOR)) {
			event.preventDefault()
		}
	}

	return (
		<ContextMenu>
			<ContextMenuTrigger asChild onContextMenu={handleSidebarContextMenu}>
				<Sidebar collapsible='icon'>
					<SidebarHeader className='px-3 pb-4 pt-2 group-data-[sidebar-mode=desktop-collapsed]/sidebar-wrapper:px-2 group-data-[sidebar-mode=mobile-closed]/sidebar-wrapper:px-2'>
						<div className='flex items-center gap-1.5'>
							<SidebarMenu className='flex-1'>
								<SidebarMenuItem>
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<SidebarMenuButton
												aria-label='切换 Space'
												size='lg'
												tooltip={activeSpace.label}
											>
												<SpaceIconBadge space={activeSpace} />
												<span className='min-w-0 flex-1 truncate text-left font-semibold'>
													{activeSpace.label}
												</span>
												<ChevronsUpDownIcon className='shrink-0 text-(--sf-color-icon-subtle) group-data-[sidebar-mode=desktop-collapsed]/sidebar-wrapper:hidden group-data-[sidebar-mode=mobile-closed]/sidebar-wrapper:hidden' />
											</SidebarMenuButton>
										</DropdownMenuTrigger>
										<DropdownMenuContent
											align='start'
											side={isMobile ? 'bottom' : 'right'}
											sideOffset={6}
										>
											<DropdownMenuLabel>Spaces</DropdownMenuLabel>
											<DropdownMenuGroup>
												{SHELL_SPACES.map((space) => {
													const isActive = space.id === activeSpace.id
													const SpaceIcon = space.icon

													return (
														<DropdownMenuItem
															className='gap-2 p-2'
															key={space.id}
															onSelect={() => {
																navigate(`/space/${space.id}/inbox`)
															}}
														>
															<SpaceIcon className={cn('shrink-0', space.iconClassName)} />
															<span>{space.label}</span>
															{isActive ? (
																<CheckIcon className='ml-auto size-3.5 text-(--sf-color-icon-secondary)' />
															) : null}
														</DropdownMenuItem>
													)
												})}
											</DropdownMenuGroup>
											<DropdownMenuSeparator />
											<DropdownMenuGroup>
												<DropdownMenuItem className='gap-2 p-2' disabled>
													<PlusIcon className='shrink-0 text-(--sf-color-icon-secondary)' />
													<span className='text-(--sf-color-shell-secondary)'>Add space</span>
												</DropdownMenuItem>
											</DropdownMenuGroup>
										</DropdownMenuContent>
									</DropdownMenu>
								</SidebarMenuItem>
							</SidebarMenu>
						</div>
					</SidebarHeader>

					<SidebarContent className='no-scrollbar gap-4 pb-4'>
						<SidebarGroup>
							<SidebarGroupContent>
								<SidebarMenu>
									{visibleNavItems.map((item) => (
										<SidebarNavMenuItem
											badge={item.badge}
											itemKey={item.key}
											key={item.key}
											label={item.label}
											navItems={mainNavItems}
											onResetMainItemsVisibility={onResetMainItemsVisibility}
											onUpdateItemVisibility={onUpdateItemVisibility}
											to={item.to}
											visibleNavItemCount={visibleNavItemCount}
											icon={item.icon}
										/>
									))}
								</SidebarMenu>
							</SidebarGroupContent>
						</SidebarGroup>

						{settings.projectSection.visible ? (
							<SidebarGroup className='group-data-[sidebar-mode=desktop-collapsed]/sidebar-wrapper:hidden group-data-[sidebar-mode=mobile-closed]/sidebar-wrapper:hidden'>
								<div className='flex items-center justify-between px-2.5'>
									<SidebarGroupLabel className='px-0'>Projects</SidebarGroupLabel>
									<SidebarGroupAction
										aria-label='创建项目'
										onClick={() => onOpenProjectCreateDialog()}
										type='button'
									>
										<PlusIcon />
									</SidebarGroupAction>
								</div>

								{!settings.projectSection.collapsed ? (
									<SidebarGroupContent>
										<SidebarMenu>
											{projectLinks.map((project) => (
												<ProjectSidebarMenuItem
													currentSpaceId={currentSpaceId}
													key={project.id}
													onOpenProjectCreateDialog={onOpenProjectCreateDialog}
													onToggleProjectCollapsed={(payload) => setProjectTreeCollapsed(payload)}
													project={project}
													projectTreeCollapsed={projectTreeCollapsed}
												/>
											))}
										</SidebarMenu>
									</SidebarGroupContent>
								) : null}
							</SidebarGroup>
						) : null}
					</SidebarContent>

					<SidebarFooter className='border-t border-(--sf-color-divider) px-3 py-3 group-data-[sidebar-mode=desktop-collapsed]/sidebar-wrapper:px-2 group-data-[sidebar-mode=mobile-closed]/sidebar-wrapper:px-2'>
						<SidebarMenu>
							{footerItems.map((item) => (
								<SidebarMenuItem key={item.key}>
									<SidebarRouteMenuItem
										badge={item.badge}
										icon={item.icon}
										label={item.label}
										to={item.to}
									/>
								</SidebarMenuItem>
							))}
						</SidebarMenu>
					</SidebarFooter>
					<SidebarRail />
				</Sidebar>
			</ContextMenuTrigger>

			<ContextMenuContent className='w-52'>
				<ContextMenuGroup>
					<SidebarCustomizeMenu
						navItems={mainNavItems}
						onResetMainItemsVisibility={onResetMainItemsVisibility}
						onUpdateItemVisibility={onUpdateItemVisibility}
						visibleNavItemCount={visibleNavItemCount}
					/>
				</ContextMenuGroup>
			</ContextMenuContent>
		</ContextMenu>
	)
}

type ProjectSidebarMenuItemProps = {
	currentSpaceId: string
	project: ShellProjectLink
	projectTreeCollapsed: Record<string, boolean>
	onOpenProjectCreateDialog: (parentProjectId?: string | null) => void
	onToggleProjectCollapsed: (payload: {
		spaceId: string
		projectId: string
		collapsed: boolean
	}) => void
}

function ProjectSidebarMenuItem({
	currentSpaceId,
	project,
	projectTreeCollapsed,
	onOpenProjectCreateDialog,
	onToggleProjectCollapsed,
}: ProjectSidebarMenuItemProps) {
	const projectPath = `/space/${currentSpaceId}/project/${project.id}`
	const hasChildren = !!project.children?.length
	const isCollapsed = projectTreeCollapsed[toProjectTreeKey(currentSpaceId, project.id)] ?? true
	const isOpen = hasChildren ? !isCollapsed : false

	return (
		<Collapsible
			asChild
			onOpenChange={(nextOpen) => {
				if (!hasChildren) {
					return
				}
				onToggleProjectCollapsed({
					spaceId: currentSpaceId,
					projectId: project.id,
					collapsed: !nextOpen,
				})
			}}
			open={hasChildren ? isOpen : undefined}
		>
			<SidebarMenuItem className='flex flex-col gap-0.5'>
				<div className='flex items-center gap-1'>
					<div className='min-w-0 flex-1'>
						<ProjectSidebarRouteMenuItem
							label={project.label}
							onCreateChildProject={() => onOpenProjectCreateDialog(project.id)}
							onOpenProject={() => undefined}
							to={projectPath}
						/>
					</div>

					{hasChildren ? (
						<CollapsibleTrigger asChild>
							<Button
								aria-label={isOpen ? '收起子项目' : '展开子项目'}
								className='shrink-0 hover:bg-(--sf-color-shell-hover) aria-expanded:bg-(--sf-color-shell-hover-strong)'
								onClick={(event) => event.stopPropagation()}
								size='icon'
								variant='ghost'
							>
								<ChevronRightIcon
									className={cn(
										'size-3.5 text-(--sf-color-icon-subtle) transition-transform',
										isOpen ? 'rotate-90' : undefined,
									)}
								/>
							</Button>
						</CollapsibleTrigger>
					) : null}
				</div>

				{hasChildren ? (
					<CollapsibleContent>
						<SidebarMenuSub>
							{project.children?.map((childProject) => (
								<SidebarMenuSubItem key={childProject.id}>
									<ProjectSidebarSubRouteMenuItem
										label={childProject.label}
										onCreateChildProject={() => onOpenProjectCreateDialog(childProject.id)}
										onOpenProject={() => undefined}
										to={`/space/${currentSpaceId}/project/${childProject.id}`}
									/>
								</SidebarMenuSubItem>
							))}
						</SidebarMenuSub>
					</CollapsibleContent>
				) : null}
			</SidebarMenuItem>
		</Collapsible>
	)
}

type SidebarCustomizeMenuProps = {
	navItems: MainNavItemViewModel[]
	visibleNavItemCount: number
	onUpdateItemVisibility: (target: SidebarItemVisibilityTarget, visible: boolean) => void
	onResetMainItemsVisibility: () => void
}

function SidebarCustomizeMenu({
	navItems,
	visibleNavItemCount,
	onUpdateItemVisibility,
	onResetMainItemsVisibility,
}: SidebarCustomizeMenuProps) {
	return (
		<ContextMenuSub>
			<ContextMenuSubTrigger>
				<PanelLeftIcon />
				自定义侧边栏
			</ContextMenuSubTrigger>
			<ContextMenuSubContent className='w-52'>
				<ContextMenuLabel>显示入口</ContextMenuLabel>
				<ContextMenuGroup>
					{navItems.map((item) => {
						const isLastVisibleItem = item.visible && visibleNavItemCount === 1

						return (
							<ContextMenuCheckboxItem
								checked={item.visible}
								disabled={isLastVisibleItem}
								key={item.key}
								onCheckedChange={(checked) =>
									onUpdateItemVisibility({ kind: 'main', key: item.key }, checked === true)
								}
							>
								{item.label}
							</ContextMenuCheckboxItem>
						)
					})}
				</ContextMenuGroup>
				<ContextMenuSeparator />
				<ContextMenuGroup>
					<ContextMenuItem
						disabled={navItems.every((item) => item.visible)}
						onSelect={onResetMainItemsVisibility}
					>
						<RotateCcwIcon />
						恢复默认侧栏
					</ContextMenuItem>
				</ContextMenuGroup>
			</ContextMenuSubContent>
		</ContextMenuSub>
	)
}

type SidebarNavMenuItemProps = SidebarRouteItem & {
	itemKey: SidebarMainItemKey
	navItems: MainNavItemViewModel[]
	visibleNavItemCount: number
	onUpdateItemVisibility: (target: SidebarItemVisibilityTarget, visible: boolean) => void
	onResetMainItemsVisibility: () => void
}

function SidebarNavMenuItem({
	itemKey,
	label,
	icon: Icon,
	to,
	badge,
	navItems,
	visibleNavItemCount,
	onUpdateItemVisibility,
	onResetMainItemsVisibility,
}: SidebarNavMenuItemProps) {
	const currentItem = navItems.find((item) => item.key === itemKey)
	const isActive = !!useMatch({ end: true, path: to })

	return (
		<SidebarMenuItem>
			<ContextMenu>
				<ContextMenuTrigger asChild onContextMenu={(event) => event.stopPropagation()}>
					<SidebarMenuButton asChild isActive={isActive} tooltip={label}>
						<NavLink to={to}>
							<Icon className='size-3.5 shrink-0' />
							<span className='min-w-0 truncate'>{label}</span>
							{badge ? <SidebarMenuBadge>{badge}</SidebarMenuBadge> : null}
						</NavLink>
					</SidebarMenuButton>
				</ContextMenuTrigger>
				<ContextMenuContent className='w-52'>
					<ContextMenuGroup>
						<SidebarCustomizeMenu
							navItems={navItems}
							onResetMainItemsVisibility={onResetMainItemsVisibility}
							onUpdateItemVisibility={onUpdateItemVisibility}
							visibleNavItemCount={visibleNavItemCount}
						/>
					</ContextMenuGroup>
					{currentItem ? (
						<>
							<ContextMenuSeparator />
							<ContextMenuGroup>
								<ContextMenuCheckboxItem
									checked={currentItem.visible}
									disabled={visibleNavItemCount === 1 && currentItem.visible}
									onCheckedChange={(checked) =>
										onUpdateItemVisibility({ kind: 'main', key: currentItem.key }, checked === true)
									}
								>
									显示当前入口
								</ContextMenuCheckboxItem>
							</ContextMenuGroup>
						</>
					) : null}
				</ContextMenuContent>
			</ContextMenu>
		</SidebarMenuItem>
	)
}

function SidebarRouteMenuItem({
	label,
	icon: Icon,
	to,
	badge,
	size = 'default',
}: SidebarRouteItem) {
	const isActive = !!useMatch({ end: true, path: to })

	return (
		<SidebarMenuButton asChild isActive={isActive} size={size} tooltip={label}>
			<NavLink to={to}>
				<Icon className='size-3.5 shrink-0' />
				<span className='min-w-0 truncate'>{label}</span>
				{badge ? <SidebarMenuBadge>{badge}</SidebarMenuBadge> : null}
			</NavLink>
		</SidebarMenuButton>
	)
}

type ProjectSidebarRouteMenuItemProps = {
	to: string
	label: string
	size?: 'default' | 'sm'
	onOpenProject: () => void
	onCreateChildProject: () => void
}

function ProjectSidebarRouteMenuItem({
	to,
	label,
	size = 'default',
	onOpenProject,
	onCreateChildProject,
}: ProjectSidebarRouteMenuItemProps) {
	const isActive = !!useMatch({ end: true, path: to })

	return (
		<ContextMenu>
			<ContextMenuTrigger asChild onContextMenu={(event) => event.stopPropagation()}>
				<SidebarMenuButton asChild isActive={isActive} size={size}>
					<NavLink to={to}>
						<FolderIcon
							className={cn(
								'shrink-0 text-(--sf-color-shell-secondary)',
								size === 'sm' ? 'size-3' : 'size-3.5',
							)}
						/>
						<span className='min-w-0 truncate'>{label}</span>
					</NavLink>
				</SidebarMenuButton>
			</ContextMenuTrigger>
			<ContextMenuContent className='w-44'>
				<ContextMenuGroup>
					<ContextMenuItem onSelect={onOpenProject}>
						<ExternalLinkIcon />
						打开项目
					</ContextMenuItem>
					<ContextMenuItem onSelect={onCreateChildProject}>
						<FolderPlusIcon />
						新建子项目
					</ContextMenuItem>
				</ContextMenuGroup>
				<ContextMenuSeparator />
				<ContextMenuGroup>
					<ContextMenuItem disabled variant='destructive'>
						<Trash2Icon />
						移入回收站
					</ContextMenuItem>
				</ContextMenuGroup>
			</ContextMenuContent>
		</ContextMenu>
	)
}

function ProjectSidebarSubRouteMenuItem(props: ProjectSidebarRouteMenuItemProps) {
	const { to, label, onOpenProject, onCreateChildProject } = props
	const isActive = !!useMatch({ end: true, path: to })

	return (
		<ContextMenu>
			<ContextMenuTrigger asChild onContextMenu={(event) => event.stopPropagation()}>
				<SidebarMenuSubButton asChild isActive={isActive}>
					<NavLink to={to}>
						<FolderIcon className='shrink-0 text-(--sf-color-shell-secondary)' />
						<span className='min-w-0 truncate'>{label}</span>
					</NavLink>
				</SidebarMenuSubButton>
			</ContextMenuTrigger>
			<ContextMenuContent className='w-44'>
				<ContextMenuGroup>
					<ContextMenuItem onSelect={onOpenProject}>
						<ExternalLinkIcon />
						打开项目
					</ContextMenuItem>
					<ContextMenuItem onSelect={onCreateChildProject}>
						<FolderPlusIcon />
						新建子项目
					</ContextMenuItem>
				</ContextMenuGroup>
				<ContextMenuSeparator />
				<ContextMenuGroup>
					<ContextMenuItem disabled variant='destructive'>
						<Trash2Icon />
						移入回收站
					</ContextMenuItem>
				</ContextMenuGroup>
			</ContextMenuContent>
		</ContextMenu>
	)
}

function SpaceIconBadge({ space }: { space: (typeof SHELL_SPACES)[number] }) {
	const SpaceIcon = space.icon

	return (
		<span
			className={cn(
				'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white shadow-(--sf-shadow-panel)',
				space.iconBadgeClassName,
			)}
			data-sidebar-keep='true'
			data-space-icon-badge='true'
		>
			<SpaceIcon className='size-4 text-white' />
		</span>
	)
}

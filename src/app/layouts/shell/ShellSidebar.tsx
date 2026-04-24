import { useState, type ComponentType } from 'react'
import { NavLink, useMatch, useNavigate } from 'react-router-dom'

import {
	SHELL_FOOTER_ITEMS,
	SHELL_NAV_ITEMS,
	SHELL_SPACES,
	type ShellProjectLink,
} from '@/app/layouts/shell/config'
import {
	selectHiddenNavItemKeys,
	selectProjectTreeCollapsed,
	toProjectTreeKey,
	useShellLayoutStore,
} from '@/app/layouts/shell/model/useShellLayoutStore'
import type { ShellNavBadges } from '@/app/layouts/shell/model/useShellNavBadges'
import type { ShellSectionKey } from '@/app/layouts/shell/types'
import { deleteProjectToTrash } from '@/features/trash/api/deleteProjectToTrash'
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
	useSidebar,
} from '@/shared/ui/base/sidebar'
import { StatusNotice } from '@/shared/ui/StatusNotice'
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

type ShellSidebarProps = {
	currentSpaceId: string
	projects: ShellProjectLink[]
	isProjectsLoading: boolean
	projectsError: string | null
	navBadges?: ShellNavBadges
	onOpenTaskCreateDialog: () => void
	onOpenProjectCreateDialog: (parentProjectId?: string | null) => void
	onRefreshProjects?: () => void
}

const SIDEBAR_ENTITY_SELECTOR = [
	'a[href]',
	'button',
	'[data-slot="dropdown-menu-trigger"]',
	'[data-slot="dropdown-menu-content"]',
	'[data-slot="context-menu-content"]',
].join(', ')

type SidebarRouteItem = {
	label: string
	icon: ComponentType<{ className?: string }>
	to: string
	badge?: string
	size?: 'default' | 'sm'
}

export function ShellSidebar({
	currentSpaceId,
	projects,
	isProjectsLoading,
	projectsError,
	navBadges = {},
	onOpenProjectCreateDialog,
	onRefreshProjects = () => undefined,
}: ShellSidebarProps) {
	const navigate = useNavigate()
	const { isMobile } = useSidebar()
	const activeSpace = SHELL_SPACES.find((space) => space.id === currentSpaceId) ?? SHELL_SPACES[0]
	const hiddenNavItemKeys = useShellLayoutStore(selectHiddenNavItemKeys)
	const projectTreeCollapsed = useShellLayoutStore(selectProjectTreeCollapsed)
	const setNavItemVisible = useShellLayoutStore((state) => state.setNavItemVisible)
	const resetNavItemVisibility = useShellLayoutStore((state) => state.resetNavItemVisibility)
	const bumpProjectDataVersion = useShellLayoutStore((state) => state.bumpProjectDataVersion)
	const setProjectTreeCollapsed = useShellLayoutStore((state) => state.setProjectTreeCollapsed)
	const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null)
	const visibleNavItems = SHELL_NAV_ITEMS.filter((item) => !hiddenNavItemKeys.includes(item.key))
	const visibleNavItemCount = visibleNavItems.length
	const footerItems = SHELL_FOOTER_ITEMS.map((item) => ({
		...item,
		badge: navBadges[item.key],
		to: item.to(currentSpaceId),
	}))

	const handleDeleteProject = async (projectId: string) => {
		setDeletingProjectId(projectId)

		try {
			await deleteProjectToTrash({
				spaceSlug: currentSpaceId,
				projectId,
			})
			bumpProjectDataVersion()
			onRefreshProjects()
		} catch (error) {
			console.error('项目右键菜单删除失败', { error })
		} finally {
			setDeletingProjectId(null)
		}
	}

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
					<SidebarHeader className='px-3 pb-4 pt-2 group-data-[sidebar-mode=desktop-collapsed]/sidebar-wrapper:px-2'>
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
												<ChevronsUpDownIcon className='shrink-0 text-(--sf-color-icon-subtle) group-data-[sidebar-mode=desktop-collapsed]/sidebar-wrapper:hidden' />
											</SidebarMenuButton>
										</DropdownMenuTrigger>
										<DropdownMenuContent
											align='start'
											className=''
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
												<DropdownMenuItem
													className='gap-2 p-2'
													onSelect={(event) => {
														event.preventDefault()
													}}
												>
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
											badge={navBadges[item.key]}
											hiddenNavItemKeys={hiddenNavItemKeys}
											icon={item.icon}
											itemKey={item.key}
											key={item.key}
											label={item.label}
											onResetNavItemVisibility={resetNavItemVisibility}
											onSetNavItemVisible={setNavItemVisible}
											to={item.to(currentSpaceId)}
											visibleNavItemCount={visibleNavItemCount}
										/>
									))}
								</SidebarMenu>
							</SidebarGroupContent>
						</SidebarGroup>

						<SidebarGroup className='group-data-[sidebar-mode=desktop-collapsed]/sidebar-wrapper:hidden'>
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

							<SidebarGroupContent>
								{isProjectsLoading ? (
									<StatusNotice className='text-[12px]' size='sm'>
										正在加载项目...
									</StatusNotice>
								) : projectsError ? (
									<StatusNotice
										actions={
											<Button
												className='h-7 rounded-md px-2 text-[12px]'
												onClick={onRefreshProjects}
												size='sm'
												variant='outline'
											>
												重试加载
											</Button>
										}
										className='text-[12px]'
										size='sm'
										variant='danger'
									>
										<p className='leading-5'>{projectsError}</p>
									</StatusNotice>
								) : projects.length === 0 ? (
									<StatusNotice
										actions={
											<Button
												className='w-full justify-center rounded-md'
												onClick={() => onOpenProjectCreateDialog()}
												size='sm'
											>
												创建第一个项目
											</Button>
										}
										className='text-[12px]'
										layout='stack'
										size='sm'
										title='当前 Space 还没有项目'
									/>
								) : (
									<SidebarMenu>
										{projects.map((project) => (
											<ProjectSidebarMenuItem
												currentSpaceId={currentSpaceId}
												deletingProjectId={deletingProjectId}
												key={project.id}
												onMoveProjectToTrash={(projectId) => void handleDeleteProject(projectId)}
												onNavigateToProject={(projectId) =>
													navigate(`/space/${currentSpaceId}/project/${projectId}`)
												}
												onOpenProjectCreateDialog={onOpenProjectCreateDialog}
												onToggleProjectCollapsed={(payload) => setProjectTreeCollapsed(payload)}
												projectTreeCollapsed={projectTreeCollapsed}
												project={project}
											/>
										))}
									</SidebarMenu>
								)}
							</SidebarGroupContent>
						</SidebarGroup>
					</SidebarContent>

					<SidebarFooter className='border-t border-(--sf-color-divider) px-3 py-3 group-data-[sidebar-mode=desktop-collapsed]/sidebar-wrapper:px-2'>
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
						hiddenNavItemKeys={hiddenNavItemKeys}
						onResetNavItemVisibility={resetNavItemVisibility}
						onSetNavItemVisible={setNavItemVisible}
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
	deletingProjectId: string | null
	projectTreeCollapsed: Record<string, boolean>
	onOpenProjectCreateDialog: (parentProjectId?: string | null) => void
	onNavigateToProject: (projectId: string) => void
	onMoveProjectToTrash: (projectId: string) => void
	onToggleProjectCollapsed: (payload: {
		spaceId: string
		projectId: string
		collapsed: boolean
	}) => void
}

function ProjectSidebarMenuItem({
	currentSpaceId,
	project,
	deletingProjectId,
	projectTreeCollapsed,
	onOpenProjectCreateDialog,
	onNavigateToProject,
	onMoveProjectToTrash,
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
							isBusy={deletingProjectId === project.id}
							label={project.label}
							onCreateChildProject={() => onOpenProjectCreateDialog(project.id)}
							onMoveToTrash={() => onMoveProjectToTrash(project.id)}
							onOpenProject={() => onNavigateToProject(project.id)}
							to={projectPath}
						/>
					</div>

					{hasChildren ? (
						<CollapsibleTrigger asChild>
							<Button
								aria-label={isOpen ? '收起子项目' : '展开子项目'}
								className='h-8 w-8 shrink-0 rounded-md px-0 hover:bg-(--sf-color-shell-hover) aria-expanded:bg-(--sf-color-shell-hover-strong)'
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
										isBusy={deletingProjectId === childProject.id}
										label={childProject.label}
										onCreateChildProject={() => onOpenProjectCreateDialog(childProject.id)}
										onMoveToTrash={() => onMoveProjectToTrash(childProject.id)}
										onOpenProject={() => onNavigateToProject(childProject.id)}
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
	hiddenNavItemKeys: ShellSectionKey[]
	visibleNavItemCount: number
	onSetNavItemVisible: (section: ShellSectionKey, visible: boolean) => void
	onResetNavItemVisibility: () => void
}

function SidebarCustomizeMenu({
	hiddenNavItemKeys,
	visibleNavItemCount,
	onSetNavItemVisible,
	onResetNavItemVisibility,
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
					{SHELL_NAV_ITEMS.map((item) => {
						const isVisible = !hiddenNavItemKeys.includes(item.key)
						const isLastVisibleItem = isVisible && visibleNavItemCount === 1

						return (
							<ContextMenuCheckboxItem
								checked={isVisible}
								disabled={isLastVisibleItem}
								key={item.key}
								onCheckedChange={(checked) => onSetNavItemVisible(item.key, checked === true)}
							>
								{item.label}
							</ContextMenuCheckboxItem>
						)
					})}
				</ContextMenuGroup>
				<ContextMenuSeparator />
				<ContextMenuGroup>
					<ContextMenuItem disabled={!hiddenNavItemKeys.length} onSelect={onResetNavItemVisibility}>
						<RotateCcwIcon />
						恢复默认侧栏
					</ContextMenuItem>
				</ContextMenuGroup>
			</ContextMenuSubContent>
		</ContextMenuSub>
	)
}

type ShellNavContextMenuProps = {
	itemKey: ShellSectionKey
	hiddenNavItemKeys: ShellSectionKey[]
	visibleNavItemCount: number
	onSetNavItemVisible: (section: ShellSectionKey, visible: boolean) => void
	onResetNavItemVisibility: () => void
}

type SidebarNavMenuItemProps = ShellNavContextMenuProps &
	SidebarRouteItem & {
		badge?: string
	}

function SidebarNavMenuItem({
	itemKey,
	label,
	icon: Icon,
	to,
	badge,
	hiddenNavItemKeys,
	visibleNavItemCount,
	onSetNavItemVisible,
	onResetNavItemVisibility,
}: SidebarNavMenuItemProps) {
	const currentItem = SHELL_NAV_ITEMS.find((item) => item.key === itemKey)
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
							hiddenNavItemKeys={hiddenNavItemKeys}
							onResetNavItemVisibility={onResetNavItemVisibility}
							onSetNavItemVisible={onSetNavItemVisible}
							visibleNavItemCount={visibleNavItemCount}
						/>
					</ContextMenuGroup>
					{currentItem ? (
						<>
							<ContextMenuSeparator />
							<ContextMenuGroup>
								<ContextMenuCheckboxItem
									checked={!hiddenNavItemKeys.includes(currentItem.key)}
									disabled={
										visibleNavItemCount === 1 && !hiddenNavItemKeys.includes(currentItem.key)
									}
									onCheckedChange={(checked) =>
										onSetNavItemVisible(currentItem.key, checked === true)
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
	isBusy?: boolean
	onOpenProject: () => void
	onCreateChildProject: () => void
	onMoveToTrash: () => void
}

function ProjectSidebarRouteMenuItem({
	to,
	label,
	size = 'default',
	isBusy,
	onOpenProject,
	onCreateChildProject,
	onMoveToTrash,
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
					<ContextMenuItem disabled={isBusy} onSelect={onMoveToTrash} variant='destructive'>
						<Trash2Icon />
						移入回收站
					</ContextMenuItem>
				</ContextMenuGroup>
			</ContextMenuContent>
		</ContextMenu>
	)
}

function ProjectSidebarSubRouteMenuItem(props: ProjectSidebarRouteMenuItemProps) {
	const { to, label, isBusy, onOpenProject, onCreateChildProject, onMoveToTrash } = props
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
					<ContextMenuItem disabled={isBusy} onSelect={onMoveToTrash} variant='destructive'>
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

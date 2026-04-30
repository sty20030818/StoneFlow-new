import { useMemo, useState, type ComponentType } from 'react'
import { NavLink, useMatch, useNavigate } from 'react-router-dom'

import {
	buildScopedProjectPath,
	SHELL_FOOTER_ITEMS,
	SHELL_NAV_ITEMS,
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
import { getSpaceVisual } from '@/features/space/model/spaceVisuals'
import { SpaceEditorDialog } from '@/features/space/ui/SpaceEditorDialog'
import type { Scope, Space } from '@/shared/types'
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
	currentScope: Scope
	currentSpaceId: string | null
	spaces: Space[]
	projects: ShellProjectLink[]
	settings: SidebarSettings
	navBadges?: ShellNavBadges
	onCreateSpace: (input: { name: string; iconKey: string; colorKey: string }) => Promise<Space>
	onUpdateSpace: (input: {
		spaceId: string
		name?: string
		iconKey?: string
		colorKey?: string
	}) => Promise<Space>
	onSetDefaultSpace: (spaceId: string) => Promise<Space>
	onArchiveSpace: (spaceId: string) => Promise<Space>
	onDeleteSpace: (spaceId: string) => Promise<Space>
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
	currentScope,
	currentSpaceId,
	spaces,
	projects,
	settings,
	navBadges = {},
	onCreateSpace,
	onUpdateSpace,
	onSetDefaultSpace,
	onArchiveSpace,
	onDeleteSpace,
	onOpenProjectCreateDialog,
	onUpdateItemVisibility,
	onResetMainItemsVisibility,
}: ShellSidebarProps) {
	const navigate = useNavigate()
	const { isMobile } = useSidebar()
	const projectTreeCollapsed = useShellPreferenceStore(selectProjectTreeCollapsed)
	const setProjectTreeCollapsed = useShellPreferenceStore((state) => state.setProjectTreeCollapsed)
	const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create')
	const [editorOpen, setEditorOpen] = useState(false)
	const [dropdownError, setDropdownError] = useState<string | null>(null)
	const fallbackSpaceId = currentSpaceId ?? spaces.find((space) => space.isDefault)?.id ?? spaces[0]?.id ?? null
	const activeSpace =
		(currentScope.type === 'space'
			? spaces.find((space) => space.id === currentScope.spaceId)
			: spaces.find((space) => space.id === fallbackSpaceId)) ?? spaces[0] ?? null
	const canArchiveOrDeleteActiveSpace = !activeSpace?.isDefault
	const scopedProjectLinks = currentScope.type === 'all' ? [] : projects
	const currentScopeLabel = currentScope.type === 'all' ? '全部 Spaces' : activeSpace?.name ?? '未选择 Space'

	const mainNavItems = SHELL_NAV_ITEMS.map((item) => ({
		...item,
		badge: navBadges[item.section],
		to: item.to(currentScope, currentSpaceId),
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
			to: item.to(currentScope, currentSpaceId),
			visible: settings.footerItems[item.key].visible,
			order: settings.footerItems[item.key].order,
		}))
		.filter((item) => item.visible)
		.sort((left, right) => left.order - right.order)
	const projectLinks = settings.projectSection.maxVisible
		? scopedProjectLinks.slice(0, settings.projectSection.maxVisible)
		: scopedProjectLinks

	const activeSpaceVisual = useMemo(
		() => (activeSpace ? getSpaceVisual(activeSpace) : null),
		[activeSpace],
	)

	async function runSpaceMutation(task: () => Promise<void>) {
		try {
			setDropdownError(null)
			await task()
		} catch (error) {
			setDropdownError(error instanceof Error ? error.message : 'Space 操作失败')
		}
	}

	async function handleSpaceEditorSubmit(input: {
		name: string
		iconKey: string
		colorKey: string
	}) {
		if (editorMode === 'create') {
			const createdSpace = await onCreateSpace(input)
			navigate(`/space/${createdSpace.id}/inbox`)
			return
		}

		if (!activeSpace) {
			throw new Error('当前没有可编辑的 Space')
		}

		await onUpdateSpace({
			spaceId: activeSpace.id,
			...input,
		})
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
					<SidebarHeader className='px-3 pb-4 pt-2 group-data-[sidebar-mode=desktop-collapsed]/sidebar-wrapper:px-2 group-data-[sidebar-mode=mobile-closed]/sidebar-wrapper:px-2'>
						<div className='flex items-center gap-1.5'>
							<SidebarMenu className='flex-1'>
								<SidebarMenuItem>
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<SidebarMenuButton
												aria-label='切换 Space'
												size='lg'
												tooltip={currentScopeLabel}
											>
												{activeSpaceVisual ? <SpaceIconBadge visual={activeSpaceVisual} /> : null}
												<span className='min-w-0 flex-1 truncate text-left font-semibold'>
													{currentScopeLabel}
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
													<DropdownMenuItem
														className='gap-2 p-2'
														onSelect={() => navigate('/spaces/inbox')}
													>
														<span className='text-(--sf-color-shell-secondary)'>全部 Spaces</span>
														{currentScope.type === 'all' ? (
															<CheckIcon className='ml-auto size-3.5 text-(--sf-color-icon-secondary)' />
														) : null}
													</DropdownMenuItem>
													{spaces.map((space) => {
														const isActive = currentScope.type === 'space' && space.id === currentScope.spaceId
														const visual = getSpaceVisual(space)
														const SpaceIcon = visual.icon

														return (
															<DropdownMenuItem
																className='gap-2 p-2'
																key={space.id}
																onSelect={() => {
																	navigate(`/space/${space.id}/inbox`)
																}}
															>
																<SpaceIcon className={cn('shrink-0', visual.iconClassName)} />
																<div className='flex min-w-0 items-center gap-2'>
																	<span className='truncate'>{space.name}</span>
																	{space.isDefault ? (
																		<span className='rounded-sm bg-muted px-1.5 py-0.5 text-[10px] text-(--sf-color-shell-secondary)'>
																			默认
																		</span>
																	) : null}
																</div>
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
														onSelect={() => {
															setEditorMode('create')
															setEditorOpen(true)
														}}
													>
														<PlusIcon className='shrink-0 text-(--sf-color-icon-secondary)' />
														<span>新建 Space</span>
													</DropdownMenuItem>
													<DropdownMenuItem
														className='gap-2 p-2'
														disabled={!activeSpace}
														onSelect={() => {
															setEditorMode('edit')
															setEditorOpen(true)
														}}
													>
														<FolderIcon className='shrink-0 text-(--sf-color-icon-secondary)' />
														<span>编辑当前 Space</span>
													</DropdownMenuItem>
													<DropdownMenuItem
														className='gap-2 p-2'
														disabled={!activeSpace || activeSpace.isDefault}
														onSelect={() => {
															if (!activeSpace) {
																return
															}
															void runSpaceMutation(async () => {
																await onSetDefaultSpace(activeSpace.id)
															})
														}}
													>
														<CheckIcon className='shrink-0 text-(--sf-color-icon-secondary)' />
														<span>设为默认 Space</span>
													</DropdownMenuItem>
													<DropdownMenuItem
														className='gap-2 p-2'
														disabled={!activeSpace || !canArchiveOrDeleteActiveSpace}
														onSelect={() => {
															if (!activeSpace) {
																return
															}
															if (!window.confirm(`确认归档「${activeSpace.name}」吗？`)) {
																return
															}
															void runSpaceMutation(async () => {
																await onArchiveSpace(activeSpace.id)
																if (currentScope.type === 'space') {
																	navigate('/spaces/inbox')
																}
															})
														}}
													>
														<ExternalLinkIcon className='shrink-0 text-(--sf-color-icon-secondary)' />
														<span>归档当前 Space</span>
													</DropdownMenuItem>
													<DropdownMenuItem
														className='gap-2 p-2 text-[#d9485f]'
														disabled={!activeSpace || !canArchiveOrDeleteActiveSpace}
														onSelect={() => {
															if (!activeSpace) {
																return
															}
															if (!window.confirm(`确认删除「${activeSpace.name}」吗？`)) {
																return
															}
															void runSpaceMutation(async () => {
																await onDeleteSpace(activeSpace.id)
																if (currentScope.type === 'space') {
																	navigate('/spaces/inbox')
																}
															})
														}}
													>
														<Trash2Icon className='shrink-0' />
														<span>删除当前 Space</span>
													</DropdownMenuItem>
												</DropdownMenuGroup>
												{dropdownError ? (
													<>
														<DropdownMenuSeparator />
														<DropdownMenuLabel className='max-w-64 whitespace-normal text-[#d9485f]'>
															{dropdownError}
														</DropdownMenuLabel>
													</>
												) : null}
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
										{currentScope.type === 'all' ? (
											<div className='px-2.5 py-2 text-[12px] leading-5 text-(--sf-color-shell-tertiary)'>
												全局 Scope 下先不展开具体项目，切到单个 Space 后再查看项目列表。
											</div>
										) : (
											<SidebarMenu>
												{projectLinks.map((project) => (
													<ProjectSidebarMenuItem
														currentScope={currentScope}
														currentSpaceId={currentSpaceId}
														key={project.id}
														onOpenProjectCreateDialog={onOpenProjectCreateDialog}
														onToggleProjectCollapsed={(payload) => setProjectTreeCollapsed(payload)}
														project={project}
														projectTreeCollapsed={projectTreeCollapsed}
													/>
												))}
											</SidebarMenu>
										)}
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

			<SpaceEditorDialog
				mode={editorMode}
				onClose={() => setEditorOpen(false)}
				onSubmit={handleSpaceEditorSubmit}
				open={editorOpen}
				space={editorMode === 'edit' ? activeSpace : null}
			/>
		</ContextMenu>
	)
}

type ProjectSidebarMenuItemProps = {
	currentScope: Scope
	currentSpaceId: string | null
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
	currentScope,
	currentSpaceId,
	project,
	projectTreeCollapsed,
	onOpenProjectCreateDialog,
	onToggleProjectCollapsed,
}: ProjectSidebarMenuItemProps) {
	const resolvedSpaceId =
		currentScope.type === 'space' ? currentScope.spaceId : currentSpaceId

	if (!resolvedSpaceId) {
		return null
	}

	const projectPath = buildScopedProjectPath(currentScope, project.id, resolvedSpaceId)
	const hasChildren = !!project.children?.length
	const isCollapsed = projectTreeCollapsed[toProjectTreeKey(resolvedSpaceId, project.id)] ?? true
	const isOpen = hasChildren ? !isCollapsed : false

	return (
		<Collapsible
			asChild
			onOpenChange={(nextOpen) => {
				if (!hasChildren) {
					return
				}
				onToggleProjectCollapsed({
					spaceId: resolvedSpaceId,
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
										to={buildScopedProjectPath(currentScope, childProject.id, resolvedSpaceId)}
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

function SpaceIconBadge({
	visual,
}: {
	visual: ReturnType<typeof getSpaceVisual>
}) {
	const SpaceIcon = visual.icon

	return (
		<span
			className={cn(
				'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white shadow-(--sf-shadow-panel)',
				visual.iconBadgeClassName,
			)}
			data-sidebar-keep='true'
			data-space-icon-badge='true'
		>
			<SpaceIcon className='size-4 text-white' />
		</span>
	)
}

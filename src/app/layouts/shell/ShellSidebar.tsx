import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import {
	SHELL_FOOTER_ITEMS,
	SHELL_NAV_ITEMS,
	SHELL_SETTINGS_ITEM,
	type ShellProjectLink,
} from '@/app/layouts/shell/config'
import {
	SIDEBAR_ENTITY_SELECTOR,
	MainNavSidebarMenuItem,
	NoProjectNavMenuItem,
	ProjectNavMenuItem,
	SidebarCustomizeSubmenu,
	SidebarNavRow,
	SpaceIconBadge,
	type MainNavItemViewModel,
} from '@/app/layouts/shell/sidebar'
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
	ContextMenuContent,
	ContextMenuGroup,
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
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarRail,
} from '@/shared/ui/base/sidebar'
import { useSidebar } from '@/shared/ui/base/sidebar-context'
import {
	sidebarDropdownItemClass,
	sidebarFooterContainerClass,
	sidebarHelperTextClass,
	sidebarSecondaryTextClass,
	sidebarSectionHeaderRowClass,
	sidebarInlineBadgeClass,
} from '@/shared/ui/patterns/sidebar-item'
import {
	shellChromeIconSecondaryClass,
	shellChromeIconSubtleClass,
	shellChromeInlineGroupClass,
} from '@/shared/ui/patterns/shell-chrome'
import { CheckIcon, ChevronsUpDownIcon, ExternalLinkIcon, FolderIcon, PlusIcon, Trash2Icon } from 'lucide-react'

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
	onOpenProjectCreateDialog: () => void
	onUpdateItemVisibility: (target: SidebarItemVisibilityTarget, visible: boolean) => void
	onResetMainItemsVisibility: () => void
}

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
	const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create')
	const [editorOpen, setEditorOpen] = useState(false)
	const [dropdownError, setDropdownError] = useState<string | null>(null)
	const fallbackSpaceId =
		currentSpaceId ?? spaces.find((space) => space.isDefault)?.id ?? spaces[0]?.id ?? null
	const activeSpace =
		(currentScope.type === 'space'
			? spaces.find((space) => space.id === currentScope.spaceId)
			: spaces.find((space) => space.id === fallbackSpaceId)) ??
		spaces[0] ??
		null
	const canArchiveOrDeleteActiveSpace = !activeSpace?.isDefault
	const scopedProjectLinks = currentScope.type === 'all' ? [] : projects
	const currentScopeLabel =
		currentScope.type === 'all' ? '全部 Spaces' : (activeSpace?.name ?? '未选择 Space')

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
	const settingsItem = {
		...SHELL_SETTINGS_ITEM,
		to: SHELL_SETTINGS_ITEM.to(currentScope, currentSpaceId),
	}
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
						<div className={shellChromeInlineGroupClass}>
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
												<ChevronsUpDownIcon
													className={`${shellChromeIconSubtleClass} group-data-[sidebar-mode=desktop-collapsed]/sidebar-wrapper:hidden group-data-[sidebar-mode=mobile-closed]/sidebar-wrapper:hidden`}
												/>
											</SidebarMenuButton>
										</DropdownMenuTrigger>
										<DropdownMenuContent
											align='start'
											side={isMobile ? 'bottom' : 'right'}
											sideOffset={6}
										>
											<DropdownMenuLabel>空间</DropdownMenuLabel>
											<DropdownMenuGroup>
												<DropdownMenuItem
													className={sidebarDropdownItemClass}
													onSelect={() => navigate('/spaces/inbox')}
												>
													<span className={sidebarSecondaryTextClass}>全部 Spaces</span>
													{currentScope.type === 'all' ? (
														<CheckIcon
															className={`ml-auto size-3.5 ${shellChromeIconSecondaryClass}`}
														/>
													) : null}
												</DropdownMenuItem>
												{spaces.map((space) => {
													const isActive =
														currentScope.type === 'space' && space.id === currentScope.spaceId
													const visual = getSpaceVisual(space)
													const SpaceIcon = visual.icon

													return (
														<DropdownMenuItem
															className={sidebarDropdownItemClass}
															key={space.id}
															onSelect={() => {
																navigate(`/space/${space.id}/inbox`)
															}}
														>
															<SpaceIcon className={cn('shrink-0', visual.iconClassName)} />
															<div className='flex min-w-0 items-center gap-2'>
																<span className='truncate'>{space.name}</span>
																{space.isDefault ? (
																	<span className={sidebarInlineBadgeClass}>默认</span>
																) : null}
															</div>
															{isActive ? (
																<CheckIcon
																	className={`ml-auto size-3.5 ${shellChromeIconSecondaryClass}`}
																/>
															) : null}
														</DropdownMenuItem>
													)
												})}
											</DropdownMenuGroup>
											<DropdownMenuSeparator />
											<DropdownMenuGroup>
												<DropdownMenuItem
													className={sidebarDropdownItemClass}
													onSelect={() => {
														setEditorMode('create')
														setEditorOpen(true)
													}}
												>
													<PlusIcon className={shellChromeIconSecondaryClass} />
													<span>新建 Space</span>
												</DropdownMenuItem>
												<DropdownMenuItem
													className={sidebarDropdownItemClass}
													disabled={!activeSpace}
													onSelect={() => {
														setEditorMode('edit')
														setEditorOpen(true)
													}}
												>
													<FolderIcon className={shellChromeIconSecondaryClass} />
													<span>编辑当前 Space</span>
												</DropdownMenuItem>
												<DropdownMenuItem
													className={sidebarDropdownItemClass}
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
													<CheckIcon className={shellChromeIconSecondaryClass} />
													<span>设为默认 Space</span>
												</DropdownMenuItem>
												<DropdownMenuItem
													className={sidebarDropdownItemClass}
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
													<ExternalLinkIcon className={shellChromeIconSecondaryClass} />
													<span>归档当前 Space</span>
												</DropdownMenuItem>
												<DropdownMenuItem
													className={`${sidebarDropdownItemClass} text-destructive`}
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
													<DropdownMenuLabel className='max-w-64 whitespace-normal text-destructive'>
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
										<MainNavSidebarMenuItem
											badge={item.badge}
											icon={item.icon}
											itemKey={item.key}
											key={item.key}
											label={item.label}
											navItems={mainNavItems}
											onResetMainItemsVisibility={onResetMainItemsVisibility}
											onUpdateItemVisibility={onUpdateItemVisibility}
											to={item.to}
											visibleNavItemCount={visibleNavItemCount}
										/>
									))}
								</SidebarMenu>
							</SidebarGroupContent>
						</SidebarGroup>

						{settings.projectSection.visible ? (
							<SidebarGroup className='group-data-[sidebar-mode=desktop-collapsed]/sidebar-wrapper:hidden group-data-[sidebar-mode=mobile-closed]/sidebar-wrapper:hidden'>
								<div className={sidebarSectionHeaderRowClass}>
									<SidebarGroupLabel className='px-0'>项目列表</SidebarGroupLabel>
									<Button
										aria-label='创建项目'
										className='size-6 hover:bg-sf-shell-hover-strong focus-visible:bg-sf-shell-hover-strong'
										onClick={() => onOpenProjectCreateDialog()}
										size='icon'
										type='button'
										variant='ghost'
									>
										<PlusIcon />
									</Button>
								</div>

								{!settings.projectSection.collapsed ? (
									<SidebarGroupContent>
										{currentScope.type === 'all' ? (
											<div className={sidebarHelperTextClass}>
												全局 Scope 下先不展开具体项目，切到单个 Space 后再查看项目列表。
											</div>
										) : (
											<SidebarMenu>
												<NoProjectNavMenuItem
													badge={navBadges.noProject}
													currentScope={currentScope}
													fallbackSpaceId={fallbackSpaceId}
												/>
												{projectLinks.map((project) => (
													<ProjectNavMenuItem
														currentScope={currentScope}
														currentSpaceId={currentSpaceId}
														key={project.id}
														project={project}
													/>
												))}
											</SidebarMenu>
										)}
									</SidebarGroupContent>
								) : null}
							</SidebarGroup>
						) : null}
					</SidebarContent>

					<SidebarFooter className={sidebarFooterContainerClass}>
						<SidebarMenu>
							{footerItems.map((item) => (
								<SidebarMenuItem key={item.key}>
									<SidebarNavRow
										badge={item.badge}
										icon={item.icon}
										label={item.label}
										to={item.to}
									/>
								</SidebarMenuItem>
							))}
							<SidebarMenuItem key={settingsItem.key}>
								<SidebarNavRow
									icon={settingsItem.icon}
									label={settingsItem.label}
									to={settingsItem.to}
								/>
							</SidebarMenuItem>
						</SidebarMenu>
					</SidebarFooter>
					<SidebarRail />
				</Sidebar>
			</ContextMenuTrigger>

			<ContextMenuContent className='w-52'>
				<ContextMenuGroup>
					<SidebarCustomizeSubmenu
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

import { useMemo, useRef, useState } from 'react'
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
	SidebarItemContextMenu,
	SidebarNavRow,
	SpaceIconBadge,
	type MainNavItemViewModel,
} from '@/app/layouts/shell/sidebar'
import type { ShellSectionKey } from '@/app/layouts/shell/types'
import type {
	SidebarItemVisibilityTarget,
	SidebarMainItemKey,
} from '@/features/settings/api/sidebarSettings'
import {
	resolveRememberedPathForScope,
	type ShellSidebarSettings,
} from '@/app/layouts/shell/model/shellDevicePreferences'
import { getSpaceVisual } from '@/features/space/model/spaceVisuals'
import { SpaceEditorDialog } from '@/features/space/ui/SpaceEditorDialog'
import type { Scope, Space } from '@/shared/types'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/base/button'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/shared/ui/base/alert-dialog'
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
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
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
	sidebarSectionHeaderRowClass,
	sidebarInlineBadgeClass,
} from '@/shared/ui/patterns/sidebar-item'
import {
	shellChromeIconSecondaryClass,
	shellChromeIconSubtleClass,
	shellChromeInlineGroupClass,
} from '@/shared/ui/patterns/shell-chrome'
import {
	CheckIcon,
	ChevronsUpDownIcon,
	ExternalLinkIcon,
	FolderIcon,
	OrbitIcon,
	PlusIcon,
	Settings2Icon,
	Trash2Icon,
} from 'lucide-react'

type ShellNavBadges = Partial<Record<ShellSectionKey, string>>

type SpaceConfirmAction =
	| {
			kind: 'archive'
			title: string
			description: string
			confirmLabel: string
	  }
	| {
			kind: 'delete'
			title: string
			description: string
			confirmLabel: string
	  }

type ShellSidebarProps = {
	currentScope: Scope
	currentSpaceId: string | null
	spaces: Space[]
	projects: ShellProjectLink[]
	settings: ShellSidebarSettings
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
	const [pendingSpaceConfirmAction, setPendingSpaceConfirmAction] =
		useState<SpaceConfirmAction | null>(null)
	const confirmActionRef = useRef<HTMLButtonElement>(null)
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
		currentScope.type === 'all' ? '所有空间' : (activeSpace?.name ?? '未选择 Space')

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
	const footerCustomizeItems = SHELL_FOOTER_ITEMS.map((item) => ({
		key: item.key,
		label: item.label,
		icon: item.icon,
		visible: settings.footerItems[item.key].visible,
	}))
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

	async function handleConfirmSpaceAction() {
		if (!activeSpace || !pendingSpaceConfirmAction) {
			return
		}

		const currentAction = pendingSpaceConfirmAction
		setPendingSpaceConfirmAction(null)

		await runSpaceMutation(async () => {
			if (currentAction.kind === 'archive') {
				await onArchiveSpace(activeSpace.id)
			} else {
				await onDeleteSpace(activeSpace.id)
			}

			if (currentScope.type === 'space') {
				navigate('/spaces/inbox')
			}
		})
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
												{currentScope.type === 'all' ? (
													<SpaceIconBadge
														visual={{
															label: '所有空间',
															icon: OrbitIcon,
															iconClassName: 'text-[#8b5cf6]',
															iconBadgeClassName: 'bg-[#8b5cf6]',
															swatchClassName: 'bg-[#8b5cf6]',
														}}
													/>
												) : activeSpaceVisual ? (
													<SpaceIconBadge visual={activeSpaceVisual} />
												) : null}
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
											<DropdownMenuGroup>
												<DropdownMenuItem
													className={sidebarDropdownItemClass}
													onSelect={() => {
														void resolveRememberedPathForScope({
															scopeKey: 'all',
															spaces,
															defaultPath: '/spaces/inbox',
														}).then((path) => {
															navigate(path)
														})
													}}
												>
													<OrbitIcon className='size-3.5 shrink-0 text-[#8b5cf6]' />
													<span>所有空间</span>
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
																void resolveRememberedPathForScope({
																	scopeKey: `space:${space.id}`,
																	spaces,
																	defaultPath: `/space/${space.id}/inbox`,
																}).then((path) => {
																	navigate(path)
																})
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
													<span>新建空间</span>
												</DropdownMenuItem>
												<DropdownMenuSub>
													<DropdownMenuSubTrigger className={sidebarDropdownItemClass}>
														<Settings2Icon className={shellChromeIconSecondaryClass} />
														<span>编辑空间</span>
													</DropdownMenuSubTrigger>
													<DropdownMenuSubContent>
														<DropdownMenuItem
															disabled={!activeSpace}
															onSelect={() => {
																setEditorMode('edit')
																setEditorOpen(true)
															}}
														>
															<FolderIcon className={shellChromeIconSecondaryClass} />
															<span>编辑当前空间</span>
														</DropdownMenuItem>
														<DropdownMenuItem
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
															<span>设为默认</span>
														</DropdownMenuItem>
														<DropdownMenuItem
															disabled={!activeSpace || !canArchiveOrDeleteActiveSpace}
															onSelect={() => {
																if (!activeSpace) {
																	return
																}
																setPendingSpaceConfirmAction({
																	kind: 'archive',
																	title: `确认归档「${activeSpace.name}」吗？`,
																	description:
																		'归档后这个 Space 会从当前侧栏移除，但数据仍可在归档列表中恢复。',
																	confirmLabel: '归档',
																})
															}}
														>
															<ExternalLinkIcon className={shellChromeIconSecondaryClass} />
															<span>归档</span>
														</DropdownMenuItem>
														<DropdownMenuItem
															className='text-destructive'
															disabled={!activeSpace || !canArchiveOrDeleteActiveSpace}
															onSelect={() => {
																if (!activeSpace) {
																	return
																}
																setPendingSpaceConfirmAction({
																	kind: 'delete',
																	title: `确认删除「${activeSpace.name}」吗？`,
																	description:
																		'删除后这个 Space 会进入回收站，后续仍可从回收站恢复。',
																	confirmLabel: '删除',
																})
															}}
														>
															<Trash2Icon className='shrink-0' />
															<span>删除</span>
														</DropdownMenuItem>
													</DropdownMenuSubContent>
												</DropdownMenuSub>
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
											footerItems={footerCustomizeItems}
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
													contextMenuContent={
														<ContextMenuContent className='w-52'>
															<ContextMenuGroup>
																<SidebarCustomizeSubmenu
																	footerItems={footerCustomizeItems}
																	navItems={mainNavItems}
																	onResetMainItemsVisibility={onResetMainItemsVisibility}
																	onUpdateItemVisibility={onUpdateItemVisibility}
																	visibleNavItemCount={visibleNavItemCount}
																/>
															</ContextMenuGroup>
														</ContextMenuContent>
													}
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
										contextMenuContent={
											<SidebarItemContextMenu
												footerItems={footerCustomizeItems}
												isLastVisible={
													visibleNavItemCount === 1 && settings.footerItems[item.key].visible
												}
												navItems={mainNavItems}
												onResetMainItemsVisibility={onResetMainItemsVisibility}
												onUpdateItemVisibility={onUpdateItemVisibility}
												target={{ kind: 'footer', key: item.key }}
												visible={settings.footerItems[item.key].visible}
												visibleNavItemCount={visibleNavItemCount}
											/>
										}
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
						footerItems={footerCustomizeItems}
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
			<AlertDialog
				onOpenChange={(open) => {
					if (!open) {
						setPendingSpaceConfirmAction(null)
					}
				}}
				open={pendingSpaceConfirmAction !== null}
			>
				<AlertDialogContent
					onOpenAutoFocus={(event) => {
						event.preventDefault()
						confirmActionRef.current?.focus({ preventScroll: true })
					}}
				>
					<AlertDialogHeader>
						<AlertDialogTitle>{pendingSpaceConfirmAction?.title ?? '确认操作'}</AlertDialogTitle>
						<AlertDialogDescription>
							{pendingSpaceConfirmAction?.description ?? ''}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel onClick={() => setPendingSpaceConfirmAction(null)}>
							取消
						</AlertDialogCancel>
						<AlertDialogAction
							className={cn(
								pendingSpaceConfirmAction?.kind === 'delete' &&
									'border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive/15 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40',
							)}
							onClick={(event) => {
								event.preventDefault()
								void handleConfirmSpaceAction()
							}}
							ref={confirmActionRef}
						>
							{pendingSpaceConfirmAction?.confirmLabel ?? '确认'}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</ContextMenu>
	)
}

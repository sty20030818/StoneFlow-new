import { useCallback, useMemo, useState, type CSSProperties } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Button, Dropdown, Tooltip } from '@heroui/react'
import { ContextMenu, Sidebar } from '@heroui-pro/react'
import {
	CheckIcon,
	ChevronsUpDownIcon,
	ExternalLinkIcon,
	FolderIcon,
	PlusIcon,
	Settings2Icon,
	Trash2Icon,
} from 'lucide-react'

import { openSection, openStartupFallback, resolveRememberedPathForScope } from '@/app/navigation'
import { COMMAND_IDS, CommandTooltipRow } from '@/features/command'
import { useDangerConfirm } from '@/features/danger-confirm'
import type {
	ShellSidebarSettings,
	SidebarItemVisibilityTarget,
	SidebarMainItemKey,
} from '@/features/settings'
import { ALL_SPACES_VISUAL, getSpaceVisual, SpaceEditorDialog } from '@/features/space'
import { SHELL_FOOTER_ITEMS, SHELL_NAV_ITEMS, type ShellProjectLink } from '@/layout/config'
import {
	isAllScope,
	isShellMainNavAllowed,
	shouldShowSidebarProjectSection,
} from '@/layout/model/scopeNavPolicy'
import {
	MainNavSidebarMenuItem,
	ProjectNavMenuItem,
	SidebarCustomizeSubmenu,
	SidebarItemContextMenu,
	SidebarNavRow,
	SpaceIconBadge,
	StandaloneNavMenuItem,
	type MainNavItemViewModel,
} from '@/layout/sidebar'
import type { ShellSectionKey } from '@/layout/types'
import { cn } from '@/shared/lib/utils'
import type { Scope, Space } from '@/shared/types'

type ShellNavBadges = Partial<Record<ShellSectionKey, string>>
type SpaceRemovalResult = { defaultSpaceId: string | null }

export type ShellSidebarProps = {
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
	onArchiveSpace: (spaceId: string) => Promise<SpaceRemovalResult>
	onDeleteSpace: (spaceId: string) => Promise<SpaceRemovalResult>
	onOpenProjectCreateDialog: () => void
	onUpdateItemVisibility: (target: SidebarItemVisibilityTarget, visible: boolean) => void
	onResetMainItemsVisibility: () => void
}

/** 保留壳层入口；导航实现独立导出，供 desktop 与 compact 容器复用。 */
export function ShellSidebar(props: ShellSidebarProps) {
	return <ShellSidebarNavigation {...props} />
}

/** 唯一的 Shell 导航树；不负责桌面、窄栏或 Sheet 容器切换。 */
export function ShellSidebarNavigation({
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
	const navigate = useNavigate({ from: '/' })
	const { requestDangerConfirm } = useDangerConfirm()
	const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create')
	const [editorOpen, setEditorOpen] = useState(false)
	const [spaceSwitcherMenuOpen, setSpaceSwitcherMenuOpen] = useState(false)
	const [dropdownError, setDropdownError] = useState<string | null>(null)
	const fallbackSpaceId =
		currentSpaceId ?? spaces.find((space) => space.isDefault)?.id ?? spaces[0]?.id ?? null
	const activeSpace =
		(currentScope.type === 'space'
			? spaces.find((space) => space.id === currentScope.spaceId)
			: spaces.find((space) => space.id === fallbackSpaceId)) ??
		spaces[0] ??
		null
	const canArchiveOrDeleteActiveSpace = Boolean(activeSpace && !activeSpace.isDefault)
	const allScope = isAllScope(currentScope)
	const AllSpacesIcon = ALL_SPACES_VISUAL.icon
	const scopedProjectLinks = allScope ? [] : projects
	const currentScopeLabel = allScope ? '所有空间' : (activeSpace?.name ?? '未选择 Space')
	const showProjectSection = shouldShowSidebarProjectSection(
		currentScope,
		settings.projectSection.visible,
	)

	const mainNavItems = SHELL_NAV_ITEMS.map((item) => {
		const settingsKey = (item.key === 'tasks' ? 'allTasks' : item.key) as SidebarMainItemKey
		return {
			...item,
			badge: navBadges[item.section],
			to: item.to(currentScope, currentSpaceId),
			settingsKey,
			visible:
				settings.mainItems[settingsKey].visible && isShellMainNavAllowed(currentScope, item.key),
			order: settings.mainItems[settingsKey].order,
		}
	}) satisfies MainNavItemViewModel[]
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
	const footerItems = SHELL_FOOTER_ITEMS.filter((item) => settings.footerItems[item.key].visible)
		.map((item) => ({
			...item,
			badge: navBadges[item.section],
			to: item.to(currentScope, currentSpaceId),
			order: settings.footerItems[item.key].order,
		}))
		.sort((left, right) => left.order - right.order)
	const projectLinks = settings.projectSection.maxVisible
		? scopedProjectLinks.slice(0, settings.projectSection.maxVisible)
		: scopedProjectLinks
	const activeSpaceVisual = useMemo(
		() => (activeSpace ? getSpaceVisual(activeSpace) : null),
		[activeSpace],
	)

	const resolvePostSpaceRemovalPath = useCallback(
		(defaultSpaceId: string | null) => {
			const nextDefaultSpaceId =
				defaultSpaceId ?? spaces.find((space) => space.isDefault)?.id ?? null
			if (!nextDefaultSpaceId) {
				throw new Error('当前没有可用默认 Space，请先设置默认 Space')
			}

			return openSection(
				{ type: 'space', spaceId: nextDefaultSpaceId },
				'tasks',
				nextDefaultSpaceId,
			)
		},
		[spaces],
	)

	async function runSpaceMutation(task: () => Promise<void>) {
		try {
			setDropdownError(null)
			await task()
		} catch (error) {
			setDropdownError(error instanceof Error ? error.message : 'Space 操作失败')
		}
	}

	const navigateToRememberedScope = useCallback(
		(scopeKey: 'all' | `space:${string}`, defaultPath: string) => {
			setDropdownError(null)
			void resolveRememberedPathForScope({ scopeKey, spaces, defaultPath })
				.then((path) => void navigate({ to: path as never }))
				.catch((error) => {
					console.error('space switch restore failed', {
						scopeKey,
						defaultPath,
						error,
					})
					setDropdownError(error instanceof Error ? error.message : 'Space 切换失败')
					void navigate({ to: defaultPath as never })
				})
		},
		[navigate, spaces],
	)

	const handleSpaceEditorSubmit = useCallback(
		async (input: { name: string; iconKey: string; colorKey: string }) => {
			if (editorMode === 'create') {
				const createdSpace = await onCreateSpace(input)
				void navigate({
					to: openSection(
						{ type: 'space', spaceId: createdSpace.id },
						'standalone',
						createdSpace.id,
					) as never,
				})
				return
			}

			if (!activeSpace) throw new Error('当前没有可编辑的 Space')
			await onUpdateSpace({ spaceId: activeSpace.id, ...input })
		},
		[activeSpace, editorMode, navigate, onCreateSpace, onUpdateSpace],
	)

	async function handleArchiveActiveSpace() {
		if (!activeSpace) return
		const confirmed = await requestDangerConfirm({
			intent: 'archive',
			entityType: 'space',
			count: 1,
			entityLabel: activeSpace.name,
		})
		if (!confirmed) return
		await runSpaceMutation(async () => {
			const result = await onArchiveSpace(activeSpace.id)
			if (currentScope.type === 'space') {
				void navigate({
					to: resolvePostSpaceRemovalPath(result.defaultSpaceId) as never,
				})
			}
		})
	}

	async function handleDeleteActiveSpace() {
		if (!activeSpace) return
		const confirmed = await requestDangerConfirm({
			intent: 'trash',
			entityType: 'space',
			count: 1,
			entityLabel: activeSpace.name,
		})
		if (!confirmed) return
		await runSpaceMutation(async () => {
			const result = await onDeleteSpace(activeSpace.id)
			if (currentScope.type === 'space') {
				void navigate({
					to: resolvePostSpaceRemovalPath(result.defaultSpaceId) as never,
				})
			}
		})
	}

	return (
		<>
			<ContextMenu>
				<ContextMenu.Trigger className='flex h-full min-h-0 w-full'>
					<Sidebar
						className='h-full min-h-0'
						style={{ '--sidebar-width': 'inherit', display: 'flex' } as CSSProperties}
					>
						<Sidebar.Header>
							<Dropdown isOpen={spaceSwitcherMenuOpen} onOpenChange={setSpaceSwitcherMenuOpen}>
								<Button
									fullWidth
									aria-label='切换 Space'
									onContextMenu={(event) => event.stopPropagation()}
									size='lg'
									variant='ghost'
								>
									<span className='flex min-w-0 w-full items-center gap-2'>
										{allScope ? (
											<SpaceIconBadge visual={ALL_SPACES_VISUAL} />
										) : activeSpaceVisual ? (
											<SpaceIconBadge visual={activeSpaceVisual} />
										) : null}
										<span
											className='min-w-0 flex-1 truncate text-left font-semibold'
											data-sidebar='label'
										>
											{currentScopeLabel}
										</span>
										<ChevronsUpDownIcon className='size-4 text-muted' data-sidebar='label' />
									</span>
								</Button>
								<Dropdown.Popover className='w-64' offset={6} placement='right top'>
									<Dropdown.Menu aria-label='切换 Space'>
										<Dropdown.Item
											id='scope-all'
											onAction={() =>
												navigateToRememberedScope('all', openStartupFallback({ type: 'all' }))
											}
											textValue='所有空间'
										>
											<AllSpacesIcon
												className={cn('size-4 shrink-0', ALL_SPACES_VISUAL.iconClassName)}
											/>
											<span>所有空间</span>
											{allScope ? <CheckIcon className='ml-auto size-4' /> : null}
										</Dropdown.Item>
										{spaces.map((space) => {
											const isActive =
												currentScope.type === 'space' && space.id === currentScope.spaceId
											const visual = getSpaceVisual(space)
											const SpaceIcon = visual.icon
											return (
												<Dropdown.Item
													id={`space-${space.id}`}
													key={space.id}
													onAction={() =>
														navigateToRememberedScope(
															`space:${space.id}`,
															openSection(
																{ type: 'space', spaceId: space.id },
																'standalone',
																space.id,
															),
														)
													}
													textValue={space.name}
												>
													<SpaceIcon className={cn('size-4 shrink-0', visual.iconClassName)} />
													<span className='truncate'>{space.name}</span>
													{space.isDefault ? (
														<span className='text-xs text-muted'>默认</span>
													) : null}
													{isActive ? <CheckIcon className='ml-auto size-4' /> : null}
												</Dropdown.Item>
											)
										})}
										<Dropdown.Item
											id='create-space'
											onAction={() => {
												setEditorMode('create')
												setEditorOpen(true)
											}}
											textValue='新建空间'
										>
											<PlusIcon className='size-4 text-muted' />
											<span>新建空间</span>
										</Dropdown.Item>
										<Dropdown.SubmenuTrigger>
											<Dropdown.Item id='edit-space-actions' textValue='编辑空间'>
												<Settings2Icon className='size-4 text-muted' />
												<span>编辑空间</span>
												<Dropdown.SubmenuIndicator />
											</Dropdown.Item>
											<Dropdown.Popover className='w-52' placement='right top'>
												<Dropdown.Menu aria-label='编辑空间'>
													<Dropdown.Item
														id='edit-active-space'
														isDisabled={!activeSpace}
														onAction={() => {
															setEditorMode('edit')
															setEditorOpen(true)
														}}
														textValue='编辑当前空间'
													>
														<FolderIcon className='size-4 text-muted' />
														<span>编辑当前空间</span>
													</Dropdown.Item>
													<Dropdown.Item
														id='set-default-space'
														isDisabled={!activeSpace || activeSpace.isDefault}
														onAction={() => {
															if (activeSpace)
																void runSpaceMutation(
																	async () => void (await onSetDefaultSpace(activeSpace.id)),
																)
														}}
														textValue='设为默认'
													>
														<CheckIcon className='size-4 text-muted' />
														<span>设为默认</span>
													</Dropdown.Item>
													<Dropdown.Item
														id='archive-space'
														isDisabled={!canArchiveOrDeleteActiveSpace}
														onAction={() => void handleArchiveActiveSpace()}
														textValue='归档'
													>
														<ExternalLinkIcon className='size-4 text-muted' />
														<span>归档</span>
													</Dropdown.Item>
													<Dropdown.Item
														id='delete-space'
														isDisabled={!canArchiveOrDeleteActiveSpace}
														onAction={() => void handleDeleteActiveSpace()}
														textValue='删除'
														variant='danger'
													>
														<Trash2Icon className='size-4' />
														<span>删除</span>
													</Dropdown.Item>
												</Dropdown.Menu>
											</Dropdown.Popover>
										</Dropdown.SubmenuTrigger>
										{dropdownError ? (
											<Dropdown.Item id='space-error' isDisabled textValue={dropdownError}>
												<span className='whitespace-normal text-danger'>{dropdownError}</span>
											</Dropdown.Item>
										) : null}
									</Dropdown.Menu>
								</Dropdown.Popover>
							</Dropdown>
						</Sidebar.Header>

						<Sidebar.Content>
							<Sidebar.Group>
								<Sidebar.Menu aria-label='主要导航'>
									{visibleNavItems.map((item) => (
										<MainNavSidebarMenuItem
											badge={item.badge}
											commandId={item.commandId}
											footerItems={footerCustomizeItems}
											icon={item.icon}
											itemKey={item.settingsKey}
											key={item.key}
											label={item.label}
											navItems={mainNavItems}
											onResetMainItemsVisibility={onResetMainItemsVisibility}
											onUpdateItemVisibility={onUpdateItemVisibility}
											to={item.to}
											visibleNavItemCount={visibleNavItemCount}
										/>
									))}
								</Sidebar.Menu>
							</Sidebar.Group>

							{showProjectSection ? (
								<div
									className='group-data-[sidebar-mode=icon]/sidebar-wrapper:hidden'
									data-slot='sidebar-project-section'
								>
									<Sidebar.Group>
										<div className='flex h-8 items-center justify-between'>
											<Sidebar.GroupLabel>项目列表</Sidebar.GroupLabel>
											<Tooltip closeDelay={0} delay={0}>
												<Button
													isIconOnly
													aria-label='创建项目'
													onContextMenu={(event) => event.stopPropagation()}
													onPress={onOpenProjectCreateDialog}
													size='sm'
													variant='ghost'
												>
													<PlusIcon className='size-4' />
												</Button>
												<Tooltip.Content placement='right'>
													<CommandTooltipRow commandId={COMMAND_IDS.newProject} label='创建项目' />
												</Tooltip.Content>
											</Tooltip>
										</div>
										{!settings.projectSection.collapsed ? (
											<Sidebar.Menu aria-label='项目导航'>
												<StandaloneNavMenuItem
													badge={navBadges.standalone}
													contextMenuContent={
														<ContextMenu.Popover className='w-52'>
															<ContextMenu.Menu aria-label='独立事项操作'>
																<SidebarCustomizeSubmenu
																	footerItems={footerCustomizeItems}
																	navItems={mainNavItems}
																	onResetMainItemsVisibility={onResetMainItemsVisibility}
																	onUpdateItemVisibility={onUpdateItemVisibility}
																	visibleNavItemCount={visibleNavItemCount}
																/>
															</ContextMenu.Menu>
														</ContextMenu.Popover>
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
											</Sidebar.Menu>
										) : null}
									</Sidebar.Group>
								</div>
							) : null}
						</Sidebar.Content>

						<Sidebar.Footer>
							<Sidebar.Menu aria-label='辅助导航'>
								{footerItems.map((item) => (
									<SidebarNavRow
										badge={item.badge}
										commandId={item.commandId}
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
										key={item.key}
										label={item.label}
										to={item.to}
									/>
								))}
							</Sidebar.Menu>
						</Sidebar.Footer>
					</Sidebar>
				</ContextMenu.Trigger>
				<ContextMenu.Popover className='w-52'>
					<ContextMenu.Menu aria-label='侧边栏操作'>
						<SidebarCustomizeSubmenu
							footerItems={footerCustomizeItems}
							navItems={mainNavItems}
							onResetMainItemsVisibility={onResetMainItemsVisibility}
							onUpdateItemVisibility={onUpdateItemVisibility}
							visibleNavItemCount={visibleNavItemCount}
						/>
					</ContextMenu.Menu>
				</ContextMenu.Popover>
			</ContextMenu>

			<SpaceEditorDialog
				mode={editorMode}
				onClose={() => setEditorOpen(false)}
				onSubmit={handleSpaceEditorSubmit}
				open={editorOpen}
				space={editorMode === 'edit' ? activeSpace : null}
			/>
		</>
	)
}

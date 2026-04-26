import { startTransition, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import {
	getSectionLabel,
	getSpaceLabel,
	SHELL_ROUTE_ITEMS,
	type ShellProjectLink,
} from '@/app/layouts/shell/config'
import { useShellRouteHistory } from '@/app/layouts/shell/model/useShellRouteHistory'
import type { ShellDrawerKind, ShellSectionKey } from '@/app/layouts/shell/types'
import { GlobalSearchInput } from '@/features/global-search/ui/GlobalSearchInput'
import { Badge } from '@/shared/ui/base/badge'
import { Button } from '@/shared/ui/base/button'
import {
	Command,
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
	CommandShortcut,
} from '@/shared/ui/base/command'
import { getProjectStatusBadgeVariant } from '@/shared/ui/badgeSemantics'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from '@/shared/ui/base/dropdown-menu'
import { Kbd } from '@/shared/ui/base/kbd'
import { useSidebar } from '@/shared/ui/base/sidebar-context'
import { cn } from '@/shared/lib/utils'
import { getCurrentWindow } from '@tauri-apps/api/window'
import {
	ChevronLeftIcon,
	ChevronDownIcon,
	ChevronRightIcon,
	FolderIcon,
	FolderPlusIcon,
	HistoryIcon,
	InboxIcon,
	MinusIcon,
	PanelLeftCloseIcon,
	PanelLeftOpenIcon,
	SearchIcon,
	Settings2Icon,
	SquarePenIcon,
	SquareIcon,
	TargetIcon,
	Trash2Icon,
	XIcon,
	type LucideIcon,
} from 'lucide-react'

type ShellHeaderProps = {
	currentSpaceId: string
	activeSection: ShellSectionKey
	isCommandOpen: boolean
	isProjectsLoading: boolean
	projects: ShellProjectLink[]
	projectsError: string | null
	onCommandOpenChange: (open: boolean) => void
	onOpenTaskCreateDialog: () => void
	onOpenProjectCreateDialog: () => void
	onOpenDrawer: (kind: ShellDrawerKind, id: string) => void
	onCloseDrawer: () => void
}

export function ShellHeader({
	currentSpaceId,
	activeSection,
	isCommandOpen,
	isProjectsLoading,
	onCommandOpenChange,
	onOpenProjectCreateDialog,
	onOpenTaskCreateDialog,
	onOpenDrawer,
	onCloseDrawer,
	projects,
	projectsError,
}: ShellHeaderProps) {
	const navigate = useNavigate()
	const [isMaximized, setIsMaximized] = useState(false)
	const isMac = useMemo(() => /Mac|iPhone|iPad|iPod/i.test(window.navigator.userAgent), [])
	const isWin = useMemo(
		() => /Windows/i.test(window.navigator.userAgent) || window.navigator.platform === 'Win32',
		[],
	)
	const defaultProjectId = projects[0]?.id ?? null
	const {
		entries: routeHistoryEntries,
		canGoBack,
		canGoForward,
		goBack,
		goForward,
		navigateToHistoryEntry,
	} = useShellRouteHistory({ currentSpaceId, projects })
	const { toggleSidebar, visualState: sidebarVisualState, isMobile: isLayoutNarrow } = useSidebar()
	const sidebarToggleOpen =
		sidebarVisualState === 'desktop-expanded' || sidebarVisualState === 'mobile-open'
	const SidebarToggleIcon = sidebarToggleOpen ? PanelLeftCloseIcon : PanelLeftOpenIcon

	/** 与 `max-sm` 同为 640px 阈；`display: contents` 与变体并用时纯 CSS 不可靠，故用媒体查询做显示开关 */
	const [isAtLeastSm, setIsAtLeastSm] = useState(() => {
		if (typeof window === 'undefined') {
			return true
		}
		return window.matchMedia('(min-width: 640px)').matches
	})
	useLayoutEffect(() => {
		const mq = window.matchMedia('(min-width: 640px)')
		const onChange = () => setIsAtLeastSm(mq.matches)
		onChange()
		mq.addEventListener('change', onChange)
		return () => mq.removeEventListener('change', onChange)
	}, [])

	useEffect(() => {
		let disposed = false

		async function syncWindowState() {
			try {
				const currentWindow = getCurrentWindow()
				const maximized = await currentWindow.isMaximized()

				if (!disposed) {
					setIsMaximized(maximized)
				}
			} catch {
				if (!disposed) {
					setIsMaximized(false)
				}
			}
		}

		void syncWindowState()

		return () => {
			disposed = true
		}
	}, [])

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (isTextInputTarget(event.target)) {
				return
			}

			if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
				event.preventDefault()
				onCommandOpenChange(true)
				return
			}

			if (!event.metaKey && !event.ctrlKey && !event.altKey && event.key.toLowerCase() === 'c') {
				event.preventDefault()
				onOpenTaskCreateDialog()
			}
		}

		window.addEventListener('keydown', handleKeyDown)

		return () => {
			window.removeEventListener('keydown', handleKeyDown)
		}
	}, [onCommandOpenChange, onOpenTaskCreateDialog])

	const handleNavigate = (to: string) => {
		onCommandOpenChange(false)
		startTransition(() => {
			navigate(to)
		})
	}

	const handleOpenProjectFromSearch = (projectId: string) => {
		onCloseDrawer()
		startTransition(() => {
			navigate(`/space/${currentSpaceId}/project/${projectId}`)
		})
	}

	const handleMinimize = async () => {
		try {
			await getCurrentWindow().minimize()
		} catch {
			// 浏览器预览下静默失败。
		}
	}

	const handleToggleMaximize = async () => {
		try {
			const currentWindow = getCurrentWindow()
			await currentWindow.toggleMaximize()
			setIsMaximized(await currentWindow.isMaximized())
		} catch {
			setIsMaximized((current) => !current)
		}
	}

	const handleClose = async () => {
		try {
			await getCurrentWindow().close()
		} catch {
			// 浏览器预览下静默失败。
		}
	}

	const handleHeaderMouseDownCapture = (event: React.MouseEvent<HTMLElement>) => {
		const target = event.target
		if (!(target instanceof HTMLElement)) {
			return
		}

		if (target.closest('[data-sf-search-root="true"]')) {
			return
		}

		const activeElement = document.activeElement
		if (activeElement instanceof HTMLElement) {
			activeElement.blur()
		}
	}

	return (
		<>
			<header
				className={cn(
					'relative z-30 flex h-12 shrink-0 flex-nowrap items-center gap-3 bg-(--sf-color-shell-chrome) pr-0',
					// 左条整块 <640 不渲染时，为刘海/窗口区补左侧内边，避免主带贴边
					!isAtLeastSm && (isMac ? 'pl-24' : 'pl-3'),
				)}
				data-tauri-drag-region
				onMouseDownCapture={handleHeaderMouseDownCapture}
			>
				{isAtLeastSm ? (
					<div
						className={cn(
							'flex h-full shrink-0 flex-nowrap items-center transition-[width] duration-(--sf-shell-layout-sync-duration) ease-(--sf-shell-layout-sync-easing) motion-reduce:transition-none',
							'group-data-[sidebar-resizing=true]/sidebar-wrapper:transition-none',
							'group-data-[sidebar-mode=desktop-expanded]/sidebar-wrapper:w-(--sf-shell-sidebar-reserved-width) group-data-[sidebar-mode=desktop-expanded]/sidebar-wrapper:min-w-0',
							'group-data-[sidebar-mode=desktop-expanded]/sidebar-wrapper:pr-3',
							'group-data-[sidebar-mode=desktop-collapsed]/sidebar-wrapper:w-max group-data-[sidebar-layout=mobile]/sidebar-wrapper:w-max',
							isMac
								? 'pl-24 group-data-[sidebar-mode=desktop-expanded]/sidebar-wrapper:pl-0'
								: 'pl-5.5 group-data-[sidebar-mode=desktop-expanded]/sidebar-wrapper:pl-3',
							!isMac && 'group-data-[sidebar-mode=desktop-collapsed]/sidebar-wrapper:pl-3',
							!isMac && 'group-data-[sidebar-layout=mobile]/sidebar-wrapper:pl-3',
						)}
						data-slot='shell-header-left'
						data-tauri-drag-region
						onDoubleClick={() => {
							if (!isMac) {
								void handleToggleMaximize()
							}
						}}
					>
						<div className='flex min-w-0 flex-1 items-center gap-1' data-tauri-drag-region>
							{!isMac && (!isWin || !isLayoutNarrow) ? (
								<Button
									aria-label='StoneFlow'
									className='shrink-0 rounded-full bg-transparent text-(--sf-color-shell-secondary) shadow-none hover:bg-(--sf-color-shell-hover) hover:text-foreground focus-visible:ring-0'
									size='icon-sm'
									type='button'
									variant='ghost'
								>
									{/* 与历史/前/后同一 icon-sm 槽；整段左条在 &lt;640 不挂载。Win 下 &lt;1024 不渲染由 isLayoutNarrow 控制 */}
									<img
										alt=''
										aria-hidden='true'
										className='size-full rounded-full object-cover'
										draggable={false}
										src='/avatar.jpg'
									/>
								</Button>
							) : null}

							{/* 展开态把导航键推到 sidebar 右边界，拖拽空白只承担窗体 chrome。 */}
							<div
								className='hidden h-full min-w-0 flex-1 self-stretch group-data-[sidebar-mode=desktop-expanded]/sidebar-wrapper:block group-data-[sidebar-mode=desktop-collapsed]/sidebar-wrapper:hidden group-data-[sidebar-layout=mobile]/sidebar-wrapper:hidden'
								data-slot='shell-header-left-drag'
								data-tauri-drag-region
							/>
						</div>

						<div
							className='flex shrink-0 items-center gap-1'
							data-slot='shell-header-nav'
							data-tauri-drag-region
						>
							<Button
								aria-label={sidebarToggleOpen ? '收起侧边栏' : '展开侧边栏'}
								className={cn(
									'hidden shrink-0 group-data-[sidebar-mode=desktop-expanded]/sidebar-wrapper:hidden group-data-[sidebar-layout=mobile]/sidebar-wrapper:inline-flex group-data-[sidebar-mode=desktop-collapsed]/sidebar-wrapper:inline-flex',
									'rounded-full bg-transparent text-(--sf-color-shell-secondary) shadow-none hover:bg-(--sf-color-shell-hover) hover:text-foreground focus-visible:ring-0',
								)}
								data-slot='sidebar-trigger'
								onClick={toggleSidebar}
								size='icon-sm'
								type='button'
								variant='ghost'
							>
								<SidebarToggleIcon className='size-3.5' />
							</Button>

							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										aria-label='打开历史记录'
										className='rounded-full bg-transparent text-(--sf-color-shell-secondary) shadow-none hover:bg-(--sf-color-shell-hover) hover:text-foreground aria-expanded:bg-(--sf-color-shell-hover)'
										size='icon-sm'
										variant='ghost'
									>
										<HistoryIcon className='size-3.5' />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align='start'>
									<DropdownMenuLabel>最近浏览</DropdownMenuLabel>
									<DropdownMenuGroup>
										{routeHistoryEntries.length > 0 ? (
											routeHistoryEntries.map((entry) => {
												const EntryIcon = resolveHistoryIcon(entry.path)
												return (
													<DropdownMenuItem
														key={entry.id}
														onSelect={() => navigateToHistoryEntry(entry)}
													>
														<EntryIcon />
														<span className='min-w-0 truncate'>{entry.label}</span>
													</DropdownMenuItem>
												)
											})
										) : (
											<DropdownMenuItem disabled>暂无历史记录</DropdownMenuItem>
										)}
									</DropdownMenuGroup>
								</DropdownMenuContent>
							</DropdownMenu>
							<Button
								aria-label='后退'
								className='rounded-full bg-transparent text-(--sf-color-shell-secondary) shadow-none hover:bg-(--sf-color-shell-hover) hover:text-foreground'
								disabled={!canGoBack}
								onClick={goBack}
								size='icon-sm'
								variant='ghost'
							>
								<ChevronLeftIcon className='size-3.5' />
							</Button>
							<Button
								aria-label='前进'
								className='rounded-full bg-transparent text-(--sf-color-shell-secondary) shadow-none hover:bg-(--sf-color-shell-hover) hover:text-foreground'
								disabled={!canGoForward}
								onClick={goForward}
								size='icon-sm'
								variant='ghost'
							>
								<ChevronRightIcon className='size-3.5' />
							</Button>
						</div>
					</div>
				) : null}

				<div
					className='flex min-h-0 min-w-0 flex-1 flex-nowrap items-center gap-3 px-0 group-data-[sidebar-layout=mobile]/sidebar-wrapper:min-w-0'
					data-slot='shell-header-main'
					data-tauri-drag-region
				>
					<div
						className='flex min-h-0 min-w-0 flex-1 justify-center'
						data-slot='shell-header-center'
						data-tauri-drag-region
						onDoubleClick={() => {
							if (!isMac) {
								void handleToggleMaximize()
							}
						}}
					>
						<div className='min-w-0 w-full max-w-100'>
							<GlobalSearchInput
								currentSpaceId={currentSpaceId}
								onOpenProject={handleOpenProjectFromSearch}
								onOpenTask={(taskId) => onOpenDrawer('task', taskId)}
							/>
						</div>
					</div>
					<div
						className={`flex h-full shrink-0 items-center ${isMac ? 'gap-2 pl-1.5 pr-3' : 'gap-0 pl-0 pr-0'}`}
						data-slot='shell-header-right'
						data-tauri-drag-region
					>
						<div className='flex items-center gap-1.5' data-tauri-drag-region>
							<Button
								className='border-border bg-card px-3 text-[12px] font-medium text-foreground shadow-(--sf-shadow-panel) hover:bg-(--sf-color-bg-surface-tertiary) group-data-[sidebar-layout=mobile]/sidebar-wrapper:hidden'
								onClick={onOpenTaskCreateDialog}
								size='default'
								variant='outline'
							>
								<span>新建任务</span>
								<Kbd>C</Kbd>
							</Button>
							<Button
								aria-label='新建任务'
								className='hidden border-border bg-card text-(--sf-color-shell-secondary) shadow-(--sf-shadow-panel) hover:bg-(--sf-color-bg-surface-tertiary) hover:text-foreground group-data-[sidebar-layout=mobile]/sidebar-wrapper:inline-flex'
								onClick={onOpenTaskCreateDialog}
								size='icon'
								variant='outline'
							>
								<SquarePenIcon className='size-3.5' />
							</Button>

							<div className='max-sm:hidden' data-tauri-drag-region>
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button
											aria-label='打开创建菜单'
											className='border-border bg-card text-(--sf-color-shell-secondary) shadow-(--sf-shadow-panel) hover:bg-(--sf-color-bg-surface-tertiary) hover:text-foreground'
											size='icon'
											variant='outline'
										>
											<ChevronDownIcon />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align='end'>
										<DropdownMenuGroup>
											<DropdownMenuItem onSelect={onOpenTaskCreateDialog}>
												<SquarePenIcon />
												新建任务
											</DropdownMenuItem>
											<DropdownMenuItem onSelect={onOpenProjectCreateDialog}>
												<FolderPlusIcon />
												新建项目
											</DropdownMenuItem>
										</DropdownMenuGroup>
									</DropdownMenuContent>
								</DropdownMenu>
							</div>
						</div>

						<div className='ml-2 flex items-center gap-2' data-tauri-drag-region>
							<img
								alt='当前用户头像'
								className='size-7.5 rounded-full border border-(--sf-color-border-subtle) object-cover'
								data-tauri-drag-region
								src='/avatar.jpg'
							/>
						</div>

						{/* macOS 使用系统原生窗体控制，避免与页面内自绘按钮重复。 */}
						{!isMac ? (
							<div className='flex h-full items-center gap-1 p-1' data-tauri-drag-region>
								<Button
									aria-label='最小化窗口'
									className='h-10 w-10 rounded-md bg-transparent shadow-none ring-0 text-(--sf-color-shell-secondary) hover:bg-(--sf-color-shell-hover-strong) hover:text-foreground focus-visible:ring-0'
									onClick={() => void handleMinimize()}
									variant='ghost'
								>
									<MinusIcon className='size-3.5' />
								</Button>
								<Button
									aria-label={isMaximized ? '还原窗口' : '最大化窗口'}
									className='h-10 w-10 rounded-md bg-transparent shadow-none ring-0 text-(--sf-color-shell-secondary) hover:bg-(--sf-color-shell-hover-strong) hover:text-foreground focus-visible:ring-0'
									onClick={() => void handleToggleMaximize()}
									variant='ghost'
								>
									<SquareIcon className={`size-3 ${isMaximized ? 'scale-[0.88]' : ''}`} />
								</Button>
								<Button
									aria-label='关闭窗口'
									className='h-10 w-10 rounded-md bg-transparent shadow-none ring-0 text-(--sf-color-shell-secondary) hover:bg-[#E81123] hover:text-white focus-visible:ring-0'
									onClick={() => void handleClose()}
									variant='ghost'
								>
									<XIcon className='size-3.5' />
								</Button>
							</div>
						) : null}
					</div>
				</div>
			</header>

			<CommandDialog
				className='max-w-2xl border border-border/80 bg-popover/98 shadow-(--sf-shadow-float)'
				description={`${getSpaceLabel(currentSpaceId)} · ${getSectionLabel(activeSection)}`}
				onOpenChange={onCommandOpenChange}
				open={isCommandOpen}
				title='StoneFlow Command'
			>
				<Command className='bg-transparent'>
					<CommandInput placeholder='创建任务、跳转页面或打开详情…' />
					<CommandList className='no-scrollbar max-h-96 overflow-y-auto'>
						<CommandEmpty>没有结果</CommandEmpty>

						<CommandGroup heading='Quick Actions'>
							<CommandItem
								onSelect={() => {
									onCommandOpenChange(false)
									onOpenTaskCreateDialog()
								}}
							>
								<SquarePenIcon />
								创建任务
								<CommandShortcut>C</CommandShortcut>
							</CommandItem>
							<CommandItem
								onSelect={() => {
									onCommandOpenChange(false)
									onOpenProjectCreateDialog()
								}}
							>
								<FolderPlusIcon />
								创建项目
								<CommandShortcut>⇧↵</CommandShortcut>
							</CommandItem>
							<CommandItem
								disabled={!defaultProjectId}
								onSelect={() => {
									onCommandOpenChange(false)
									if (defaultProjectId) {
										onOpenDrawer('project', defaultProjectId)
									}
								}}
							>
								<SearchIcon />
								打开当前项目摘要
								<CommandShortcut>⌥P</CommandShortcut>
							</CommandItem>
						</CommandGroup>

						<CommandSeparator />

						<CommandGroup heading='Navigate'>
							{SHELL_ROUTE_ITEMS.map((item) => (
								<CommandItem
									key={item.key}
									onSelect={() => handleNavigate(item.to(currentSpaceId))}
									value={item.label}
								>
									<item.icon />
									{item.label}
								</CommandItem>
							))}
						</CommandGroup>

						<CommandSeparator />

						<CommandGroup heading='Projects'>
							{isProjectsLoading ? (
								<CommandItem disabled value='loading-projects'>
									<SearchIcon />
									正在加载项目...
								</CommandItem>
							) : projectsError ? (
								<CommandItem disabled value='projects-error'>
									<SearchIcon />
									{projectsError}
								</CommandItem>
							) : projects.length === 0 ? (
								<CommandItem disabled value='empty-projects'>
									<SearchIcon />
									当前 Space 还没有项目
								</CommandItem>
							) : (
								projects.map((project) => (
									<CommandItem
										key={project.id}
										onSelect={() =>
											handleNavigate(`/space/${currentSpaceId}/project/${project.id}`)
										}
										value={project.label}
									>
										<SearchIcon />
										{project.label}
										{project.badge ? (
											<Badge
												className='ml-auto h-4 rounded-md px-1.5 text-[10.5px]'
												variant={getProjectStatusBadgeVariant(project.badge)}
											>
												{project.badge}
											</Badge>
										) : null}
									</CommandItem>
								))
							)}
						</CommandGroup>
					</CommandList>
				</Command>
			</CommandDialog>
		</>
	)
}

// 根据历史条目的路径推断对应的语义 icon，与 Sidebar 主导航保持一致
function resolveHistoryIcon(path: string): LucideIcon {
	if (path.includes('/project/')) {
		return FolderIcon
	}

	if (path.includes('/focus')) {
		return TargetIcon
	}

	if (path.includes('/trash')) {
		return Trash2Icon
	}

	if (path.includes('/settings')) {
		return Settings2Icon
	}

	return InboxIcon
}

function isTextInputTarget(target: EventTarget | null) {
	if (!(target instanceof HTMLElement)) {
		return false
	}

	return (
		target.isContentEditable ||
		target.tagName === 'INPUT' ||
		target.tagName === 'TEXTAREA' ||
		target.tagName === 'SELECT'
	)
}

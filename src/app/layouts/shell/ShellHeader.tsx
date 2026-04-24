import { startTransition, useEffect, useMemo, useState } from 'react'
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
import { SidebarTrigger } from '@/shared/ui/base/sidebar'
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
	const defaultProjectId = projects[0]?.id ?? null
	const {
		entries: routeHistoryEntries,
		canGoBack,
		canGoForward,
		goBack,
		goForward,
		navigateToHistoryEntry,
	} = useShellRouteHistory({ currentSpaceId, projects })

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
				className='relative flex h-12 shrink-0 items-center bg-(--sf-color-shell-chrome) pl-0 pr-0'
				data-tauri-drag-region
				onMouseDownCapture={handleHeaderMouseDownCapture}
			>
				<div
					className={cn(
						// 与主内容区（ShellMain）右侧 gutter 对齐：12px
						'flex h-full items-center gap-2 pr-3 transition-[width] duration-200 ease-out',
						// 桌面展开：历史组用 ml-auto 贴右；不需要子项之间的 gap（否则会留下“幽灵间距”）
						'group-data-[sidebar-mode=desktop-expanded]/sidebar-wrapper:gap-0',
						'group-data-[sidebar-resizing=true]/sidebar-wrapper:transition-none',
						// macOS：折叠态保留 traffic light 左侧安全区；展开态左区已用 flex-1 把按钮顶到右侧，无需额外 pl
						isMac
							? 'pl-24 group-data-[sidebar-mode=desktop-expanded]/sidebar-wrapper:pl-0'
							: 'pl-5.5 group-data-[sidebar-mode=desktop-expanded]/sidebar-wrapper:pl-0',
						// 桌面展开：对齐 sidebar 的统一预留宽度，而不是依赖流式 sidebar 列。
						'group-data-[sidebar-mode=desktop-expanded]/sidebar-wrapper:w-(--sf-shell-sidebar-reserved-width)',
						// 桌面折叠：这里需要容纳「折叠按钮 + 历史/前进/后退」，因此用 auto 宽
						isMac
							? 'group-data-[sidebar-mode=desktop-collapsed]/sidebar-wrapper:w-auto'
							: 'group-data-[sidebar-mode=desktop-collapsed]/sidebar-wrapper:w-auto group-data-[sidebar-mode=desktop-collapsed]/sidebar-wrapper:pl-2 group-data-[sidebar-mode=desktop-collapsed]/sidebar-wrapper:pr-3',
						// 移动端：内容自适应
						'group-data-[sidebar-layout=mobile]/sidebar-wrapper:w-auto',
					)}
					data-tauri-drag-region
					onDoubleClick={() => {
						if (!isMac) {
							void handleToggleMaximize()
						}
					}}
				>
					<div
						className='min-w-0 flex-1 self-stretch group-data-[sidebar-mode=desktop-expanded]/sidebar-wrapper:block group-data-[sidebar-mode=desktop-collapsed]/sidebar-wrapper:hidden group-data-[sidebar-layout=mobile]/sidebar-wrapper:hidden'
						data-tauri-drag-region
					/>

					{/* 桌面折叠态 / 移动端：以 SidebarTrigger 作为唯一入口替代历史集群 */}
					<SidebarTrigger
						// desktop-expanded：完全不渲染占位（避免父级 gap-2 在“隐藏但仍占位”的元素旁产生空隙）
						className='hidden group-data-[sidebar-mode=desktop-expanded]/sidebar-wrapper:hidden group-data-[sidebar-layout=mobile]/sidebar-wrapper:inline-flex group-data-[sidebar-mode=desktop-collapsed]/sidebar-wrapper:inline-flex group-data-[sidebar-mode=desktop-collapsed]/sidebar-wrapper:-translate-x-0.5'
					/>

					{/* 历史 / 前进 / 后退：桌面展开态、桌面折叠态都显示；移动端隐藏 */}
					<div className='flex items-center gap-2 group-data-[sidebar-mode=desktop-expanded]/sidebar-wrapper:ml-auto group-data-[sidebar-layout=mobile]/sidebar-wrapper:hidden'>
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

				<div className='flex min-w-0 flex-1 items-center gap-2 px-0' data-tauri-drag-region>
					<div className='min-w-0 w-full max-w-136 shrink'>
						<GlobalSearchInput
							currentSpaceId={currentSpaceId}
							onOpenProject={handleOpenProjectFromSearch}
							onOpenTask={(taskId) => onOpenDrawer('task', taskId)}
						/>
					</div>

					<div
						className='min-w-4 flex-1 self-stretch'
						data-tauri-drag-region
						onDoubleClick={() => {
							if (!isMac) {
								void handleToggleMaximize()
							}
						}}
					/>
				</div>

				<div
					className={`flex h-full shrink-0 items-center ${isMac ? 'gap-2 pl-1.5 pr-3' : 'gap-0 pl-2 pr-0'}`}
					data-tauri-drag-region
				>
					<div className='flex items-center gap-1.5'>
						<Button
							className='border-border bg-card px-3 text-[12px] font-medium text-foreground shadow-(--sf-shadow-panel) hover:bg-(--sf-color-bg-surface-tertiary)'
							onClick={onOpenTaskCreateDialog}
							size='default'
							variant='outline'
						>
							<span>新建任务</span>
							<Kbd>C</Kbd>
						</Button>

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

					<div className='ml-2 flex items-center gap-2'>
						<img
							alt='当前用户头像'
							className='size-7.5 rounded-full border border-(--sf-color-border-subtle) object-cover'
							src='/avatar.jpg'
						/>
					</div>

					{/* macOS 使用系统原生窗体控制，避免与页面内自绘按钮重复。 */}
					{!isMac ? (
						<div className='flex h-full items-stretch overflow-hidden pl-3'>
							<div className='my-auto mr-2 h-6 w-px bg-(--sf-color-border-strong)' />
							<Button
								aria-label='最小化窗口'
								className='h-full w-11 rounded-none border-0 bg-transparent shadow-none ring-0 text-(--sf-color-shell-secondary) hover:bg-(--sf-color-shell-hover-strong) hover:text-foreground'
								onClick={() => void handleMinimize()}
								variant='ghost'
							>
								<MinusIcon className='size-3.5' />
							</Button>
							<Button
								aria-label={isMaximized ? '还原窗口' : '最大化窗口'}
								className='h-full w-11 rounded-none border-0 bg-transparent shadow-none ring-0 text-(--sf-color-shell-secondary) hover:bg-(--sf-color-shell-hover-strong) hover:text-foreground'
								onClick={() => void handleToggleMaximize()}
								variant='ghost'
							>
								<SquareIcon className={`size-3 ${isMaximized ? 'scale-[0.88]' : ''}`} />
							</Button>
							<Button
								aria-label='关闭窗口'
								className='h-full w-11 rounded-none border-0 bg-transparent shadow-none ring-0 hover:bg-[#E81123] hover:text-white'
								onClick={() => void handleClose()}
								variant='ghost'
							>
								<XIcon className='size-3.5' />
							</Button>
						</div>
					) : null}
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

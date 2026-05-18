import { startTransition, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import {
	buildScopedProjectPath,
	getSectionLabel,
	getScopeLabel,
	type ShellProjectLink,
} from '@/app/layouts/shell/config'
import type { ShellRouteHistoryEntry } from '@/app/layouts/shell/model/useShellRouteHistory'
import { HistoryDropdown } from '@/app/layouts/shell/header/HistoryDropdown'
import { NavBackForward } from '@/app/layouts/shell/header/NavBackForward'
import type { ShellSectionKey } from '@/app/layouts/shell/types'
import { GlobalSearchInput } from '@/features/global-search/ui/GlobalSearchInput'
import {
	resolveProjectSearchTargetPath,
	resolveTaskSearchTargetPath,
} from '@/features/global-search/model/searchNavigation'
import { useSearchOpenIntentStore } from '@/features/global-search/model/useSearchOpenIntentStore'
import type { SearchProjectItem, SearchTaskItem } from '@/shared/types'
import type { Scope, Space, TaskStatus } from '@/shared/types'
import { Avatar, AvatarFallback, AvatarImage, AvatarBadge } from '@/shared/ui/base/avatar'
import { Button } from '@/shared/ui/base/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/shared/ui/base/dropdown-menu'
import { useSidebar } from '@/shared/ui/base/sidebar-context'
import { cn } from '@/shared/lib/utils'
import {
	ChordHint,
	CommandMenu,
	ShortcutHelp,
	ShortcutTokens,
	type CommandMenuMode,
} from '@/features/command/ui'
import { getCommandShortcutTokens, type CommandChordSession } from '@/features/command/shortcuts'
import {
	COMMAND_IDS,
	type CommandContext,
	type CommandId,
	type CommandRuntime,
} from '@/features/command/core'
import type { TaskPriorityValue } from '@/features/task/model/taskPriority'
import {
	shellChromeAvatarClusterClass,
	shellChromeCommandDialogClass,
	shellChromeIconActionClass,
	shellChromeInlineGroupClass,
	shellChromeNavCircleButtonClass,
	shellChromePrimaryActionClass,
	shellChromeWindowControlsRowClass,
	shellChromeWindowControlClass,
} from '@/shared/ui/patterns/shell-chrome'
import { getCurrentWindow } from '@tauri-apps/api/window'
import {
	ChevronDownIcon,
	FolderPlusIcon,
	MinusIcon,
	PanelLeftCloseIcon,
	PanelLeftOpenIcon,
	SquarePenIcon,
	SquareIcon,
	XIcon,
} from 'lucide-react'

type ShellHeaderProps = {
	currentScope: Scope
	currentSpaceId: string | null
	activeSection: ShellSectionKey
	chordSession: CommandChordSession | null
	isCommandOpen: boolean
	isShortcutHelpOpen: boolean
	commandContext: CommandContext
	commandMenuMode: CommandMenuMode
	commandRuntime: CommandRuntime
	routeHistoryEntries: ShellRouteHistoryEntry[]
	canGoBack: boolean
	canGoForward: boolean
	spaces: Space[]
	projects: ShellProjectLink[]
	onCommandOpenChange: (open: boolean) => void
	onRunCommand: (id: CommandId) => void
	onShortcutHelpOpenChange: (open: boolean) => void
	onNavigateToHistoryEntry: (entry: ShellRouteHistoryEntry) => void
	onCloseDrawer: () => void
	onSelectTaskDate: (dueAt: string | null) => void
	onSelectTaskProject: (project: SearchProjectItem) => void
	onSelectTaskPriority: (priority: TaskPriorityValue) => void
	onSelectTaskStatus: (status: TaskStatus) => void
}

export function ShellHeader({
	currentScope,
	currentSpaceId,
	activeSection,
	chordSession,
	commandContext,
	commandMenuMode,
	commandRuntime,
	routeHistoryEntries,
	canGoBack,
	canGoForward,
	isCommandOpen,
	isShortcutHelpOpen,
	onCommandOpenChange,
	onRunCommand,
	onShortcutHelpOpenChange,
	onNavigateToHistoryEntry,
	onCloseDrawer,
	onSelectTaskDate,
	onSelectTaskProject,
	onSelectTaskPriority,
	onSelectTaskStatus,
	projects,
	spaces,
}: ShellHeaderProps) {
	const navigate = useNavigate()
	const location = useLocation()
	const [isMaximized, setIsMaximized] = useState(false)
	const isMac = useMemo(() => /Mac|iPhone|iPad|iPod/i.test(window.navigator.userAgent), [])
	const isWin = useMemo(
		() => /Windows/i.test(window.navigator.userAgent) || window.navigator.platform === 'Win32',
		[],
	)
	const setPendingTaskOpenIntent = useSearchOpenIntentStore(
		(state) => state.setPendingTaskOpenIntent,
	)
	const { toggleSidebar, visualState: sidebarVisualState, isMobile: isLayoutNarrow } = useSidebar()
	const sidebarToggleOpen =
		sidebarVisualState === 'desktop-expanded' || sidebarVisualState === 'mobile-open'
	const SidebarToggleIcon = sidebarToggleOpen ? PanelLeftCloseIcon : PanelLeftOpenIcon
	const taskCreateShortcutTokens = getCommandShortcutTokens(COMMAND_IDS.newQuickTask)

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

	const handleNavigate = (to: string) => {
		onCommandOpenChange(false)
		startTransition(() => {
			navigate(to)
		})
	}

	const handleOpenProjectFromSearch = (project: SearchProjectItem) => {
		onCloseDrawer()
		const targetPath = resolveProjectSearchTargetPath(project)
		startTransition(() => {
			navigate(targetPath)
		})
	}

	const handleOpenTaskFromSearch = (task: SearchTaskItem) => {
		onCloseDrawer()
		const targetPath = resolveTaskSearchTargetPath(task)
		setPendingTaskOpenIntent({
			taskId: task.id,
			targetPath,
		})

		if (location.pathname === targetPath) {
			return
		}

		startTransition(() => {
			navigate(targetPath)
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
			<div className='relative'>
				<header
					className={cn(
						'relative z-30 flex h-12 shrink-0 flex-nowrap items-center gap-3 bg-sf-shell pr-0',
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
									<Avatar className='size-7 shrink-0 rounded-lg ring-1 ring-sf-border-strong'>
										<AvatarImage
											alt='StoneFlow'
											className='rounded-lg'
											draggable={false}
											src='/StoneFlow.png'
										/>
										<AvatarFallback className='rounded-lg'>SF</AvatarFallback>
									</Avatar>
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
										shellChromeNavCircleButtonClass,
										'focus-visible:ring-0',
									)}
									data-slot='sidebar-trigger'
									onClick={toggleSidebar}
									size='icon-sm'
									type='button'
									variant='ghost'
								>
									<SidebarToggleIcon className='size-3.5' />
								</Button>

								<HistoryDropdown
									entries={routeHistoryEntries}
									spaces={spaces}
									onNavigate={onNavigateToHistoryEntry}
								/>
								<NavBackForward
									canGoBack={canGoBack}
									canGoForward={canGoForward}
									onBack={() => onRunCommand(COMMAND_IDS.goBack)}
									onForward={() => onRunCommand(COMMAND_IDS.goForward)}
								/>
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
							<div className='min-w-0 w-full' data-tauri-drag-region>
								<GlobalSearchInput
									onOpenProject={handleOpenProjectFromSearch}
									onOpenTask={handleOpenTaskFromSearch}
								/>
							</div>
						</div>
						<div
							className={`flex h-full shrink-0 items-center ${isMac ? 'gap-2 pl-1.5 pr-3' : 'gap-0 pl-0 pr-0'}`}
							data-slot='shell-header-right'
							data-tauri-drag-region
						>
							<div className={shellChromeInlineGroupClass} data-tauri-drag-region>
								<Button
									className={`${shellChromePrimaryActionClass} group-data-[sidebar-layout=mobile]/sidebar-wrapper:hidden`}
									onClick={() => onRunCommand(COMMAND_IDS.newQuickTask)}
									size='default'
									variant='outline'
								>
									<span>新建任务</span>
									{taskCreateShortcutTokens ? (
										<ShortcutTokens
											kbdClassName='h-5 min-w-5 rounded-sm border border-sf-border-subtle bg-background/90 px-1 text-[11px] text-sf-text-secondary'
											tokens={taskCreateShortcutTokens}
										/>
									) : null}
								</Button>
								<Button
									aria-label='新建任务'
									className={`hidden ${shellChromeIconActionClass} group-data-[sidebar-layout=mobile]/sidebar-wrapper:inline-flex`}
									onClick={() => onRunCommand(COMMAND_IDS.newQuickTask)}
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
												className={shellChromeIconActionClass}
												size='icon'
												variant='outline'
											>
												<ChevronDownIcon />
											</Button>
										</DropdownMenuTrigger>
										<DropdownMenuContent align='end'>
											<DropdownMenuGroup>
												<DropdownMenuItem onSelect={() => onRunCommand(COMMAND_IDS.newFullTask)}>
													<SquarePenIcon />
													新建任务
												</DropdownMenuItem>
												<DropdownMenuItem onSelect={() => onRunCommand(COMMAND_IDS.newProject)}>
													<FolderPlusIcon />
													新建项目
												</DropdownMenuItem>
											</DropdownMenuGroup>
										</DropdownMenuContent>
									</DropdownMenu>
								</div>
							</div>

							<div className={shellChromeAvatarClusterClass} data-tauri-drag-region>
								<Avatar className='size-7.5'>
									<AvatarImage alt='当前用户头像' src='/avatar.jpg' />
									<AvatarFallback>U</AvatarFallback>
									<AvatarBadge className='bg-green-600 dark:bg-green-800' />
								</Avatar>
							</div>

							{!isMac && (
								<div
									className='ml-2 h-5 w-px bg-sf-shell-text-secondary/20'
									data-tauri-drag-region
								/>
							)}

							{/* macOS 使用系统原生窗体控制，避免与页面内自绘按钮重复。 */}
							{!isMac ? (
								<div className={shellChromeWindowControlsRowClass} data-tauri-drag-region>
									<Button
										aria-label='最小化窗口'
										className={shellChromeWindowControlClass}
										onClick={() => void handleMinimize()}
										variant='ghost'
									>
										<MinusIcon className='size-3.5' />
									</Button>
									<Button
										aria-label={isMaximized ? '还原窗口' : '最大化窗口'}
										className={shellChromeWindowControlClass}
										onClick={() => void handleToggleMaximize()}
										variant='ghost'
									>
										<SquareIcon className={`size-3 ${isMaximized ? 'scale-[0.88]' : ''}`} />
									</Button>
									<Button
										aria-label='关闭窗口'
										className={`${shellChromeWindowControlClass} hover:bg-destructive hover:text-white`}
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
				<ChordHint session={chordSession} />
			</div>

			<CommandMenu
				className={shellChromeCommandDialogClass}
				context={commandContext}
				description={`${getScopeLabel(currentScope, spaces)} · ${getSectionLabel(activeSection)}`}
				mode={commandMenuMode}
				onOpenChange={onCommandOpenChange}
				onNavigateProject={(projectId) => {
					handleNavigate(buildScopedProjectPath(currentScope, projectId, currentSpaceId))
				}}
				onRunCommand={onRunCommand}
				onSelectTaskDate={onSelectTaskDate}
				onSelectTaskProject={onSelectTaskProject}
				onSelectTaskPriority={onSelectTaskPriority}
				onSelectTaskStatus={onSelectTaskStatus}
				onSelectProject={handleOpenProjectFromSearch}
				onSelectTask={handleOpenTaskFromSearch}
				open={isCommandOpen}
				projects={projects}
				runtime={commandRuntime}
				title='StoneFlow Command'
			/>
			<ShortcutHelp
				context={commandContext}
				description='所有快捷键和命令能力均来自当前 registry 与 keybinding。'
				onOpenChange={onShortcutHelpOpenChange}
				open={isShortcutHelpOpen}
				runtime={commandRuntime}
				title='StoneFlow 快捷键'
			/>
		</>
	)
}

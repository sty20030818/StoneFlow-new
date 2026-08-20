import { startTransition, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Avatar, Button, Tooltip } from '@heroui/react'

import { getSectionLabel, getScopeLabel, type ShellProjectLink } from '@/layout/config'
import { openProjectDetail } from '@/app/navigation'
import type { ShellRouteHistoryEntry } from '@/app/navigation'
import { HistoryDropdown } from '@/layout/header/HistoryDropdown'
import { NavBackForward } from '@/layout/header/NavBackForward'
import { UserAppMenu } from '@/layout/header/UserAppMenu'
import type { ShellSectionKey } from '@/layout/types'
import type { ShellSidebarController } from '@/layout/model/useShellSidebarController'
import { GlobalSearchInput } from '@/features/global-search'
import { resolveProjectSearchTargetPath } from '@/features/global-search'
import type { SearchProjectItem, SearchTaskItem } from '@/shared/types'
import type { Scope, Space, TaskStatus } from '@/shared/types'
import { cn } from '@/shared/lib/utils'
import {
	ChordHint,
	CommandMenu,
	CommandTooltipRow,
	ShortcutHelp,
	type CommandMenuMode,
} from '@/features/command'
import { type CommandChordSession } from '@/features/command'
import {
	COMMAND_IDS,
	type CommandContext,
	type CommandId,
	type CommandRuntime,
	type TaskPlacementTarget,
} from '@/features/command'
import type { TaskPriorityValue } from '@/features/task'
import {
	shellChromeAvatarClusterClass,
	shellChromeWindowControlsRowClass,
	shellChromeWindowControlClass,
} from '@/shared/components/patterns/shell-chrome'
import { getCurrentWindow } from '@tauri-apps/api/window'
import {
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
	onOpenChangelog: () => void
	onOpenAbout: () => void
	onNavigateToHistoryEntry: (entry: ShellRouteHistoryEntry) => void
	onCloseDrawer: () => void
	onOpenTaskPage: (task: SearchTaskItem) => void
	onSelectTaskDate: (dueAt: string | null) => void
	onSelectTaskPlacement: (target: TaskPlacementTarget) => void
	onSelectTaskPriority: (priority: TaskPriorityValue) => void
	onSelectTaskStatus: (status: TaskStatus) => void
	sidebar: ShellSidebarController
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
	onOpenChangelog,
	onOpenAbout,
	onNavigateToHistoryEntry,
	onCloseDrawer,
	onOpenTaskPage,
	onSelectTaskDate,
	onSelectTaskPlacement,
	onSelectTaskPriority,
	onSelectTaskStatus,
	projects,
	spaces,
	sidebar,
}: ShellHeaderProps) {
	const navigate = useNavigate({ from: '/' })
	const [isMaximized, setIsMaximized] = useState(false)
	const isMac = useMemo(() => /Mac|iPhone|iPad|iPod/i.test(window.navigator.userAgent), [])
	const isWin = useMemo(
		() => /Windows/i.test(window.navigator.userAgent) || window.navigator.platform === 'Win32',
		[],
	)
	const isLayoutNarrow = sidebar.isCompact
	const sidebarToggleOpen = sidebar.isCompact
		? sidebar.mobileSheetOpen
		: sidebar.mode === 'expanded'
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

	const handleNavigate = (to: string) => {
		onCommandOpenChange(false)
		startTransition(() => {
			void navigate({ to: to as never })
		})
	}

	const handleOpenProjectFromSearch = (project: SearchProjectItem) => {
		onCloseDrawer()
		const targetPath = resolveProjectSearchTargetPath(project)
		startTransition(() => {
			void navigate({ to: targetPath as never })
		})
	}

	const handleOpenTaskFromSearch = (task: SearchTaskItem) => {
		onOpenTaskPage(task)
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

	const sidebarToggleControl = (
		<Tooltip>
			<Button
				aria-label={sidebarToggleOpen ? '收起侧边栏' : '展开侧边栏'}
				className='shrink-0'
				data-slot='sidebar-trigger'
				isIconOnly
				onPress={() => onRunCommand(COMMAND_IDS.layoutToggleSidebar)}
				size='sm'
				type='button'
				variant='ghost'
			>
				<SidebarToggleIcon className='size-3.5' />
			</Button>
			<Tooltip.Content>
				<CommandTooltipRow
					commandId={COMMAND_IDS.layoutToggleSidebar}
					label={sidebarToggleOpen ? '收起侧边栏' : '展开侧边栏'}
				/>
			</Tooltip.Content>
		</Tooltip>
	)

	return (
		<>
			<div className='relative'>
				<header
					className={cn(
						'relative z-30 flex h-12 shrink-0 flex-nowrap items-center gap-3 bg-surface-secondary pr-0',
						// 左条整块 <640 不渲染时，为刘海/窗口区补左侧内边，避免主带贴边
						!isAtLeastSm && (isMac ? 'pl-24' : 'pl-3'),
					)}
					data-tauri-drag-region
					onMouseDownCapture={handleHeaderMouseDownCapture}
				>
					{isAtLeastSm ? (
						<div
							className={cn(
								'flex h-full shrink-0 flex-nowrap items-center',
								'group-data-[sidebar-mode=expanded]/sidebar-wrapper:w-(--sidebar-width) group-data-[sidebar-mode=expanded]/sidebar-wrapper:min-w-0',
								'group-data-[sidebar-mode=expanded]/sidebar-wrapper:pr-3',
								'group-data-[sidebar-mode=icon]/sidebar-wrapper:w-max group-data-[sidebar-mode=compact]/sidebar-wrapper:w-max',
								isMac
									? 'pl-24 group-data-[sidebar-mode=expanded]/sidebar-wrapper:pl-0'
									: 'pl-5.5 group-data-[sidebar-mode=expanded]/sidebar-wrapper:pl-3',
								!isMac && 'group-data-[sidebar-mode=icon]/sidebar-wrapper:pl-3',
								!isMac && 'group-data-[sidebar-mode=compact]/sidebar-wrapper:pl-3',
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
									<Avatar className='size-7 shrink-0 rounded-lg ring-1 ring-border'>
										<Avatar.Image
											alt='StoneFlow'
											className='rounded-lg'
											draggable={false}
											src='/StoneFlow.png'
										/>
										<Avatar.Fallback className='rounded-lg'>SF</Avatar.Fallback>
									</Avatar>
								) : null}

								{/* 展开态把导航键推到 sidebar 右边界，拖拽空白只承担窗体 chrome。 */}
								<div
									className='hidden h-full min-w-0 flex-1 self-stretch group-data-[sidebar-mode=expanded]/sidebar-wrapper:block group-data-[sidebar-mode=icon]/sidebar-wrapper:hidden group-data-[sidebar-mode=compact]/sidebar-wrapper:hidden'
									data-slot='shell-header-left-drag'
									data-tauri-drag-region
								/>
							</div>

							<div
								className='flex shrink-0 items-center gap-1'
								data-slot='shell-header-nav'
								data-tauri-drag-region
							>
								{sidebar.mode !== 'expanded' ? sidebarToggleControl : null}

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
						className='flex min-h-0 min-w-0 flex-1 flex-nowrap items-center gap-3 px-0 group-data-[sidebar-mode=compact]/sidebar-wrapper:min-w-0'
						data-slot='shell-header-main'
						data-tauri-drag-region
					>
						{!isAtLeastSm && sidebar.isCompact ? sidebarToggleControl : null}
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
							{/* 单一创建入口：与 C 键同源 quick task；完整任务/项目走 Command / 侧栏 */}
							<Tooltip>
								<Button
									aria-label='快速新建任务'
									isIconOnly
									onPress={() => onRunCommand(COMMAND_IDS.newQuickTask)}
									size='sm'
									type='button'
									variant='outline'
								>
									<SquarePenIcon className='size-3.5' />
								</Button>
								<Tooltip.Content>
									<CommandTooltipRow commandId={COMMAND_IDS.newQuickTask} label='快速新建任务' />
								</Tooltip.Content>
							</Tooltip>

							<div className={shellChromeAvatarClusterClass}>
								<UserAppMenu
									isSettingsActive={activeSection === 'settings'}
									onOpenAbout={onOpenAbout}
									onOpenChangelog={onOpenChangelog}
									onRunCommand={onRunCommand}
								/>
							</div>

							{!isMac && <div className='ml-2 h-5 w-px bg-muted/20' data-tauri-drag-region />}

							{/* macOS 使用系统原生窗体控制，避免与页面内自绘按钮重复。 */}
							{!isMac ? (
								<div className={shellChromeWindowControlsRowClass} data-tauri-drag-region>
									<Tooltip>
										<Button
											aria-label='最小化窗口'
											className={shellChromeWindowControlClass}
											isIconOnly
											onPress={() => void handleMinimize()}
											size='sm'
											variant='ghost'
										>
											<MinusIcon className='size-3.5' />
										</Button>
										<Tooltip.Content>最小化窗口</Tooltip.Content>
									</Tooltip>
									<Tooltip>
										<Button
											aria-label={isMaximized ? '还原窗口' : '最大化窗口'}
											className={shellChromeWindowControlClass}
											isIconOnly
											onPress={() => void handleToggleMaximize()}
											size='sm'
											variant='ghost'
										>
											<SquareIcon className={`size-3 ${isMaximized ? 'scale-[0.88]' : ''}`} />
										</Button>
										<Tooltip.Content>{isMaximized ? '还原窗口' : '最大化窗口'}</Tooltip.Content>
									</Tooltip>
									<Tooltip>
										<Button
											aria-label='关闭窗口'
											className={`${shellChromeWindowControlClass} hover:bg-danger hover:text-danger-foreground`}
											isIconOnly
											onPress={() => void handleClose()}
											size='sm'
											variant='ghost'
										>
											<XIcon className='size-3.5' />
										</Button>
										<Tooltip.Content>关闭窗口</Tooltip.Content>
									</Tooltip>
								</div>
							) : null}
						</div>
					</div>
				</header>
				<ChordHint session={chordSession} />
			</div>

			<CommandMenu
				context={commandContext}
				description={`${getScopeLabel(currentScope, spaces)} · ${getSectionLabel(activeSection)}`}
				mode={commandMenuMode}
				onOpenChange={onCommandOpenChange}
				onNavigateProject={(projectId) => {
					handleNavigate(
						openProjectDetail(projectId, {
							scope: currentScope,
							fallbackSpaceId: currentSpaceId,
						}),
					)
				}}
				onSelectTaskDate={onSelectTaskDate}
				onSelectTaskPlacement={onSelectTaskPlacement}
				onSelectTaskPriority={onSelectTaskPriority}
				onSelectTaskStatus={onSelectTaskStatus}
				onSelectProject={handleOpenProjectFromSearch}
				onSelectTask={handleOpenTaskFromSearch}
				open={isCommandOpen}
				projects={projects}
				runtime={commandRuntime}
				spaces={spaces}
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

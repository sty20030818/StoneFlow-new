import { startTransition, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import {
	getSectionLabel,
	getSpaceLabel,
	SHELL_NAV_ITEMS,
	type ShellProjectLink,
} from '@/app/layouts/shell/config'
import type { ShellDrawerKind, ShellSectionKey } from '@/app/layouts/shell/types'
import { GlobalSearchInput } from '@/features/global-search/ui/GlobalSearchInput'
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
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/shared/ui/base/dropdown-menu'
import { Kbd } from '@/shared/ui/base/kbd'
import { getCurrentWindow } from '@tauri-apps/api/window'
import {
	ChevronDownIcon,
	FolderPlusIcon,
	MinusIcon,
	PlusIcon,
	SearchIcon,
	SquareIcon,
	XIcon,
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
				className='relative flex h-12 shrink-0 items-center bg-(--sf-color-shell-chrome) px-2'
				onMouseDownCapture={handleHeaderMouseDownCapture}
			>
				<div
					className={`flex h-full w-(--sf-shell-sidebar-width) items-center gap-2 px-3 ${isMac ? 'pl-24' : ''}`}
					data-tauri-drag-region
					onDoubleClick={() => {
						if (!isMac) {
							void handleToggleMaximize()
						}
					}}
				>
					<div className='flex size-5 items-center justify-center rounded-[0.3125rem] bg-black text-[10px] font-semibold text-white'>
						S
					</div>
					<span className='text-[13px] font-medium text-foreground'>StoneFlow</span>
				</div>

				<div className='flex min-w-0 flex-1 items-center gap-2 px-2'>
					<div
						className='min-w-4 flex-1 self-stretch'
						data-tauri-drag-region
						onDoubleClick={() => {
							if (!isMac) {
								void handleToggleMaximize()
							}
						}}
					/>

					<div className='min-w-0 w-full max-w-[34rem] shrink'>
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
					className={`flex h-full shrink-0 items-center ${isMac ? 'gap-2 px-1.5' : 'gap-0 pl-2 pr-0'}`}
				>
					<div className='flex items-center gap-1.5'>
						<Button
							className='border-black/10 bg-white px-3 text-[12px] font-medium text-foreground shadow-[0_1px_0_rgba(255,255,255,0.8),0_10px_20px_rgba(15,23,42,0.06)] hover:bg-[#fffdf8]'
							onClick={onOpenTaskCreateDialog}
							size='default'
							variant='outline'
						>
							<PlusIcon data-icon='inline-start' />
							<span>新建任务</span>
							<Kbd>C</Kbd>
						</Button>

						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									aria-label='打开创建菜单'
									className='border-black/10 bg-white text-(--sf-color-shell-secondary) shadow-[0_1px_0_rgba(255,255,255,0.8),0_10px_20px_rgba(15,23,42,0.06)] hover:bg-[#fffdf8] hover:text-foreground'
									size='icon'
									variant='outline'
								>
									<ChevronDownIcon />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align='end' className='w-44'>
								<DropdownMenuGroup>
									<DropdownMenuItem onSelect={onOpenTaskCreateDialog}>
										<PlusIcon />
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

					{/* macOS 使用系统原生窗体控制，避免与页面内自绘按钮重复。 */}
					{!isMac ? (
						<div className='flex h-full items-stretch pl-3'>
							<div className='my-auto mr-3 h-5 w-px bg-black/10' />
							<Button
								className='size-11 rounded-none border-0 bg-transparent shadow-none ring-0 text-(--sf-color-shell-secondary) hover:bg-black/14 hover:text-foreground'
								onClick={() => void handleMinimize()}
								variant='ghost'
							>
								<MinusIcon className='size-3.5' />
							</Button>
							<Button
								className='size-11 rounded-none border-0 bg-transparent shadow-none ring-0 text-(--sf-color-shell-secondary) hover:bg-black/14 hover:text-foreground'
								onClick={() => void handleToggleMaximize()}
								variant='ghost'
							>
								<SquareIcon className={`size-3 ${isMaximized ? 'scale-[0.88]' : ''}`} />
							</Button>
							<Button
								className='size-11 rounded-none border-0 bg-transparent shadow-none ring-0 hover:bg-[#E81123] hover:text-white'
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
								<PlusIcon />
								创建任务
								<CommandShortcut>↵</CommandShortcut>
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
							{SHELL_NAV_ITEMS.map((item) => (
								<CommandItem
									key={item.key}
									onSelect={() => handleNavigate(item.to(currentSpaceId))}
									value={item.label}
								>
									<item.icon />
									{item.label}
									{item.badge ? <CommandShortcut>{item.badge}</CommandShortcut> : null}
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
										{project.badge ? <CommandShortcut>{project.badge}</CommandShortcut> : null}
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

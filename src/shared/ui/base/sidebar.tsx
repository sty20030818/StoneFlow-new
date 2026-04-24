import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'
import { PanelLeftCloseIcon, PanelLeftOpenIcon } from 'lucide-react'

import { cn } from '@/shared/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/base/tooltip'

// Shell 响应式断点：>=1024 视作 desktop（桌面态），<1024 视作 mobile（使用 drawer）
const SIDEBAR_DESKTOP_BREAKPOINT_PX = 1024
// 断点切换的防抖窗口，避免拖拽窗口过程中反复切换造成闪烁
const SIDEBAR_LAYOUT_DEBOUNCE_MS = 200
// 桌面态展开/折叠的持久化 key，刷新后保留用户上次的选择
const SIDEBAR_STATE_STORAGE_KEY = 'sf:sidebar:state'
// 桌面态可变宽（px）
const SIDEBAR_WIDTH_STORAGE_KEY = 'sf:sidebar:width'
const SIDEBAR_WIDTH_MIN = 220
const SIDEBAR_WIDTH_MAX = 330
// 桌面态切换快捷键（对齐 VS Code / shadcn 惯例）
const SIDEBAR_TOGGLE_SHORTCUT_KEY = 'b'

type SidebarLayoutMode = 'desktop' | 'mobile'
type SidebarDesktopState = 'expanded' | 'collapsed'

type SidebarContextValue = {
	layoutMode: SidebarLayoutMode
	sidebarState: SidebarDesktopState
	sidebarWidth: number
	drawerOpen: boolean
	isMobile: boolean
	toggleSidebar: () => void
	setDrawerOpen: (open: boolean) => void
	setSidebarWidth: (width: number) => void
}

const SidebarContext = React.createContext<SidebarContextValue | null>(null)

function readStoredSidebarState(): SidebarDesktopState {
	if (typeof window === 'undefined') {
		return 'expanded'
	}

	try {
		const stored = window.localStorage.getItem(SIDEBAR_STATE_STORAGE_KEY)
		if (stored === 'collapsed' || stored === 'expanded') {
			return stored
		}
	} catch {
		// 隐私模式或存储不可用时保底
	}
	return 'expanded'
}

function clampSidebarWidth(width: number) {
	return Math.max(SIDEBAR_WIDTH_MIN, Math.min(SIDEBAR_WIDTH_MAX, Math.round(width)))
}

function readStoredSidebarWidth() {
	if (typeof window === 'undefined') {
		return 245
	}

	try {
		const stored = window.localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY)
		const parsed = stored ? Number.parseInt(stored, 10) : Number.NaN
		if (Number.isFinite(parsed)) {
			return clampSidebarWidth(parsed)
		}
	} catch {
		// 存储不可用时保底
	}

	return 245
}

function writeStoredSidebarWidth(width: number) {
	if (typeof window === 'undefined') {
		return
	}
	try {
		window.localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(clampSidebarWidth(width)))
	} catch {
		// 存储失败时静默
	}
}

function writeStoredSidebarState(state: SidebarDesktopState) {
	if (typeof window === 'undefined') {
		return
	}
	try {
		window.localStorage.setItem(SIDEBAR_STATE_STORAGE_KEY, state)
	} catch {
		// 存储失败时静默，桌面态记忆只是增强体验
	}
}

// 根据当前窗口宽度判断布局模式；SSR/测试环境下保守返回 desktop
function resolveLayoutMode(): SidebarLayoutMode {
	if (typeof window === 'undefined') {
		return 'desktop'
	}
	return window.matchMedia(`(min-width: ${SIDEBAR_DESKTOP_BREAKPOINT_PX}px)`).matches
		? 'desktop'
		: 'mobile'
}

function SidebarProvider({ className, children, ...props }: React.ComponentProps<'div'>) {
	const [layoutMode, setLayoutMode] = React.useState<SidebarLayoutMode>(() => resolveLayoutMode())
	const [sidebarState, setSidebarState] = React.useState<SidebarDesktopState>(() =>
		readStoredSidebarState(),
	)
	const [sidebarWidth, setSidebarWidth] = React.useState(() => readStoredSidebarWidth())
	const [drawerOpen, setDrawerOpen] = React.useState(false)

	// 监听窗口宽度变化，配合 debounce 规避拖拽过程中的高频切换
	React.useEffect(() => {
		if (typeof window === 'undefined') return

		const mediaQuery = window.matchMedia(`(min-width: ${SIDEBAR_DESKTOP_BREAKPOINT_PX}px)`)
		let timer: number | null = null

		const commitMode = (nextMode: SidebarLayoutMode) => {
			setLayoutMode((prev) => {
				if (prev === nextMode) return prev
				// 离开 mobile 返回 desktop 时，drawer 不再需要开启
				if (nextMode === 'desktop') {
					setDrawerOpen(false)
				}
				return nextMode
			})
		}

		const handleChange = () => {
			if (timer !== null) {
				window.clearTimeout(timer)
			}
			timer = window.setTimeout(() => {
				commitMode(mediaQuery.matches ? 'desktop' : 'mobile')
				timer = null
			}, SIDEBAR_LAYOUT_DEBOUNCE_MS)
		}

		mediaQuery.addEventListener('change', handleChange)
		return () => {
			mediaQuery.removeEventListener('change', handleChange)
			if (timer !== null) {
				window.clearTimeout(timer)
			}
		}
	}, [])

	// 每次变化时写回本地存储；只在桌面态这项决策是有效的
	React.useEffect(() => {
		writeStoredSidebarState(sidebarState)
	}, [sidebarState])

	React.useEffect(() => {
		writeStoredSidebarWidth(sidebarWidth)
	}, [sidebarWidth])

	const toggleSidebar = React.useCallback(() => {
		if (layoutMode === 'mobile') {
			setDrawerOpen((prev) => !prev)
			return
		}
		setSidebarState((prev) => (prev === 'expanded' ? 'collapsed' : 'expanded'))
	}, [layoutMode])

	// 全局快捷键：Cmd/Ctrl + B，忽略输入态，防止覆盖文字输入时的组合键
	React.useEffect(() => {
		if (typeof window === 'undefined') return

		const handleKeyDown = (event: KeyboardEvent) => {
			if (!(event.metaKey || event.ctrlKey)) return
			if (event.key.toLowerCase() !== SIDEBAR_TOGGLE_SHORTCUT_KEY) return

			const target = event.target
			if (
				target instanceof HTMLElement &&
				(target.isContentEditable ||
					target.tagName === 'INPUT' ||
					target.tagName === 'TEXTAREA' ||
					target.tagName === 'SELECT')
			) {
				return
			}

			event.preventDefault()
			toggleSidebar()
		}

		window.addEventListener('keydown', handleKeyDown)
		return () => window.removeEventListener('keydown', handleKeyDown)
	}, [toggleSidebar])

	const setSidebarWidthClamped = React.useCallback((width: number) => {
		setSidebarWidth(clampSidebarWidth(width))
	}, [])

	const value = React.useMemo<SidebarContextValue>(
		() => ({
			layoutMode,
			sidebarState,
			sidebarWidth,
			drawerOpen,
			isMobile: layoutMode === 'mobile',
			toggleSidebar,
			setDrawerOpen,
			setSidebarWidth: setSidebarWidthClamped,
		}),
		[layoutMode, sidebarState, sidebarWidth, drawerOpen, toggleSidebar, setSidebarWidthClamped],
	)

	// 合并为单一 data-sidebar-mode，避免 Tailwind 链式 group-data variant 需要两个嵌套 group 的坑
	const mode =
		layoutMode === 'mobile'
			? drawerOpen
				? 'mobile-open'
				: 'mobile-closed'
			: sidebarState === 'expanded'
				? 'desktop-expanded'
				: 'desktop-collapsed'

	return (
		<SidebarContext.Provider value={value}>
			<div
				className={cn('group/sidebar-wrapper', className)}
				data-slot='sidebar-provider'
				data-sidebar-layout={layoutMode}
				data-sidebar-state={sidebarState}
				data-sidebar-mode={mode}
				data-sidebar-resizing='false'
				data-sidebar-drawer={drawerOpen ? 'open' : 'closed'}
				style={
					{
						// 让布局层（Header/Footer/Sidebar）共享同一份“当前 sidebar 宽度”
						'--sf-shell-sidebar-width-current': `${sidebarWidth}px`,
					} as React.CSSProperties
				}
				{...props}
			>
				{children}
			</div>
		</SidebarContext.Provider>
	)
}

function useSidebar() {
	const context = React.useContext(SidebarContext)

	if (!context) {
		throw new Error('useSidebar 必须运行在 SidebarProvider 内部')
	}

	return context
}

type SidebarProps = React.ComponentProps<'aside'> & {
	collapsible?: 'icon' | 'none'
}

/**
 * Sidebar 主容器：
 * - desktop + collapsible="icon" 时，宽度在 expanded/collapsed 之间过渡
 * - desktop + collapsible="none" 时，固定宽度不响应 state
 * - mobile 时，以 fixed drawer 形式出现，伴随遮罩
 */
function Sidebar({ className, collapsible = 'none', children, ...props }: SidebarProps) {
	const { layoutMode, drawerOpen, setDrawerOpen } = useSidebar()

	const collapsibleEnabled = collapsible === 'icon'

	if (layoutMode === 'mobile') {
		// 点击遮罩关闭抽屉；抽屉本身保持 sidebar 原本的完整宽度
		return (
			<>
				<div
					aria-hidden='true'
					className={cn(
						// 遮罩覆盖整个窗口（包含 Header），用于“压住”主界面
						// 顶部留出与 Header 等高的区域：不压暗 traffic light（macOS overlay titlebar 场景）
						'fixed inset-0 z-40 bg-black/30 pt-12 opacity-0 transition-opacity duration-200 ease-out pointer-events-none',
						drawerOpen && 'opacity-100 pointer-events-auto',
					)}
					data-slot='sidebar-overlay'
					onClick={() => setDrawerOpen(false)}
				/>
				<aside
					aria-hidden={!drawerOpen}
					className={cn(
						// 抽屉覆盖 Header；顶部用 `pt-12` 留出 traffic light 区域（仍使用 chrome 底色，不再做透明分层）
						// mobile：固定 220px 宽（不走桌面可变宽变量）
						'fixed inset-y-0 left-0 z-50 flex w-55 flex-col overflow-hidden bg-(--sf-color-shell-chrome) pt-12 shadow-(--sf-shadow-float) transition-transform duration-200 ease-out',
						drawerOpen ? 'translate-x-0' : '-translate-x-full',
						className,
					)}
					data-slot='sidebar'
					data-collapsible='none'
					{...props}
				>
					{children}
				</aside>
			</>
		)
	}

	return (
		<aside
			className={cn(
				'relative flex h-full shrink-0 flex-col overflow-hidden bg-(--sf-color-shell-chrome)',
				// desktop 展开态用 current width；折叠态用 icon width
				collapsibleEnabled
					? 'w-(--sf-shell-sidebar-width-current) transition-[width] duration-200 ease-out group-data-[sidebar-mode=desktop-collapsed]/sidebar-wrapper:w-(--sf-shell-sidebar-width-icon) group-data-[sidebar-resizing=true]/sidebar-wrapper:transition-none'
					: 'w-(--sf-shell-sidebar-width-current) group-data-[sidebar-resizing=true]/sidebar-wrapper:transition-none',
				className,
			)}
			data-slot='sidebar'
			data-collapsible={collapsible}
			{...props}
		>
			{children}
		</aside>
	)
}

function SidebarHeader({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			className={cn('flex shrink-0 flex-col', className)}
			data-slot='sidebar-header'
			{...props}
		/>
	)
}

function SidebarContent({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			className={cn('flex min-h-0 flex-1 flex-col overflow-y-auto', className)}
			data-slot='sidebar-content'
			{...props}
		/>
	)
}

function SidebarFooter({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			className={cn('flex shrink-0 flex-col', className)}
			data-slot='sidebar-footer'
			{...props}
		/>
	)
}

function SidebarGroup({ className, ...props }: React.ComponentProps<'section'>) {
	return (
		<section
			className={cn(
				// 展开态与 Header 对齐用 px-3；折叠 rail 仅 3rem 宽，若仍用 px-3 则内容区 < w-8，mx-auto 无法真正居中
				'flex flex-col gap-1 px-3 group-data-[sidebar-mode=desktop-collapsed]/sidebar-wrapper:px-2',
				className,
			)}
			data-slot='sidebar-group'
			{...props}
		/>
	)
}

function SidebarGroupLabel({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			className={cn(
				'px-2.5 text-[10.5px] font-medium tracking-[0.06em] text-(--sf-color-shell-tertiary) uppercase',
				className,
			)}
			data-slot='sidebar-group-label'
			{...props}
		/>
	)
}

function SidebarGroupAction({
	className,
	asChild = false,
	...props
}: React.ComponentProps<'button'> & {
	asChild?: boolean
}) {
	const Comp = asChild ? Slot.Root : 'button'

	return (
		<Comp
			className={cn(
				'inline-flex size-7 shrink-0 items-center justify-center rounded-md border border-transparent text-(--sf-color-shell-secondary) transition-colors hover:bg-(--sf-color-shell-hover) hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/18 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*="size-"])]:size-3.5',
				className,
			)}
			data-slot='sidebar-group-action'
			{...props}
		/>
	)
}

function SidebarGroupContent({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			className={cn('flex flex-col gap-1', className)}
			data-slot='sidebar-group-content'
			{...props}
		/>
	)
}

function SidebarMenu({ className, ...props }: React.ComponentProps<'ul'>) {
	return (
		<ul className={cn('flex flex-col gap-0.5', className)} data-slot='sidebar-menu' {...props} />
	)
}

function SidebarMenuItem({ className, ...props }: React.ComponentProps<'li'>) {
	return (
		<li
			className={cn('group/sidebar-menu-item', className)}
			data-slot='sidebar-menu-item'
			{...props}
		/>
	)
}

// icon 态下隐藏文字/末端元素、压成正方形；展开态恢复正常
// 带 data-sidebar-keep 的子 span 会在 icon 态保留（例如 Space 的 icon badge）
const sidebarMenuButtonVariants = cva(
	'flex w-full min-w-0 items-center gap-2 rounded-md border border-transparent text-(--sf-color-shell-secondary) outline-none transition-colors select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/18 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*="size-"])]:size-3.5 group-data-[sidebar-mode=desktop-collapsed]/sidebar-wrapper:mx-auto group-data-[sidebar-mode=desktop-collapsed]/sidebar-wrapper:justify-center group-data-[sidebar-mode=desktop-collapsed]/sidebar-wrapper:px-0 group-data-[sidebar-mode=desktop-collapsed]/sidebar-wrapper:[&>span:not([data-sidebar-keep])]:hidden',
	{
		variants: {
			size: {
				default:
					'h-8 px-2.5 text-[13px] group-data-[sidebar-mode=desktop-collapsed]/sidebar-wrapper:w-8',
				sm: 'h-7 px-2 text-[12px] group-data-[sidebar-mode=desktop-collapsed]/sidebar-wrapper:w-7',
				// Space 切换（lg）在展开态更高；折叠为 icon-only 时仍保持 lg 的行高，避免与其它 h-8 入口产生上下错位
				lg: 'h-10 px-2.5 text-[14px] group-data-[sidebar-mode=desktop-collapsed]/sidebar-wrapper:w-8',
			},
			isActive: {
				true: 'border-(--sf-color-border-subtle) bg-sidebar-accent font-medium text-foreground shadow-(--sf-shadow-panel)',
				false: 'hover:bg-(--sf-color-shell-hover) hover:text-foreground',
			},
		},
		defaultVariants: {
			size: 'default',
			isActive: false,
		},
	},
)

type SidebarMenuButtonProps = React.ComponentProps<'button'> &
	VariantProps<typeof sidebarMenuButtonVariants> & {
		asChild?: boolean
		/** icon 折叠态的浮层提示文案；展开态下忽略 */
		tooltip?: string
	}

function SidebarMenuButton({
	className,
	asChild = false,
	isActive = false,
	size = 'default',
	tooltip,
	children,
	...props
}: SidebarMenuButtonProps) {
	const Comp = asChild ? Slot.Root : 'button'
	const button = (
		<Comp
			className={cn(sidebarMenuButtonVariants({ className, isActive, size }))}
			data-active={isActive}
			data-slot='sidebar-menu-button'
			{...props}
		>
			{children}
		</Comp>
	)

	if (!tooltip) {
		return button
	}

	// 展开态隐藏 tooltip，避免和原文重复；折叠/抽屉关闭态才展示
	return (
		<Tooltip>
			<TooltipTrigger asChild>{button}</TooltipTrigger>
			<TooltipContent
				className='group-data-[sidebar-mode=desktop-expanded]/sidebar-wrapper:hidden group-data-[sidebar-layout=mobile]/sidebar-wrapper:hidden'
				side='right'
				sideOffset={8}
			>
				{tooltip}
			</TooltipContent>
		</Tooltip>
	)
}

function SidebarMenuAction({
	className,
	asChild = false,
	...props
}: React.ComponentProps<'button'> & {
	asChild?: boolean
}) {
	const Comp = asChild ? Slot.Root : 'button'

	return (
		<Comp
			className={cn(
				'inline-flex size-7 shrink-0 items-center justify-center rounded-md border border-transparent text-(--sf-color-shell-secondary) transition-colors hover:bg-(--sf-color-shell-hover) hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/18 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*="size-"])]:size-3.5',
				className,
			)}
			data-slot='sidebar-menu-action'
			{...props}
		/>
	)
}

function SidebarMenuBadge({ className, ...props }: React.ComponentProps<'span'>) {
	return (
		<span
			className={cn(
				'ml-auto shrink-0 text-[12px] font-semibold text-(--sf-color-shell-secondary) group-data-[sidebar-mode=desktop-collapsed]/sidebar-wrapper:hidden',
				className,
			)}
			data-slot='sidebar-menu-badge'
			{...props}
		/>
	)
}

function SidebarMenuSub({ className, ...props }: React.ComponentProps<'ul'>) {
	return (
		<ul
			className={cn(
				'relative ml-5 flex flex-col gap-0.5 border-l border-(--sf-color-border-subtle) pl-3 group-data-[sidebar-mode=desktop-collapsed]/sidebar-wrapper:hidden',
				className,
			)}
			data-slot='sidebar-menu-sub'
			{...props}
		/>
	)
}

function SidebarMenuSubItem({ className, ...props }: React.ComponentProps<'li'>) {
	return <li className={cn('relative', className)} data-slot='sidebar-menu-sub-item' {...props} />
}

const sidebarMenuSubButtonVariants = cva(
	'relative flex w-full min-w-0 items-center gap-2 rounded-md border border-transparent text-(--sf-color-shell-secondary) outline-none transition-colors select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/18 disabled:pointer-events-none disabled:opacity-50 before:absolute before:-left-3 before:top-1/2 before:h-px before:w-3 before:-translate-y-1/2 before:bg-(--sf-color-border-subtle) [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*="size-"])]:size-3.5',
	{
		variants: {
			size: {
				default: 'h-8 px-2.5 text-[13px]',
				sm: 'h-7 px-2 text-[12px]',
			},
			isActive: {
				true: 'border-(--sf-color-border-subtle) bg-sidebar-accent font-medium text-foreground shadow-(--sf-shadow-panel)',
				false: 'hover:bg-(--sf-color-shell-hover) hover:text-foreground',
			},
		},
		defaultVariants: {
			size: 'default',
			isActive: false,
		},
	},
)

function SidebarMenuSubButton({
	className,
	asChild = false,
	isActive = false,
	size = 'default',
	...props
}: React.ComponentProps<'a'> &
	VariantProps<typeof sidebarMenuSubButtonVariants> & {
		asChild?: boolean
	}) {
	const Comp = asChild ? Slot.Root : 'a'

	return (
		<Comp
			className={cn(sidebarMenuSubButtonVariants({ className, isActive, size }))}
			data-active={isActive}
			data-slot='sidebar-menu-sub-button'
			{...props}
		/>
	)
}

/**
 * SidebarRail：贴在 sidebar 右边缘的竖向触发条，点击切换 expanded/collapsed。
 * - 仅在 desktop 模式可见；mobile 下被 group 选择器隐藏
 * - 默认透明，hover 时才显示一条高亮线，不干扰其他交互
 */
function SidebarRail({ className, ...props }: React.ComponentProps<'button'>) {
	const { toggleSidebar, sidebarState, sidebarWidth, setSidebarWidth, layoutMode } = useSidebar()
	const dragStateRef = React.useRef<{
		startX: number
		startWidth: number
		dragged: boolean
		lastWidth: number
		raf: number | null
	}>({ startX: 0, startWidth: sidebarWidth, dragged: false, lastWidth: sidebarWidth, raf: null })

	return (
		<button
			aria-label={sidebarState === 'expanded' ? '收起侧边栏' : '展开侧边栏'}
			className={cn(
				// rail 热区跨过分界线左右各一半（更好命中，也让 hover 高亮“两边都亮”）
				'group/sidebar-rail absolute inset-y-0 right-0 z-20 flex w-8 translate-x-1/2 items-stretch select-none group-data-[sidebar-layout=mobile]/sidebar-wrapper:hidden',
				// 可变宽 resize 光标：左右一致
				layoutMode === 'mobile' || sidebarState !== 'expanded'
					? 'cursor-pointer'
					: 'cursor-col-resize',
				className,
			)}
			data-slot='sidebar-rail'
			onClick={() => {
				// 如果刚刚发生过拖拽手势，则忽略 click（避免拖拽结束后又触发一次切换）
				if (dragStateRef.current.dragged) {
					dragStateRef.current.dragged = false
					return
				}
				toggleSidebar()
			}}
			onPointerDown={(event) => {
				// mobile：抽屉宽度固定，不允许拖拽改宽
				if (layoutMode === 'mobile' || sidebarState !== 'expanded') return

				dragStateRef.current.startWidth = sidebarWidth
				dragStateRef.current.lastWidth = sidebarWidth
				dragStateRef.current.startX = event.clientX
				dragStateRef.current.dragged = false
				;(event.currentTarget as HTMLButtonElement).setPointerCapture(event.pointerId)

				const providerEl = (event.currentTarget as HTMLElement).closest(
					'[data-slot="sidebar-provider"]',
				) as HTMLElement | null
				if (providerEl) {
					providerEl.dataset.sidebarResizing = 'true'
				}
			}}
			onPointerMove={(event) => {
				if (layoutMode === 'mobile' || sidebarState !== 'expanded') return

				// 仅当按住 rail 拖动时才处理
				if (!(event.currentTarget as HTMLButtonElement).hasPointerCapture(event.pointerId)) {
					return
				}

				const deltaX = event.clientX - dragStateRef.current.startX
				const threshold = 6

				if (Math.abs(deltaX) > threshold) {
					dragStateRef.current.dragged = true
				}

				const nextWidth = dragStateRef.current.startWidth + deltaX
				dragStateRef.current.lastWidth = nextWidth

				// 拖动时不走 React setState（避免整棵布局重渲染导致卡顿），只更新 CSS 变量做即时反馈
				const providerEl = (event.currentTarget as HTMLElement).closest(
					'[data-slot="sidebar-provider"]',
				) as HTMLElement | null
				if (!providerEl) return

				if (dragStateRef.current.raf !== null) return
				dragStateRef.current.raf = window.requestAnimationFrame(() => {
					const clamped = clampSidebarWidth(dragStateRef.current.lastWidth)
					providerEl.style.setProperty('--sf-shell-sidebar-width-current', `${clamped}px`)
					dragStateRef.current.raf = null
				})
			}}
			onPointerUp={(event) => {
				const providerEl = (event.currentTarget as HTMLElement).closest(
					'[data-slot="sidebar-provider"]',
				) as HTMLElement | null
				if (providerEl) {
					providerEl.dataset.sidebarResizing = 'false'
				}

				if ((event.currentTarget as HTMLButtonElement).hasPointerCapture(event.pointerId)) {
					;(event.currentTarget as HTMLButtonElement).releasePointerCapture(event.pointerId)
				}
				if (dragStateRef.current.raf !== null) {
					window.cancelAnimationFrame(dragStateRef.current.raf)
					dragStateRef.current.raf = null
				}

				// 松手时一次性写回 state + 持久化
				if (
					layoutMode === 'desktop' &&
					sidebarState === 'expanded' &&
					dragStateRef.current.dragged
				) {
					setSidebarWidth(dragStateRef.current.lastWidth)
				}
			}}
			tabIndex={-1}
			type='button'
			{...props}
		>
			<span
				aria-hidden='true'
				// rail 左边缘在边界左侧 4px，因此中心线正好压在边界上
				className='pointer-events-none absolute inset-y-0 left-1/2 w-1 -translate-x-1/2 bg-transparent transition-colors group-hover/sidebar-rail:bg-[#99999c]'
			/>
		</button>
	)
}

type SidebarTriggerProps = React.ComponentProps<'button'> & {
	/** 关掉就不会随 state 切 icon；默认会在 collapsed/mobile-closed 显示 open 图标 */
	stateful?: boolean
}

/**
 * SidebarTrigger：独立的切换按钮。
 * - desktop 模式：切 expanded/collapsed
 * - mobile 模式：切 drawer 打开/关闭（这里只处理 toggle，不额外做"打开后点自己关"的防御）
 */
function SidebarTrigger({ className, stateful = true, onClick, ...props }: SidebarTriggerProps) {
	const { toggleSidebar, sidebarState, drawerOpen, layoutMode } = useSidebar()

	// 根据当前状态决定图标方向：已展开 → close icon；已收起 → open icon
	const isOpen = layoutMode === 'mobile' ? drawerOpen : sidebarState === 'expanded'
	const Icon = stateful && isOpen ? PanelLeftCloseIcon : PanelLeftOpenIcon

	return (
		<button
			aria-label={isOpen ? '收起侧边栏' : '展开侧边栏'}
			className={cn(
				'inline-flex size-7 shrink-0 items-center justify-center rounded-md border border-transparent text-(--sf-color-shell-secondary) transition-colors hover:bg-(--sf-color-shell-hover) hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/18 focus-visible:outline-none [&_svg]:pointer-events-none [&_svg]:shrink-0',
				className,
			)}
			data-slot='sidebar-trigger'
			onClick={(event) => {
				onClick?.(event)
				if (event.defaultPrevented) return
				toggleSidebar()
			}}
			type='button'
			{...props}
		>
			<Icon className='size-3.5' />
		</button>
	)
}

export {
	SidebarProvider,
	Sidebar,
	SidebarHeader,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupLabel,
	SidebarGroupAction,
	SidebarGroupContent,
	SidebarMenu,
	SidebarMenuItem,
	SidebarMenuButton,
	SidebarMenuAction,
	SidebarMenuBadge,
	SidebarMenuSub,
	SidebarMenuSubItem,
	SidebarMenuSubButton,
	SidebarRail,
	SidebarTrigger,
	useSidebar,
}

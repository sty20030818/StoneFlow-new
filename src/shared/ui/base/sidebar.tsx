import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'
import { PanelLeftCloseIcon, PanelLeftOpenIcon } from 'lucide-react'

import { cn } from '@/shared/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/base/tooltip'
import {
	SidebarContext,
	type SidebarContextValue,
	type SidebarDesktopState,
	type SidebarGeometry,
	type SidebarLayoutMode,
	type SidebarVisualState,
	useSidebar,
} from '@/shared/ui/base/sidebar-context'

// Shell 响应式断点：>=1024 视作 desktop（桌面态），<1024 视作 mobile（抽屉态）
const SIDEBAR_DESKTOP_BREAKPOINT_PX = 1024
// 桌面态展开/折叠的持久化 key，刷新后保留用户上次的选择
const SIDEBAR_STATE_STORAGE_KEY = 'sf:sidebar:state'
// 桌面态可变宽（px）
const SIDEBAR_WIDTH_STORAGE_KEY = 'sf:sidebar:width'
const SIDEBAR_WIDTH_MIN = 220
const SIDEBAR_WIDTH_MAX = 330
/** 移动端 offcanvas 抽屉宽度（固定，不参与桌面可变宽） */
const SIDEBAR_MOBILE_DRAWER_WIDTH_PX = 220
/** 与 index.css `--sf-shell-sidebar-width-icon: 3rem` 对齐，几何内联用 px 以便与展开宽度插值动画 */
const SIDEBAR_ICON_RAIL_PX = 48
// 桌面态切换快捷键（对齐 VS Code / shadcn 惯例）
const SIDEBAR_TOGGLE_SHORTCUT_KEY = 'b'

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

function resolveVisualState(
	layoutMode: SidebarLayoutMode,
	desktopPreference: SidebarDesktopState,
	mobileOpen: boolean,
): SidebarVisualState {
	if (layoutMode === 'mobile') {
		return mobileOpen ? 'mobile-open' : 'mobile-closed'
	}

	return desktopPreference === 'expanded' ? 'desktop-expanded' : 'desktop-collapsed'
}

function resolveGeometry(
	visualState: SidebarVisualState,
	sidebarWidth: number,
	desktopPreference: SidebarDesktopState,
	collapsibleEnabled = true,
): SidebarGeometry {
	const desktopWidth = `${sidebarWidth}px`
	const iconRailPx = `${SIDEBAR_ICON_RAIL_PX}px`
	const mobileWidth = `${SIDEBAR_MOBILE_DRAWER_WIDTH_PX}px`

	if (!collapsibleEnabled && visualState.startsWith('desktop')) {
		return {
			panelWidth: desktopWidth,
			panelOffsetX: '0px',
			reservedWidth: desktopWidth,
			overlayOpacity: 0,
		}
	}

	switch (visualState) {
		case 'desktop-expanded':
			return {
				panelWidth: desktopWidth,
				panelOffsetX: '0px',
				reservedWidth: desktopWidth,
				overlayOpacity: 0,
			}
		case 'desktop-collapsed':
			// 必须用「窄容器 + offset 0」裁出左侧 icon 列；若用整宽 translateX，视口会露在面板右侧，图标全在左侧被移出屏幕
			// panel/reserved 用固定 px（与展开态的 px 同源），避免 var()↔px 无法插值导致展开时宽度「瞬跳」
			return {
				panelWidth: iconRailPx,
				panelOffsetX: '0px',
				reservedWidth: iconRailPx,
				overlayOpacity: 0,
			}
		case 'mobile-open':
			return {
				panelWidth: mobileWidth,
				panelOffsetX: '0px',
				reservedWidth: '0px',
				overlayOpacity: 1,
			}
		case 'mobile-closed':
			if (desktopPreference === 'collapsed') {
				return {
					panelWidth: iconRailPx,
					panelOffsetX: `-${iconRailPx}`,
					reservedWidth: '0px',
					overlayOpacity: 0,
				}
			}
			return {
				panelWidth: mobileWidth,
				panelOffsetX: 'calc(var(--sf-shell-sidebar-panel-width) * -1)',
				reservedWidth: '0px',
				overlayOpacity: 0,
			}
	}
}

function SidebarProvider({ className, children, ...props }: React.ComponentProps<'div'>) {
	const [layoutMode, setLayoutMode] = React.useState<SidebarLayoutMode>(() => resolveLayoutMode())
	const [desktopPreference, setDesktopPreference] = React.useState<SidebarDesktopState>(() =>
		readStoredSidebarState(),
	)
	const [sidebarWidth, setSidebarWidth] = React.useState(() => readStoredSidebarWidth())
	const [mobileOpen, setMobileOpen] = React.useState(false)
	const [isBreakpointSwitching, setIsBreakpointSwitching] = React.useState(false)
	const layoutModeRef = React.useRef<SidebarLayoutMode | null>(null)

	// 断点只改变目标几何状态；sidebar 面板本体始终保持同一套 DOM。
	React.useEffect(() => {
		if (typeof window === 'undefined') return

		const mediaQuery = window.matchMedia(`(min-width: ${SIDEBAR_DESKTOP_BREAKPOINT_PX}px)`)

		const commitMode = (nextMode: SidebarLayoutMode) => {
			setLayoutMode((prev) => {
				if (prev === nextMode) return prev
				if (nextMode === 'mobile') {
					setMobileOpen(false)
				}
				return nextMode
			})
		}

		const handleChange = () => {
			commitMode(mediaQuery.matches ? 'desktop' : 'mobile')
		}

		mediaQuery.addEventListener('change', handleChange)
		return () => {
			mediaQuery.removeEventListener('change', handleChange)
		}
	}, [])

	// 断点切换时必须在首帧 paint 前禁止 sidebar 本体 transform，否则会先闪出一帧宽 drawer。
	React.useLayoutEffect(() => {
		if (layoutModeRef.current === null) {
			layoutModeRef.current = layoutMode
			return
		}
		if (layoutModeRef.current === layoutMode) return
		layoutModeRef.current = layoutMode
		setIsBreakpointSwitching(true)

		const raf2Ref: { current: number } = { current: 0 }
		const raf1 = window.requestAnimationFrame(() => {
			raf2Ref.current = window.requestAnimationFrame(() => {
				setIsBreakpointSwitching(false)
			})
		})

		return () => {
			window.cancelAnimationFrame(raf1)
			window.cancelAnimationFrame(raf2Ref.current)
		}
	}, [layoutMode])

	// 每次变化时写回本地存储；只在桌面态这项决策是有效的
	React.useEffect(() => {
		writeStoredSidebarState(desktopPreference)
	}, [desktopPreference])

	React.useEffect(() => {
		writeStoredSidebarWidth(sidebarWidth)
	}, [sidebarWidth])

	const toggleSidebar = React.useCallback(() => {
		if (layoutMode === 'mobile') {
			setMobileOpen((prev) => !prev)
			return
		}
		setDesktopPreference((prev) => (prev === 'expanded' ? 'collapsed' : 'expanded'))
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
	const setDrawerOpen = React.useCallback((open: boolean) => {
		setMobileOpen(open)
	}, [])

	const visualState = resolveVisualState(layoutMode, desktopPreference, mobileOpen)
	const geometry = resolveGeometry(visualState, sidebarWidth, desktopPreference)

	const value = React.useMemo<SidebarContextValue>(
		() => ({
			layoutMode,
			desktopPreference,
			mobileOpen,
			visualState,
			geometry,
			panelWidth: geometry.panelWidth,
			panelOffsetX: geometry.panelOffsetX,
			reservedWidth: geometry.reservedWidth,
			overlayOpacity: geometry.overlayOpacity,
			isBreakpointSwitching,
			sidebarState: desktopPreference,
			sidebarWidth,
			drawerOpen: mobileOpen,
			isMobile: layoutMode === 'mobile',
			toggleSidebar,
			setDrawerOpen,
			setSidebarWidth: setSidebarWidthClamped,
		}),
		[
			layoutMode,
			desktopPreference,
			mobileOpen,
			visualState,
			geometry,
			isBreakpointSwitching,
			sidebarWidth,
			toggleSidebar,
			setDrawerOpen,
			setSidebarWidthClamped,
		],
	)

	return (
		<SidebarContext.Provider value={value}>
			<div
				className={cn('group/sidebar-wrapper', className)}
				data-slot='sidebar-provider'
				data-sidebar-layout={layoutMode}
				data-sidebar-state={desktopPreference}
				data-sidebar-mode={visualState}
				data-sidebar-resizing='false'
				data-sidebar-drawer={mobileOpen ? 'open' : 'closed'}
				data-sidebar-visual-state={visualState}
				data-sidebar-breakpoint-switching={isBreakpointSwitching ? 'true' : 'false'}
				style={
					{
						// 布局与面板动画共用同一组几何变量，断点切换时只换目标值。
						'--sf-shell-sidebar-width-current': `${sidebarWidth}px`,
						'--sf-shell-sidebar-panel-width': geometry.panelWidth,
						'--sf-shell-sidebar-panel-offset-x': geometry.panelOffsetX,
						'--sf-shell-sidebar-reserved-width': geometry.reservedWidth,
						'--sf-shell-sidebar-overlay-opacity': String(geometry.overlayOpacity),
					} as React.CSSProperties
				}
				{...props}
			>
				{children}
			</div>
		</SidebarContext.Provider>
	)
}

type SidebarProps = React.ComponentProps<'aside'> & {
	collapsible?: 'icon' | 'none'
}

/**
 * Sidebar 主容器：
 * - desktop（方案 C3）：落在主带网格第一列，relative + h-full，列宽由 reserved 与外层 grid 同步动画
 * - mobile：仍 fixed offcanvas，整宽 + translateX；遮罩仅 mobile 挂载
 * - desktop collapsed：`overflow-hidden` + 窄列裁出 icon rail（勿用整宽 translate 露错边）
 */
function Sidebar({ className, collapsible = 'none', children, style, ...props }: SidebarProps) {
	const { isBreakpointSwitching, setDrawerOpen, visualState, layoutMode, mobileOpen } = useSidebar()
	const collapsibleEnabled = collapsible === 'icon'
	// mobile 抽屉的 `pt-12` 主要为 macOS 交通灯/额外安全区服务；Windows 上会与自绘顶栏“重复留空”
	const isWin =
		/Windows/i.test(typeof navigator === 'undefined' ? '' : navigator.userAgent) ||
		(typeof navigator !== 'undefined' && navigator.platform === 'Win32')

	return (
		<>
			{/* 仅 mobile 挂载遮罩：desktop 完全不参与合成，避免底栏常驻「抽屉灰膜」残影 */}
			{layoutMode === 'mobile' ? (
				<div
					aria-hidden={!mobileOpen}
					className={cn(
						'fixed inset-0 z-60 bg-black/30 transition-opacity duration-(--sf-shell-layout-sync-duration) ease-(--sf-shell-layout-sync-easing) motion-reduce:transition-none',
						mobileOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
					)}
					data-slot='sidebar-overlay'
					onClick={() => setDrawerOpen(false)}
				/>
			) : null}
			<aside
				aria-hidden={visualState === 'mobile-closed'}
				className={cn(
					'flex flex-col overflow-hidden bg-(--sf-color-shell-chrome) shadow-none backface-hidden motion-reduce:transition-none',
					// desktop：流式侧栏，宽度由父列槽约束，避免与 grid 列动画双重插值宽度
					'group-data-[sidebar-layout=desktop]/sidebar-wrapper:relative group-data-[sidebar-layout=desktop]/sidebar-wrapper:z-30 group-data-[sidebar-layout=desktop]/sidebar-wrapper:h-full group-data-[sidebar-layout=desktop]/sidebar-wrapper:min-h-0 group-data-[sidebar-layout=desktop]/sidebar-wrapper:w-full group-data-[sidebar-layout=desktop]/sidebar-wrapper:min-w-0 group-data-[sidebar-layout=desktop]/sidebar-wrapper:max-w-full group-data-[sidebar-layout=desktop]/sidebar-wrapper:translate-x-0',
					// mobile：fixed 抽屉，覆盖 Header 安全区以下
					// 抽屉宽度固定 220px，只过渡 transform；勿过渡 width（与断点/变量切换叠在一起会像整屏宽条带）
					'group-data-[sidebar-layout=mobile]/sidebar-wrapper:fixed group-data-[sidebar-layout=mobile]/sidebar-wrapper:inset-y-0 group-data-[sidebar-layout=mobile]/sidebar-wrapper:left-0 group-data-[sidebar-layout=mobile]/sidebar-wrapper:z-70 group-data-[sidebar-layout=mobile]/sidebar-wrapper:w-(--sf-shell-sidebar-panel-width) group-data-[sidebar-layout=mobile]/sidebar-wrapper:translate-x-(--sf-shell-sidebar-panel-offset-x)',
					!isWin && 'group-data-[sidebar-layout=mobile]/sidebar-wrapper:pt-12',
					'group-data-[sidebar-layout=mobile]/sidebar-wrapper:transition-transform group-data-[sidebar-layout=mobile]/sidebar-wrapper:duration-(--sf-shell-layout-sync-duration) group-data-[sidebar-layout=mobile]/sidebar-wrapper:ease-(--sf-shell-layout-sync-easing) group-data-[sidebar-resizing=true]/sidebar-wrapper:transition-none',
					'group-data-[sidebar-breakpoint-switching=true]/sidebar-wrapper:transition-none!',
					'group-data-[sidebar-mode=mobile-open]/sidebar-wrapper:border-r group-data-[sidebar-mode=mobile-open]/sidebar-wrapper:border-(--sf-color-border-subtle)',
					!collapsibleEnabled && 'translate-x-0',
					className,
				)}
				data-collapsible={collapsible}
				data-slot='sidebar'
				style={{
					...style,
					// class 层会受 Tailwind 生成顺序影响；断点首帧必须用 inline 样式硬关动画。
					transition: isBreakpointSwitching ? 'none' : style?.transition,
				}}
				{...props}
			>
				{children}
			</aside>
		</>
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
				'flex flex-col gap-1 px-3 group-data-[sidebar-mode=desktop-collapsed]/sidebar-wrapper:px-2 group-data-[sidebar-mode=mobile-closed]/sidebar-wrapper:px-2',
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
	'flex w-full min-w-0 items-center gap-2 rounded-md border border-transparent text-(--sf-color-shell-secondary) outline-none transition-colors select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/18 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*="size-"])]:size-3.5 group-data-[sidebar-mode=desktop-collapsed]/sidebar-wrapper:mx-auto group-data-[sidebar-mode=desktop-collapsed]/sidebar-wrapper:justify-center group-data-[sidebar-mode=desktop-collapsed]/sidebar-wrapper:px-0 group-data-[sidebar-mode=desktop-collapsed]/sidebar-wrapper:[&>span:not([data-sidebar-keep])]:hidden group-data-[sidebar-mode=mobile-closed]/sidebar-wrapper:mx-auto group-data-[sidebar-mode=mobile-closed]/sidebar-wrapper:justify-center group-data-[sidebar-mode=mobile-closed]/sidebar-wrapper:px-0 group-data-[sidebar-mode=mobile-closed]/sidebar-wrapper:[&>span:not([data-sidebar-keep])]:hidden',
	{
		variants: {
			size: {
				default:
					'h-8 px-2.5 text-[13px] group-data-[sidebar-mode=desktop-collapsed]/sidebar-wrapper:w-8 group-data-[sidebar-mode=mobile-closed]/sidebar-wrapper:w-8',
				sm: 'h-7 px-2 text-[12px] group-data-[sidebar-mode=desktop-collapsed]/sidebar-wrapper:w-7 group-data-[sidebar-mode=mobile-closed]/sidebar-wrapper:w-7',
				// Space 切换（lg）在展开态更高；折叠为 icon-only 时仍保持 lg 的行高，避免与其它 h-8 入口产生上下错位
				lg: 'h-10 px-2.5 text-[14px] group-data-[sidebar-mode=desktop-collapsed]/sidebar-wrapper:w-8 group-data-[sidebar-mode=mobile-closed]/sidebar-wrapper:w-8',
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
				'ml-auto shrink-0 text-[12px] font-semibold text-(--sf-color-shell-secondary) group-data-[sidebar-mode=desktop-collapsed]/sidebar-wrapper:hidden group-data-[sidebar-mode=mobile-closed]/sidebar-wrapper:hidden',
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
				'relative ml-5 flex flex-col gap-0.5 border-l border-(--sf-color-border-subtle) pl-3 group-data-[sidebar-mode=desktop-collapsed]/sidebar-wrapper:hidden group-data-[sidebar-mode=mobile-closed]/sidebar-wrapper:hidden',
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
	const {
		toggleSidebar,
		desktopPreference,
		sidebarWidth,
		setSidebarWidth,
		layoutMode,
		visualState,
	} = useSidebar()
	const dragStateRef = React.useRef<{
		startX: number
		startWidth: number
		dragged: boolean
		lastWidth: number
		raf: number | null
	}>({ startX: 0, startWidth: sidebarWidth, dragged: false, lastWidth: sidebarWidth, raf: null })

	return (
		<button
			aria-label={desktopPreference === 'expanded' ? '收起侧边栏' : '展开侧边栏'}
			className={cn(
				// rail 热区跨过分界线左右各一半（更好命中，也让 hover 高亮“两边都亮”）
				'group/sidebar-rail absolute inset-y-0 right-0 z-20 flex w-8 translate-x-1/2 items-stretch select-none group-data-[sidebar-layout=mobile]/sidebar-wrapper:hidden',
				// 可变宽 resize 光标：左右一致
				visualState !== 'desktop-expanded' ? 'cursor-pointer' : 'cursor-col-resize',
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
				if (visualState !== 'desktop-expanded') return

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
				if (visualState !== 'desktop-expanded') return

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
					providerEl.style.setProperty('--sf-shell-sidebar-panel-width', `${clamped}px`)
					providerEl.style.setProperty('--sf-shell-sidebar-reserved-width', `${clamped}px`)
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
					desktopPreference === 'expanded' &&
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
	const { toggleSidebar, visualState } = useSidebar()

	// 根据当前状态决定图标方向：已展开 → close icon；已收起 → open icon
	const isOpen = visualState === 'desktop-expanded' || visualState === 'mobile-open'
	const Icon = stateful && isOpen ? PanelLeftCloseIcon : PanelLeftOpenIcon

	return (
		<button
			aria-label={isOpen ? '收起侧边栏' : '展开侧边栏'}
			className={cn(
				// 与主壳 `Button` `icon-sm` 同 30×30 底槽，便于与顶栏三键/品牌圆钮对齐
				'inline-flex size-7.5 shrink-0 items-center justify-center rounded-md border border-transparent text-(--sf-color-shell-secondary) transition-colors hover:bg-(--sf-color-shell-hover) hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/18 focus-visible:outline-none [&_svg]:pointer-events-none [&_svg]:shrink-0',
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
}

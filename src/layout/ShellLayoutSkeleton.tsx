import { useLayoutEffect, type CSSProperties } from 'react'

import { dismissBootShell } from '@/shared/lib/bootShell'
import { DEFAULT_SIDEBAR_WIDTH, SIDEBAR_ICON_RAIL_PX } from '@/shared/lib/shellSidebarGeometry'

type ShellLayoutSkeletonStatus = 'idle' | 'loading' | 'ready' | 'error'

type ShellLayoutSkeletonProps = {
	status: ShellLayoutSkeletonStatus
	/** error 时为错误文案；loading 时可作 aria 说明 */
	message?: string | null
	/**
	 * 已加载的侧栏展开宽（来自 sidebarSettings.width）。
	 * 未传入时回退 DEFAULT_SIDEBAR_WIDTH。
	 */
	sidebarWidth?: number
	/**
	 * 已加载的桌面展开/折叠偏好。折叠时 reserved = icon 轨，与真壳一致。
	 */
	desktopPreference?: 'expanded' | 'collapsed'
}

/**
 * 开屏骨架：灰壳 + 白主卡。
 *
 * 几何合同（与真壳 HeroUI Sidebar + Inset 一致）：
 * - `auto + minmax(0, 1fr)` 由 Sidebar 占位元素的实际宽度驱动，不维护第二份 grid 列宽。
 * - 桌面用真实 width / 折叠态 48px icon rail；小于 1024px 时侧栏占位为零。
 * - 桌面 Frame 的 Main region 仅保留尾侧 8px gutter；Inset surface 不拥有外边距。
 * - 窄窗口去掉 gutter、边框和圆角。
 * - 顶 Header `h-11` / 底 Footer `h-7`。
 *
 * 同步契约：`index.html` `#sf-boot-shell` 是同结构的静态首帧遮罩（仅默认 256、无用户宽）。
 * 改布局/色值时必须两边一起改；Launcher（`data-sf-boot=launcher`）不画 HTML 骨架。
 * 遮罩在 #root 外；须等本组件（或真壳/Launcher）首帧后再 `dismissBootShell`，
 * 不可在 App 挂载时就撤——否则路由/chunk 空窗期会闪全灰。
 */
export function ShellLayoutSkeleton({
	status,
	message = null,
	sidebarWidth,
	desktopPreference = 'expanded',
}: ShellLayoutSkeletonProps) {
	const statusText = status === 'error' ? (message ?? '加载失败') : (message ?? '正在加载工作区…')
	const reservedWidthPx =
		desktopPreference === 'collapsed'
			? SIDEBAR_ICON_RAIL_PX
			: (sidebarWidth ?? DEFAULT_SIDEBAR_WIDTH)

	useLayoutEffect(() => {
		dismissBootShell()
	}, [])

	return (
		<div
			aria-busy={status !== 'ready'}
			aria-label={statusText}
			className='relative flex h-full min-h-0 flex-col overflow-hidden bg-surface-secondary'
			data-slot='shell-layout-skeleton'
		>
			<div className='h-11 shrink-0 bg-surface-secondary' />

			<div
				className='grid min-h-0 min-w-0 flex-1 grid-cols-[auto_minmax(0,1fr)] overflow-hidden bg-surface-secondary'
				data-slot='shell-layout-skeleton-body'
			>
				{/* 真实占位元素驱动 auto 轨道；compact 时不保留桌面几何。 */}
				<div
					className='w-0 shrink-0 bg-surface-secondary min-[1024px]:w-(--sidebar-width)'
					data-slot='shell-layout-skeleton-sidebar'
					style={{ '--sidebar-width': `${reservedWidthPx}px` } as CSSProperties}
				/>

				<div className='flex min-h-0 min-w-0 overflow-hidden bg-surface-secondary min-[1024px]:pr-2'>
					<div
						className='relative flex min-h-0 min-w-0 flex-1 overflow-hidden bg-background min-[1024px]:rounded-lg min-[1024px]:border min-[1024px]:border-surface'
						data-slot='shell-layout-skeleton-main'
					>
						<span className='sr-only'>{statusText}</span>
					</div>
				</div>
			</div>

			<div className='h-7 shrink-0 bg-surface-secondary' />
		</div>
	)
}

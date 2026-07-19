import type { CSSProperties } from 'react'

import {
	DEFAULT_SIDEBAR_WIDTH,
	SIDEBAR_ICON_RAIL_PX,
} from '@/shared/lib/shellSidebarGeometry'

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
 * 宽度算法（与真壳 ShellChrome + ShellMain 一致）：
 * - 左侧 reserved：有 settings 时用真实 width / 折叠态 icon 轨；否则 DEFAULT_SIDEBAR_WIDTH。
 * - 右侧 gutter = `pr-2`（8px），仅右、不左。
 * - 顶 Header `h-12` / 底 Footer `h-7`。
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

	return (
		<div
			aria-busy={status !== 'ready'}
			aria-label={statusText}
			className='relative flex h-full min-h-0 flex-col overflow-hidden bg-sf-shell'
			style={
				{
					['--sf-shell-sidebar-reserved-width']: `${reservedWidthPx}px`,
				} as CSSProperties
			}
		>
			<div className='h-12 shrink-0 bg-sf-shell' />

			<div className='flex min-h-0 flex-1 overflow-hidden bg-sf-shell'>
				{/* 与 ShellChrome 侧栏列同一套宽度变量 */}
				<div className='w-(--sf-shell-sidebar-reserved-width) shrink-0 bg-sf-shell' />

				{/* 与 ShellMain 同：仅 pr-2 */}
				<div className='flex min-h-0 min-w-0 flex-1 overflow-hidden bg-sf-shell pr-2'>
					<div className='relative flex min-h-0 min-w-0 flex-1 overflow-hidden rounded-lg border border-sf-border-subtle bg-card'>
						<span className='sr-only'>{statusText}</span>
					</div>
				</div>
			</div>

			<div className='h-7 shrink-0 bg-sf-shell' />
		</div>
	)
}

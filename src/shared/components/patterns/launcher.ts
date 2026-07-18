/**
 * Launcher 共享视觉 pattern（class 拼装助手，非第二套设计 token）。
 * 外圆角由 --launcher-panel-radius 注入；颜色跟主站 sf / background。
 */
export const launcherToolbarRowClass = 'flex h-11 items-center gap-2 px-3'

/** Advanced 单行横滑，避免折行挤占 Results */
export const launcherAdvancedRowClass =
	'flex h-10 flex-nowrap items-center gap-2 overflow-x-auto px-3'

/**
 * 内容壳：致密玻璃 + 折射描边。
 * 外圆角读平台注入的 --launcher-panel-radius；外阴影交给原生 shadow。
 */
export const launcherSurfaceClipClass = [
	'relative flex h-full w-full min-h-0 flex-col overflow-hidden',
	'rounded-[var(--launcher-panel-radius,8px)]',
	'[clip-path:inset(0_round_var(--launcher-panel-radius,8px))]',
	'border border-black/[0.05]',
	'bg-background/92',
	'shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_0_0_0.5px_rgba(0,0,0,0.025)]',
].join(' ')

/** Composer 顶栏衬底 */
export const launcherChromeClass = 'shrink-0 border-b border-black/[0.05] bg-background/96'

/** Results 槽位衬底；真实滚动交给 AppScrollArea */
export const launcherResultsPaneClass = 'min-h-0 bg-background/78'

/** Footer 底栏 */
export const launcherFooterChromeClass =
	'shrink-0 rounded-b-[var(--launcher-panel-radius,8px)] border-t border-black/[0.06] bg-background/96'

/** 空态轻标题 */
export const launcherSectionLabelClass =
	'flex items-center gap-1.5 px-3 pt-2 pb-1 text-xs font-medium text-sf-text-tertiary'

export const launcherSectionCountClass = 'tabular-nums text-sf-text-quaternary'

export const launcherResultsStackClass = 'flex flex-col gap-0.5 px-2 pb-0.5'

export const launcherMenuContentClass = 'rounded-xl p-1.5'

export const launcherMenuItemClass = 'gap-2 p-2 text-[12.5px]'

/**
 * Shell Footer 模式：左同步 / 右更新，极简状态轨。
 *
 * 左侧三件套（灯 / 文案 / 按钮）彼此独立：
 * - 灯：只读指示
 * - 文案：只读状态
 * - 按钮：唯一可点动作
 */

export const shellFooterTrackClass =
	'text-[11px] leading-none text-sf-shell-text-tertiary'

/** 左侧：同步区 */
export const shellFooterLeftTrackClass = `flex min-w-0 flex-1 items-center gap-2 ${shellFooterTrackClass}`

/** 右侧：更新 + 版本 */
export const shellFooterRightTrackClass = `flex shrink-0 items-center gap-2 ${shellFooterTrackClass}`

/** 状态灯（只读） */
export const shellFooterStatusDotClass =
	'size-1.5 shrink-0 rounded-full ring-1 ring-black/5 dark:ring-white/10'

/** 只读文案（无 hover 提亮） */
export const shellFooterStaticTextClass =
	'truncate text-[11px] leading-none text-sf-shell-text-tertiary'

/** 可点文案（更新态等） */
export const shellFooterInteractiveTextClass =
	'truncate text-[11px] leading-none text-sf-shell-text-tertiary transition-[color] hover:text-sf-shell-text-secondary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-sm'

/**
 * 独立 icon 按钮：视觉 12px 图标、热区铺满 28px 底栏高度。
 * 与相邻灯/文案分离，不与状态文字共用 click target。
 */
export const shellFooterIconButtonClass =
	'inline-flex size-7 shrink-0 items-center justify-center rounded-md text-sf-shell-text-tertiary transition-[color,background-color,transform] hover:bg-muted/50 hover:text-sf-shell-text-secondary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring active:scale-[0.96] disabled:pointer-events-none disabled:opacity-40'

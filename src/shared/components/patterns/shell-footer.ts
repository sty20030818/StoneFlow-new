/**
 * Shell Footer 模式：左同步 / 右更新，极简状态轨。
 *
 * 左侧三件套（灯 / 文案 / 按钮）彼此独立：
 * - 灯：只读指示
 * - 文案：只读状态
 * - 按钮：唯一可点动作
 */

export const shellFooterTrackClass = 'text-[11px] leading-none text-sf-shell-text-tertiary'

/** 左侧：同步区 */
export const shellFooterLeftTrackClass = `flex min-w-0 flex-1 items-center gap-2 ${shellFooterTrackClass}`

/** 右侧：更新 badge + 版本（与版本拉开，避免挤成一团） */
export const shellFooterRightTrackClass = `flex shrink-0 items-center gap-3 ${shellFooterTrackClass}`

/** 状态灯（只读） */
export const shellFooterStatusDotClass =
	'size-1.5 shrink-0 rounded-full ring-1 ring-black/5 dark:ring-white/10'

/** 只读文案（无 hover 提亮） */
export const shellFooterStaticTextClass =
	'truncate text-[11px] leading-none text-sf-shell-text-tertiary'

/** 可点文案（更新态等） */
export const shellFooterInteractiveTextClass =
	'truncate text-[11px] leading-none text-sf-shell-text-tertiary hover:text-sf-shell-text-secondary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-sm'

/**
 * 独立 icon 按钮：视觉 12px 图标、热区铺满 28px 底栏高度。
 * 与相邻灯/文案分离，不与状态文字共用 click target。
 */
export const shellFooterIconButtonClass =
	'inline-flex size-7 shrink-0 items-center justify-center rounded-md text-sf-shell-text-tertiary hover:bg-legacy-muted/50 hover:text-sf-shell-text-secondary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40'

/**
 * 一体可点 hit 区（indicator + label 共用 click）。
 * 用于更新轨等「点一下开弹窗」交互；同步轨仍用灯/文案/按钮分离。
 */
export const shellFooterHitClass =
	'inline-flex min-w-0 max-w-40 items-center gap-1.5 rounded-md ' +
	'text-[11px] leading-none tabular-nums ' +
	'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

/** Hit 语气色（无业务语义，仅视觉） */
export type ShellFooterHitTone = 'neutral' | 'success' | 'danger'

export const shellFooterHitToneClass: Record<ShellFooterHitTone, string> = {
	neutral:
		'text-sf-shell-text-tertiary hover:bg-legacy-muted/50 hover:text-sf-shell-text-secondary',
	success: 'text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400',
	danger:
		'text-red-600 hover:bg-red-500/10 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300',
}

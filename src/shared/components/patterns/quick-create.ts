/**
 * Quick Create 顶部两行控件的共享视觉 pattern。
 * 这层承接产品表达，避免 feature 内部重复散落同一套按钮/菜单样式。
 */
export const quickCreateToolbarRowClass = 'flex h-11 items-center gap-2 px-3'

/** Advanced 单行横滑，避免折行挤占 Results */
export const quickCreateAdvancedRowClass =
	'flex h-10 flex-nowrap items-center gap-2 overflow-x-auto px-3'

/**
 * 内容壳：致密玻璃 + 折射描边。
 * 外阴影交给 macOS NSPanel `setHasShadow` / Windows `set_shadow`，FE 不画投影。
 */
export const quickCreateSurfaceClipClass = [
	'relative flex h-full w-full min-h-0 flex-col overflow-hidden rounded-2xl',
	'[clip-path:inset(0_round_16px)]',
	'border border-black/[0.05]',
	'bg-background/92',
	'shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_0_0_0.5px_rgba(0,0,0,0.025)]',
].join(' ')

/** Composer 顶栏衬底（与 Results 之间只保留这一条分隔） */
export const quickCreateChromeClass =
	'shrink-0 border-b border-black/[0.05] bg-background/96'

/** Results 内滚区：略透，仍保证行文可读 */
export const quickCreateResultsPaneClass =
	'min-h-0 overflow-x-hidden overflow-y-auto bg-background/78'

/** Footer 底栏 */
export const quickCreateFooterChromeClass =
	'shrink-0 rounded-b-2xl border-t border-black/[0.06] bg-background/96'

/**
 * Quick Create board spacing contract:
 * - create row 和结果区分开，结果区容器统一管理两个 board 的外部间距
 * - board 自身不再追加上下 padding
 */
export const quickCreateBoardStackClass = 'flex-none! gap-0'
export const quickCreateBoardResultsStackClass = 'flex flex-col gap-0.5 pb-0.5'
export const quickCreateBoardGroupClass = 'gap-0.5 pb-0 last:pb-0'
export const quickCreateBoardCollapsibleClass = 'gap-0.5 pb-0 last:pb-0'

export const quickCreateMenuContentClass = 'rounded-xl p-1.5'

export const quickCreateMenuItemClass = 'gap-2 p-2 text-[12.5px]'

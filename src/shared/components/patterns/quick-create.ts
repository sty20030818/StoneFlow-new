/**
 * Quick Create 顶部两行控件的共享视觉 pattern。
 * 这层承接产品表达，避免 feature 内部重复散落同一套按钮/菜单样式。
 */
export const quickCreateToolbarRowClass = 'flex items-center gap-2 px-3 py-2.5'

export const quickCreateAdvancedRowClass = 'flex flex-wrap items-center gap-2 px-3 pb-1'

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

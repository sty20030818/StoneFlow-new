export type RowSelectionGroupPosition = 'single' | 'first' | 'middle' | 'last'

/**
 * RowShell 统一行表面 token。
 * 所有 row surface 常量统一以 ROW_SHELL_ 命名，不含实体前缀。
 */
export const ROW_SHELL_BASE_CLASS =
	'group/row-shell flex h-11 min-w-0 items-center gap-3 rounded-lg border border-transparent bg-transparent px-3 text-left text-sm leading-5'

export const ROW_SHELL_IDLE_CLASS = ''
export const ROW_SHELL_ACTIVE_CLASS = 'border-border-secondary bg-accent-soft'
export const ROW_SHELL_FOCUS_CLASS =
	'-outline-offset-2 outline-2 outline-focus-subtle forced-colors:outline-[Highlight]'
export const ROW_SHELL_SELECTED_CLASS = 'border-transparent bg-accent-soft'
export const ROW_SHELL_SECTION_HEADER_CLASS =
	'flex h-[34px] items-center gap-2 rounded-lg bg-background-secondary pl-3 pr-1'

/** RowShell.Actions 布局 class，内联于 row 层，不依赖 entity-board。 */
export const ROW_SHELL_ACTIONS_CLASS = 'flex shrink-0 items-center gap-2'

export const ROW_SHELL_GROUP_POSITION_CLASS: Record<RowSelectionGroupPosition, string> = {
	single: 'rounded-lg',
	first: 'rounded-none rounded-t-lg',
	middle: 'rounded-none',
	last: 'rounded-none rounded-b-lg',
}

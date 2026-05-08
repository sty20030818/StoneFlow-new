export type RowSelectionGroupPosition = 'single' | 'first' | 'middle' | 'last'

/**
 * RowShell 统一行表面 token。
 * 所有 row surface 常量统一以 ROW_SHELL_ 命名，不含实体前缀。
 */
export const ROW_SHELL_BASE_CLASS =
	'group flex h-12 min-w-0 items-center gap-3 rounded-md border border-transparent bg-transparent px-3 text-left transition-colors'

export const ROW_SHELL_IDLE_CLASS = 'hover:bg-sf-list-row-hover'
export const ROW_SHELL_ACTIVE_CLASS = 'border-sf-border-subtle bg-sf-list-row-selected'
export const ROW_SHELL_SELECTED_CLASS =
	'border-transparent bg-sf-selection-surface hover:bg-sf-selection-surface-hover'
/** 选中 row 被合并到分组 wrapper 内时，去掉自身背景，只保留 hover。 */
export const ROW_SHELL_GROUP_SELECTED_CLASS = 'border-transparent bg-transparent hover:bg-sf-selection-surface-hover'
export const ROW_SHELL_SECTION_HEADER_CLASS =
	'flex h-10 items-center gap-2 rounded-md bg-sf-list-section-bg pl-3 pr-1'
export const ROW_SHELL_META_TEXT_CLASS = 'text-xs font-medium text-sf-text-tertiary'

/** RowShell.Actions 布局 class，内联于 row 层，不依赖 entity-board。 */
export const ROW_SHELL_ACTIONS_CLASS = 'flex shrink-0 items-center gap-2'

export const ROW_SHELL_GROUP_POSITION_CLASS: Record<RowSelectionGroupPosition, string> = {
	single: 'rounded-md',
	first: 'rounded-none rounded-t-md',
	middle: 'rounded-none',
	last: 'rounded-none rounded-b-md',
}

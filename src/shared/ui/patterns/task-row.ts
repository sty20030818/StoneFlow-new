import { cva } from 'class-variance-authority'

/**
 * Task row pattern 统一 CanonicalBoard 和任务列表行容器的表面语义。
 */
export const TASK_ROW_BASE_CLASS =
	'group flex min-w-0 items-center gap-3 rounded-md border border-transparent bg-transparent px-3 py-3 text-left transition-colors'

export const TASK_ROW_IDLE_CLASS = 'hover:bg-sf-list-row-hover'
export const TASK_ROW_ACTIVE_CLASS = 'border-sf-border-subtle bg-sf-list-row-selected'
export const TASK_ROW_SELECTED_CLASS =
	'border-transparent bg-sf-selection-surface hover:bg-sf-selection-surface-hover'
export const TASK_ROW_SECTION_HEADER_CLASS =
	'flex h-10 items-center gap-2 rounded-md bg-sf-list-section-bg pl-3 pr-1'
export const TASK_ROW_META_TEXT_CLASS = 'text-xs font-medium text-sf-text-tertiary'
export const TASK_ROW_PROJECT_LEAD_CLASS =
	'inline-flex size-8 items-center justify-center rounded-xl bg-sf-surface-panel-muted text-sf-shell-text-secondary'

export const taskRowVariants = cva(TASK_ROW_BASE_CLASS, {
	variants: {
		state: {
			idle: TASK_ROW_IDLE_CLASS,
			active: TASK_ROW_ACTIVE_CLASS,
			selected: TASK_ROW_SELECTED_CLASS,
		},
	},
	defaultVariants: {
		state: 'idle',
	},
})

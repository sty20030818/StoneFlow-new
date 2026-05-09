/**
 * Global Search 模式：
 * - 输入框壳层
 * - 结果弹层壳层
 * - 组标题与状态块
 */
export const globalSearchInputShellClass =
	'h-8 border-sf-border-subtle bg-card/94 shadow-(--sf-shadow-panel) transition-colors hover:border-border focus-within:border-ring'

export const globalSearchResultsPopoverClass =
	'absolute left-1/2 top-full z-40 mt-1.5 w-[max(32rem,50vw)] max-w-[calc(100vw-2rem)] -translate-x-1/2 overflow-hidden rounded-xl border border-sf-border-secondary bg-popover/98 shadow-(--sf-shadow-popover) backdrop-blur'

export const globalSearchResultMetaClass =
	'flex items-center justify-between gap-3 text-[11px] text-sf-shell-text-secondary'

export const globalSearchGroupHeadingClass =
	'px-1 text-[10.5px] font-medium tracking-[0.06em] text-sf-shell-text-secondary uppercase'

export const globalSearchStateMutedClass =
	'border-sf-border-subtle bg-muted/60 text-sf-shell-text-secondary'

export const globalSearchResultNoteClass = 'truncate text-[12px] text-sf-shell-text-tertiary'

import { cva } from 'class-variance-authority'

/**
 * Sidebar item pattern 只负责 shell 里那些重复的图标、辅助文本和小 badge。
 */
export const sidebarItemIconVariants = cva('shrink-0 text-sf-shell-text-secondary', {
	variants: {
		size: {
			default: 'size-3.5',
			sm: 'size-3',
		},
	},
	defaultVariants: {
		size: 'default',
	},
})

export const sidebarInlineBadgeClass =
	'rounded-sm bg-muted px-1.5 py-0.5 text-[10px] text-sf-shell-text-secondary'

export const sidebarHelperTextClass =
	'px-2.5 py-2 text-[12px] leading-5 text-sf-shell-text-tertiary'

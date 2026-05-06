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

export const sidebarDropdownItemClass = 'gap-2 p-2'
export const sidebarMenuLabelClass = 'min-w-0 truncate'
export const sidebarMenuIconClass = 'size-3.5 shrink-0'
export const sidebarSectionHeaderRowClass = 'flex items-center justify-between px-2.5'
export const sidebarFooterContainerClass =
	'border-t border-sf-divider px-3 py-3 group-data-[sidebar-mode=desktop-collapsed]/sidebar-wrapper:px-2 group-data-[sidebar-mode=mobile-closed]/sidebar-wrapper:px-2'
export const sidebarSecondaryTextClass = 'text-sf-shell-text-secondary'

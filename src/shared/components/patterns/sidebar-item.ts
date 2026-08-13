/**
 * Sidebar item pattern 只负责 shell 里那些重复的图标、辅助文本和小 badge。
 */

export const sidebarInlineBadgeClass =
	'rounded-sm bg-legacy-muted px-1.5 py-0.5 text-[10px] text-sf-shell-text-secondary'

export const sidebarHelperTextClass =
	'px-2.5 py-2 text-[12px] leading-5 text-sf-shell-text-tertiary'

export const sidebarDropdownItemClass = 'gap-2 p-2'
/** 与 SidebarMenuButton default 尺寸配套的图标边长（shell 导航行统一用这一条） */
export const sidebarMenuIconClass = 'size-3.5 shrink-0'

/**
 * Shell `SidebarNavRow` 右侧数字列：固定宽度，数字在列内水平居中；无 badge 时仍占位。
 */
export const sidebarNavBadgeSlotClass =
	'ml-auto flex min-w-[2.75rem] shrink-0 items-center justify-center px-1'

/**
 * 包住 `SidebarNavRow` 内层（Tooltip / NavLink），强制占满 `SidebarMenuItem` 宽度。
 * 否则短文案行容易 shrink-to-fit，badge 列会相对侧栏右缘更「贴边」，与长标题行不对齐。
 */
export const sidebarShellNavLinkStretchClass =
	'flex w-full min-w-0 max-w-full [&_[data-slot=sidebar-menu-button]]:min-w-0 [&_[data-slot=sidebar-menu-button]]:w-full'

/** flex 行内夹在图标与 badge 之间：占满剩余宽度，长文案省略号规则一致 */
export const sidebarMenuLabelClass = 'min-w-0 flex-1 truncate'
export const sidebarSectionHeaderRowClass = 'flex items-center justify-between px-2.5'
export const sidebarFooterContainerClass =
	'border-t border-sf-divider px-3 py-3 group-data-[sidebar-mode=desktop-collapsed]/sidebar-wrapper:px-2 group-data-[sidebar-mode=mobile-closed]/sidebar-wrapper:px-2'

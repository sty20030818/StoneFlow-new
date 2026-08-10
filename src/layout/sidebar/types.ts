import type { ComponentType } from 'react'

import type { CommandId } from '@/features/command'
import type { SidebarMainItemKey } from '@/features/settings'
import type { ShellSectionKey } from '@/layout/types'

/** 侧栏导航链接行的最小视图模型（不含 settings key） */
export type SidebarRouteNavModel = {
	label: string
	icon: ComponentType<{ className?: string }>
	to: string
	commandId: CommandId
	badge?: string
	section: ShellSectionKey
}

/** 主导航项：带排序、可见性与配置 key */
export type MainNavItemViewModel = SidebarRouteNavModel & {
	key: string
	settingsKey: SidebarMainItemKey
	visible: boolean
	order: number
}

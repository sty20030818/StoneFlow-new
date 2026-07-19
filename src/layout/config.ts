import type { ComponentType } from 'react'

import { openSection } from '@/app/navigation'
import type { ShellSectionKey } from '@/layout/types'
import type { Scope, Space } from '@/shared/types'
import {
	ArchiveIcon,
	BoxIcon,
	InboxIcon,
	ListTodoIcon,
	Layers2Icon,
	Trash2Icon,
} from 'lucide-react'

type ShellIcon = ComponentType<{ className?: string }>
type ShellMainNavKey = 'inbox' | 'tasks' | 'views' | 'projectOverview'
type ShellFooterNavKey = 'archive' | 'trash'
type ShellCommandNavKey = ShellMainNavKey | ShellFooterNavKey

type ShellNavItem<TKey extends string = ShellCommandNavKey> = {
	key: TKey
	section: ShellSectionKey
	label: string
	icon: ShellIcon
	to: (scope: Scope, fallbackSpaceId?: string | null) => string
}

export type ShellProjectLink = {
	id: string
	label: string
	badge?: string
}

export const SHELL_NAV_ITEMS: ShellNavItem<ShellMainNavKey>[] = [
	{
		key: 'inbox',
		section: 'inbox',
		label: '收件箱',
		icon: InboxIcon,
		to: (scope, fallbackSpaceId) => openSection(scope, 'inbox', fallbackSpaceId),
	},
	{
		key: 'tasks',
		section: 'tasks',
		label: '所有任务',
		icon: ListTodoIcon,
		to: (scope, fallbackSpaceId) => openSection(scope, 'tasks', fallbackSpaceId),
	},
	{
		key: 'views',
		section: 'views',
		label: '视图',
		icon: Layers2Icon,
		to: (scope, fallbackSpaceId) => openSection(scope, 'views', fallbackSpaceId),
	},
	{
		key: 'projectOverview',
		section: 'projects',
		label: '项目总览',
		icon: BoxIcon,
		to: (scope, fallbackSpaceId) => openSection(scope, 'projects', fallbackSpaceId),
	},
]

export const SHELL_FOOTER_ITEMS: ShellNavItem<ShellFooterNavKey>[] = [
	{
		key: 'archive',
		section: 'archive',
		label: '归档',
		icon: ArchiveIcon,
		to: (scope, fallbackSpaceId) => openSection(scope, 'archive', fallbackSpaceId),
	},
	{
		key: 'trash',
		section: 'trash',
		label: '回收站',
		icon: Trash2Icon,
		to: (scope, fallbackSpaceId) => openSection(scope, 'trash', fallbackSpaceId),
	},
]

export function getSectionLabel(section: ShellSectionKey) {
	switch (section) {
		case 'inbox':
			return '收件箱'
		case 'tasks':
			return '所有任务'
		case 'views':
			return '视图'
		case 'projects':
			return '项目总览'
		case 'noProject':
			return '独立事项'
		case 'archive':
			return '归档'
		case 'trash':
			return '回收站'
		case 'settings':
			return '设置'
		default:
			return '工作区'
	}
}

export function getSpaceLabel(spaceId: string | null | undefined, spaces: Space[] = []) {
	if (!spaceId) {
		return '未选择 Space'
	}

	return spaces.find((item) => item.id === spaceId)?.name ?? spaceId
}

export function getScopeLabel(scope: Scope, spaces: Space[] = []) {
	if (scope.type === 'all') {
		return '所有空间'
	}

	return getSpaceLabel(scope.spaceId, spaces)
}

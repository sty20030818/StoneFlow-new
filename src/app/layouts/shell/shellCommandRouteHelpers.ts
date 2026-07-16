import type { ShellSectionKey } from '@/app/layouts/shell/types'
import type { CommandFocusContext, CommandRouteContext } from '@/features/command'

/** 当前壳 section → 命令系统 route.page（影响哪些命令 enabled）。 */
export function resolveCommandRoutePage(section: ShellSectionKey): CommandRouteContext['page'] {
	switch (section) {
		case 'tasks':
			return 'tasks'
		case 'views':
			return 'views'
		case 'projects':
			return 'projects'
		case 'archive':
			return 'archive'
		case 'trash':
			return 'trash'
		case 'inbox':
		case 'noProject':
			return 'inbox'
		default:
			return 'unknown'
	}
}

/**
 * 焦点面板优先级：命令板 > 快捷键帮助/创建弹层 > 预览 > 详情抽屉 > 主区。
 * 用于 shortcut / command enabled 的 focus 上下文。
 */
export function resolveCommandActivePanel({
	isCommandOpen,
	isShortcutHelpOpen,
	isModalOpen,
	isPreviewOpen,
	isDetailOpen,
}: {
	isCommandOpen: boolean
	isShortcutHelpOpen: boolean
	isModalOpen: boolean
	isPreviewOpen: boolean
	isDetailOpen: boolean
}): CommandFocusContext['activePanel'] {
	if (isCommandOpen) {
		return 'command-menu'
	}
	if (isShortcutHelpOpen) {
		return 'modal'
	}
	if (isModalOpen) {
		return 'modal'
	}
	if (isPreviewOpen) {
		return 'preview'
	}
	if (isDetailOpen) {
		return 'detail'
	}
	return 'main'
}

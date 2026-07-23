import type { CommandFocusContext } from '@/features/command'

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
	if (isShortcutHelpOpen || isModalOpen) {
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

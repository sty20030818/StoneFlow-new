/** 高于页面/行级快捷键的交互层；打开时由浮层自己优先处理键盘事件。 */
export const HIGHER_INTERACTION_LAYER_SELECTOR = [
	'[data-slot="command-backdrop"]',
	'[data-slot="dialog-content"]',
	'[data-slot="dropdown-menu-content"]',
	'[data-slot="context-menu-content"]',
	'[data-slot="select-content"]',
	'[data-slot="popover-content"]',
	'[data-slot="sheet-content"]',
	'[data-shell-drawer-root="true"]',
].join(', ')

export function isHigherInteractionLayerOpen() {
	return Boolean(document.querySelector(HIGHER_INTERACTION_LAYER_SELECTOR))
}

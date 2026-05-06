/** 行内实体触发器：在此区域内右键时不冒泡到「整块侧栏」 ContextMenu */
export const SIDEBAR_ENTITY_SELECTOR = [
	'a[href]',
	'button',
	'[data-slot="dropdown-menu-trigger"]',
	'[data-slot="dropdown-menu-content"]',
	'[data-slot="context-menu-content"]',
].join(', ')

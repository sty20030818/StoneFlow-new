/**
 * 任务行被批量勾选（非 Drawer 当前打开）时的表面样式：透明边框 + 浅蓝底与 hover（与主题 soft 一致）。
 * 与 LINEAR_CARD_ACTIVE / Project 行 Drawer 激活态同时存在时，由页面将 ACTIVE 写在之后以覆盖。
 */
export const TASK_ROW_BULK_SELECTED_CLASS =
	'border-transparent bg-(--sf-color-task-bulk-selected-surface) hover:bg-(--sf-color-task-bulk-selected-surface-hover)'

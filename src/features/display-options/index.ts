/**
 * @fileoverview **display-options · 唯一对外公共面（`@/features/display-options`）**
 *
 * 任务列表显示选项（分组/排序/属性可见性）与 apply 适配器。
 *
 * 外模块：`import { … } from '@/features/display-options'`
 * 禁止：`@/features/display-options/core|model|adapters|components/…`
 */

// ── Core keys / types ───────────────────────────────────────────────────────

export type { TaskDisplayPageKey, TaskDisplayPropertyKey } from './core'

export {
	createTaskDisplayViewPageKey,
	isTaskDisplayPageKey,
	TASK_DISPLAY_STATIC_PAGE_KEYS,
} from './core'

// ── Model hooks ─────────────────────────────────────────────────────────────

export { useTaskDisplayOptions, taskDisplayOptionsKeys } from './model'

// ── Task adapter（列表页 apply） ────────────────────────────────────────────

export { applyTaskDisplayOptionsToTasks, createTaskDisplayApplyContext } from './adapters/task'

// ── UI ──────────────────────────────────────────────────────────────────────

/** 工具条「显示」按钮。 */
export { DisplayOptionsButton } from './components'

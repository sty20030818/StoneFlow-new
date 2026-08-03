/**
 * display-options 对外公共面（`@/features/display-options`）。
 *
 * @remarks
 * 外模块只能：`import { … } from '@/features/display-options'`。
 * 禁止深路径进 core/model/adapters/components。
 * 任务列表显示选项（分组/排序/属性）与 apply 适配器。
 */

// ── Core keys / types ───────────────────────────────────────────────────────

export type {
	TaskDisplayOrderBy,
	TaskDisplayPageKey,
	TaskDisplayPreferenceRecord,
	TaskDisplayPropertyKey,
} from './core'

export { createTaskDisplayViewPageKey } from './core'

// ── Model hooks ─────────────────────────────────────────────────────────────

export { useTaskDisplayOptions } from './model'

/** 偏好读写（View 呈现迁移等） */
export { updateTaskDisplayPreference } from './api/displayOptions'

// ── Task adapter（列表页 apply） ────────────────────────────────────────────

export { applyTaskDisplayOptionsToTasks, createTaskDisplayApplyContext } from './adapters/task'

// ── UI ──────────────────────────────────────────────────────────────────────

/** 工具条「显示」按钮。 */
export { DisplayOptionsButton } from './components'

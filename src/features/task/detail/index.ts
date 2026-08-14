/**
 * @internal **task 内部 barrel · 不是 public 入口**
 *
 * 外模块请使用：
 * ```ts
 * import { TaskDetailContent, TaskPreview, … } from '@/features/task'
 * ```
 *
 * 本文件仅方便 `features/task/**` 内短路径引用；跨 feature 深路径
 * `@/features/task/detail` 由边界扫描禁止。
 */

export { TaskDetailContent } from './components/TaskDetailContent'
export { TaskPage } from './components/TaskPage'
export { TaskPreview } from './components/TaskPreview'
export { useTaskDetailViewModel, type TaskDetailViewModel } from './model/useTaskDetailViewModel'
export type { TaskDetailDraft, TaskDetailPatch } from './model/taskDetailDraft'
export {
	applyTaskPlacementDraftChange,
	createTaskDetailDraft,
	getTaskDetailPatch,
	normalizeTaskDetailDraft,
} from './model/taskDetailDraft'
export {
	TaskPreviewProvider,
	useRegisterTaskPreviewSource,
	useTaskPreviewContext,
} from './model/TaskPreviewProvider'
export { useTaskPreviewController } from './model/useTaskPreviewController'

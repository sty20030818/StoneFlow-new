/**
 * @fileoverview **danger-confirm · 唯一对外公共面**
 *
 * 危险操作确认（归档 / 回收站 / 永久删除）。壳挂 Provider；行菜单 / bulk 调 hook。
 *
 * 外模块：`import { … } from '@/features/danger-confirm'`
 * 禁止：`@/features/danger-confirm/runtime|model|components/…`
 */

/** 确认文案与请求类型（纯 model）。 */
export {
	type DangerConfirmIntent,
	type DangerConfirmEntityType,
	type DangerConfirmRequest,
	type DangerConfirmCopy,
	buildDangerConfirmCopy,
} from './model/dangerConfirm'

/** Provider + `useDangerConfirm()`（runtime）。 */
export { DangerConfirmProvider, useDangerConfirm } from './runtime/DangerConfirmProvider'

/** 确认对话框 UI（通常由 Provider 内部挂载；测试可直接用）。 */
export { DangerConfirmDialog } from './components/DangerConfirmDialog'

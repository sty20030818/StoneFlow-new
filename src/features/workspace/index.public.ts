/**
 * @fileoverview **workspace · 唯一对外公共面**
 *
 * 工作区级同步/失效编排（壳 route 挂载）。
 *
 * 外模块：`import { … } from '@/features/workspace'`
 * 禁止：`@/features/workspace/model|api/…`
 */

/** 按 scope 订阅 workspace 变更并定向 invalidate。 */
export { useWorkspaceSync } from './model/useWorkspaceSync'

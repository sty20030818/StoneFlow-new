/**
 * @fileoverview **metadata-fields · 唯一对外公共面**
 *
 * 元数据控件与 action spec（状态/优先级/日期/归属）。task/project/command 复用。
 *
 * 外模块：`import { … } from '@/features/metadata-fields'`
 * 禁止：`@/features/metadata-fields/core|components|adapters/…`
 *
 * 注意：纯 task 标签/图标优先走 `@/features/task`；本 feature 提供通用 metadata UI 协议。
 */

export * from './core'
export * from './components'
export * from './adapters'

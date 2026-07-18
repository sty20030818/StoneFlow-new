/**
 * @fileoverview **launcher · 唯一对外公共面（`@/features/launcher`）**
 *
 * 独立窗 Launcher 完整栈。外层一般只挂路由页。
 *
 * 外模块：`import { … } from '@/features/launcher'`
 * 禁止 deep-import `chrome|composer|results|domain|session|…`
 */

/** Launcher 窗口根页面（`routes/launcher`）。 */
export { LauncherPage } from './LauncherPage'

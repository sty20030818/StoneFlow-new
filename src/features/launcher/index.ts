/**
 * launcher 域对外公共面（`@/features/launcher`）。
 *
 * @remarks
 * 外模块只能：`import { LauncherPage } from '@/features/launcher'`。
 * 禁止 deep-import chrome/composer/domain/session/…。
 * 独立窗：快速记任务 + 打开已有任务/项目；创建走 task，搜索走 global-search。
 */

/** Launcher 窗口根页面（`routes/launcher`）。 */
export { LauncherPage } from './LauncherPage'

/**
 * project-overview 对外公共面（`@/features/project-overview`）。
 *
 * @remarks
 * 外模块只能：`import { ProjectOverviewPage } from '@/features/project-overview'`。
 * 禁止深路径进 components/hooks。
 * 薄 scene：数据与 mutation 只走 `@/features/project` public。
 */

/** 项目总览页（routes `/projects`）。 */
export { ProjectOverviewPage } from './components/ProjectOverviewPage'

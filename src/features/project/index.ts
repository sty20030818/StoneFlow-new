/**
 * project 域对外公共面（`@/features/project`）。
 *
 * @remarks
 * 外模块只能：`import { … } from '@/features/project'`。
 * 禁止深路径进 api/hooks/model/components/bulk。
 * `project-overview` 是独立 scene，勿与本包路径混淆。
 */

// ── 类型 ────────────────────────────────────────────────────────────────────

export type { ProjectDetail, ProjectOption, ProjectOverviewViewKey } from './model/types'

// ── Hooks / Query ───────────────────────────────────────────────────────────

/**
 * 侧栏 / options / 概览 / 详情数据与 mutations（仅已有外消费者）。
 */
export {
	useProjectOptions,
	useProjectOverviewData,
	useProjectSidebarData,
	useProjectSidebarQuery,
	projectDetailQueryOptions,
	useCompleteProjectMutation,
	useReopenProjectMutation,
	useArchiveProjectMutation,
	useDeleteProjectMutation,
} from './hooks'

// ── API（navigation / lifecycle / bulk 装配）────────────────────────────────

export {
	listAllVisibleProjects,
	getProjectDetail,
	restoreProject,
	deleteProject,
} from './api/projects'

// ── UI ──────────────────────────────────────────────────────────────────────

/** 项目详情页（routes `/projects/$projectId`）。 */
export { ProjectPage } from './components/ProjectPage'

/** 概览 / lifecycle 风格项目看板。 */
export { ProjectBoard, type ProjectBoardProps } from './components/ProjectBoard'

/** 壳层新建项目对话框内容。 */
export { ProjectCreateContent } from './components/ProjectCreateContent'

/** 项目行适配器（overview 列表复用）。 */
export { ProjectRowAdapter } from './components/ProjectRowAdapter'

// ── 批量 / 命令 ─────────────────────────────────────────────────────────────

/**
 * 项目批量：动作定义 + adapter。
 * 壳 Boundary 只 compose 各域 public。
 */
export { projectBulkActions, createProjectBulkAdapter } from './bulk'

/** 命令选中快照（项目列表 → command）。 */
export { buildProjectCommandSelection } from './model/buildProjectCommandSelection'
export {
	buildProjectSections,
	PROJECT_SECTION_ORDER,
	type ProjectSection,
	type ProjectSectionKey,
} from './model/buildProjectSections'

/** 项目多选 bulk 命令 handlers（供壳 compose）。 */
export { registerProjectCommands } from './commands/registerProjectCommands'

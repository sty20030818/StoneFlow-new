/**
 * @fileoverview **project · 唯一对外公共面（`@/features/project`）**
 *
 * 项目实体：概览/详情/侧栏数据、CRUD mutations、看板与创建 UI。
 *
 * 外模块：`import { … } from '@/features/project'`
 * 禁止：`@/features/project/api|hooks|model|components/…`
 *
 * 注意：`project-overview` 是独立 scene feature，路径勿与本 feature 混淆。
 */

// ── 类型 ────────────────────────────────────────────────────────────────────

export type {
	ProjectDetail,
	ProjectOption,
	ProjectOverviewViewKey,
	ProjectExecutionTask,
	ProjectFormInput,
	ProjectUpdateInput,
} from './model/types'

// ── Hooks / Query ───────────────────────────────────────────────────────────

export {
	useProjectOptions,
	useProjectOverviewData,
	useProjectSidebarData,
	useProjectDetailData,
	useProjectOverviewQuery,
	useProjectSidebarQuery,
	useProjectOptionsQuery,
	useViewsProjectOptionsQuery,
	useProjectDetailQuery,
	useSuspenseProjectDetailQuery,
	projectDetailQueryOptions,
	toProjectOptions,
	useCreateProjectMutation,
	useUpdateProjectMutation,
	useCompleteProjectMutation,
	useReopenProjectMutation,
	useArchiveProjectMutation,
	useRestoreProjectMutation,
	useDeleteProjectMutation,
	projectKeys,
} from './hooks'

// ── API（badge / bulk / navigation 等） ─────────────────────────────────────

export {
	listProjectOverview,
	listAllVisibleProjects,
	listSidebarProjects,
	getProjectDetail,
	createProject,
	updateProject,
	completeProject,
	reopenProject,
	archiveProject,
	restoreProject,
	deleteProject,
} from './api/projects'

// ── 官方组件 ────────────────────────────────────────────────────────────────

/** 项目详情页（routes `/projects/$projectId`）。 */
export { ProjectPage } from './components/ProjectPage'

/** 概览/lifecycle 风格项目看板。 */
export { ProjectBoard } from './components/ProjectBoard'

/** 壳层新建项目对话框内容。 */
export { ProjectCreateContent } from './components/ProjectCreateContent'

/** 项目行适配器（overview 列表复用）。 */
export { ProjectRowAdapter } from './components/ProjectRowAdapter'

/**
 * 项目批量：动作定义 + adapter。
 * 壳 Boundary 只 compose 各域 public，bulk-action 只做引擎。
 */
export {
	getProjectBulkActionDefinition,
	projectBulkActionDefinitions,
	projectBulkActions,
	createProjectBulkAdapter,
	type ProjectBulkAdapter,
	type ProjectBulkMutationReport,
} from './bulk'

/** 命令选中快照（项目列表 → command）。 */
export { buildProjectCommandSelection } from './model/buildProjectCommandSelection'

/** 项目多选 bulk 命令 handlers（供壳 compose）。 */
export { registerProjectCommands } from './commands/registerProjectCommands'

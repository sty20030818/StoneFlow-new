/**
 * @fileoverview **submit · 唯一对外公共面（`@/features/submit`）**
 *
 * 提交目标注册（表单 ↔ 命令板 Enter 提交）。壳挂 Provider；创建/编辑表单注册 target。
 *
 * 外模块：`import { … } from '@/features/submit'`
 * 禁止：`@/features/submit/model/…`
 */

/** 提交注册表 Provider（layout ShellProviders）。 */
export {
	SubmitRegistryProvider,
	useRegisterSubmitTarget,
	useSubmitRegistryActions,
	useSubmitRegistryContext,
} from './model/SubmitRegistryProvider'

export type {
	SubmitIntent,
	SubmitTarget,
	SubmitTargetContext,
} from './model/SubmitRegistryProvider'

/**
 * 从 RHF form 派生 submit target 并注册。
 * Task/Project/Space/View 创建编辑对话框使用。
 */
export { useSubmitTargetFromForm } from './model/use-submit-target-from-form'

/** 表单提交命令 handlers（供壳 compose）。 */
export { registerSubmitCommands } from './commands/registerSubmitCommands'

import type { CommandHostContext, ShellCommandActions } from '@/features/command'

/**
 * 向壳命令宿主注册表单提交 handlers（默认提交 / 继续创建 / 提交并打开）。
 * 实际提交目标由 SubmitRegistry 中当前最高优先级 target 决定。
 */
export function registerSubmitCommands(
	host: Pick<CommandHostContext, 'submitRegistryActions'>,
): Pick<ShellCommandActions, 'submitActiveForm' | 'submitAndContinue' | 'submitAndOpen'> {
	return {
		submitActiveForm: async () => {
			await host.submitRegistryActions.submitActiveTarget()
		},
		submitAndContinue: async () => {
			await host.submitRegistryActions.submitActiveTarget('continue')
		},
		submitAndOpen: async () => {
			await host.submitRegistryActions.submitActiveTarget('open')
		},
	}
}

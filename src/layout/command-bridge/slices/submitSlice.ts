import type { ShellCommandActions } from '@/features/command'
import type { ShellCommandBridgeDeps } from '../types'

/** 表单提交类命令（走 SubmitRegistry） */
export function createSubmitSlice(
	deps: Pick<ShellCommandBridgeDeps, 'submitRegistryActions'>,
): Partial<ShellCommandActions> {
	return {
		submitActiveForm: async () => {
			await deps.submitRegistryActions.submitActiveTarget()
		},
		submitAndContinue: async () => {
			await deps.submitRegistryActions.submitActiveTarget('continue')
		},
		submitAndOpen: async () => {
			await deps.submitRegistryActions.submitActiveTarget('open')
		},
	}
}

import {
	createCommandBulkSelectionSnapshot,
	shouldClearBulkSelection,
	showBulkActionResultToast,
	type BulkActionId,
	type BulkActionPayload,
	type BulkActionResultMessageLabels,
	type BulkEntityType,
	type useBulkActionContext,
} from '@/features/bulk-action'
import type { CommandContext, CommandInvocation } from '@/features/command'

type RunBulkAction = ReturnType<typeof useBulkActionContext>['runBulkAction']

/**
 * 命令板选中 → bulk 引擎执行（成功后清选中 + toast）。
 */
export function createRunEntityBulkActionFromCommand(runBulkAction: RunBulkAction) {
	return async (
		ctx: CommandContext,
		invocation: CommandInvocation,
		entity: BulkEntityType,
		actionId: BulkActionId,
		labels: BulkActionResultMessageLabels,
		payload?: BulkActionPayload,
	) => {
		if (ctx.selection.type !== entity || ctx.selection.ids.length === 0) {
			return
		}
		const snapshot = createCommandBulkSelectionSnapshot(
			ctx.selection,
			entity,
			resolveBulkSelectionSource(invocation, ctx.selection.ids.length),
		)
		const result = await runBulkAction(actionId, snapshot, payload)
		if (shouldClearBulkSelection(result)) {
			ctx.selection.clearSelection?.()
		}
		const feedback = showBulkActionResultToast(result, labels)
		if (feedback.shouldThrow) {
			throw result.error
		}
	}
}

function resolveBulkSelectionSource(invocation: CommandInvocation, selectionCount: number) {
	if (invocation.source === 'row' && selectionCount !== 1) {
		throw new Error('行操作只能执行单条命令')
	}
	return invocation.source
}

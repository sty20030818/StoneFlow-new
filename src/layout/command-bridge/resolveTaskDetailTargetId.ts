import type { CommandContext } from '@/features/command/core'

/** 从命令上下文解析当前应操作的任务 id（行焦点 / 单选 / primary）。 */
export function resolveTaskDetailTargetId(ctx: CommandContext): string | null {
	if (ctx.rowTarget.isTaskTarget && ctx.rowTarget.targetId) {
		return ctx.rowTarget.targetId
	}
	if (ctx.selection.focusedType === 'task' && ctx.selection.focusedId) {
		return ctx.selection.focusedId
	}
	if (ctx.selection.primaryEntity?.type === 'task') {
		return ctx.selection.primaryEntity.id
	}
	if (
		ctx.selection.type === 'task' &&
		ctx.selection.isSingleSelection &&
		ctx.selection.ids.length === 1
	) {
		return ctx.selection.ids[0]
	}
	return null
}

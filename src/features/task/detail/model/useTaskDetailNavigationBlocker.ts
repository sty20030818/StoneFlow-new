import { useBlocker } from '@tanstack/react-router'

type TaskDetailNavigationBlockerOptions = {
	isDirty: boolean
	flushNow: () => Promise<boolean>
}

/** 所有路由离开路径都必须先兑现当前任务草稿。 */
export function useTaskDetailNavigationBlocker({
	isDirty,
	flushNow,
}: TaskDetailNavigationBlockerOptions) {
	useBlocker({
		disabled: !isDirty,
		enableBeforeUnload: isDirty,
		shouldBlockFn: async () => !(await flushNow()),
	})
}

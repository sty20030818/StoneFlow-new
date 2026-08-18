/** Virtual Board 的外部目标桥；调用方不接触 virtualizer 或 DOM。 */

type TaskBoardTargetHandler = (taskId: string) => void

let scrollToTaskIdImpl: TaskBoardTargetHandler | null = null
let focusTaskIdImpl: TaskBoardTargetHandler | null = null

export function registerTaskBoardScrollToTaskId(fn: TaskBoardTargetHandler | null) {
	scrollToTaskIdImpl = fn
}

export function scrollTaskBoardToTaskId(taskId: string) {
	scrollToTaskIdImpl?.(taskId)
}

export function registerTaskBoardFocusTaskId(fn: TaskBoardTargetHandler | null) {
	focusTaskIdImpl = fn
}

export function focusTaskBoardTaskId(taskId: string) {
	focusTaskIdImpl?.(taskId)
}

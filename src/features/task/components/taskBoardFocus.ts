/** Virtual Board 的 stable-id 焦点桥；外部调用方不接触 virtualizer 或 DOM。 */

type TaskBoardFocusHandler = (taskId: string) => void

let focusTaskIdImpl: TaskBoardFocusHandler | null = null

export function registerTaskBoardFocusTaskId(fn: TaskBoardFocusHandler | null) {
	focusTaskIdImpl = fn
}

export function focusTaskBoardTaskId(taskId: string) {
	focusTaskIdImpl?.(taskId)
}

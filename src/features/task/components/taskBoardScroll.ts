/**
 * Virtual Board 与键盘滚动的薄桥：Board 注册 scrollToTaskId，shortcut 调用。
 * 避免 shortcuts 直接依赖 virtualizer 实现。
 */

type ScrollToTaskId = (taskId: string) => void

let scrollToTaskIdImpl: ScrollToTaskId | null = null

export function registerTaskBoardScrollToTaskId(fn: ScrollToTaskId | null) {
	scrollToTaskIdImpl = fn
}

export function scrollTaskBoardToTaskId(taskId: string) {
	scrollToTaskIdImpl?.(taskId)
}

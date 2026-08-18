import {
	focusTaskBoardTaskId,
	registerTaskBoardFocusTaskId,
	registerTaskBoardScrollToTaskId,
	scrollTaskBoardToTaskId,
} from './taskBoardScroll'

afterEach(() => {
	registerTaskBoardScrollToTaskId(null)
	registerTaskBoardFocusTaskId(null)
})

it('独立转发滚动与真实焦点请求', () => {
	const scroll = vi.fn()
	const focus = vi.fn()
	registerTaskBoardScrollToTaskId(scroll)
	registerTaskBoardFocusTaskId(focus)

	scrollTaskBoardToTaskId('task-a')
	focusTaskBoardTaskId('task-b')

	expect(scroll).toHaveBeenCalledWith('task-a')
	expect(focus).toHaveBeenCalledWith('task-b')
})

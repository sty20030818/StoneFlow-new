import { focusTaskBoardTaskId, registerTaskBoardFocusTaskId } from './taskBoardFocus'

afterEach(() => registerTaskBoardFocusTaskId(null))

it('按 stable task id 转发真实焦点请求', () => {
	const focus = vi.fn()
	registerTaskBoardFocusTaskId(focus)

	focusTaskBoardTaskId('task-b')

	expect(focus).toHaveBeenCalledWith('task-b')
})

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { EntityDetailDrawerHost } from './EntityDetailDrawerHost'

type MockTaskDetailViewModel = {
	status: 'ready'
	autosave: { flushNow: () => Promise<boolean> }
	draftTitle: string
	setDraftTitle: (value: string) => void
}

const useTaskDetailViewModelMock = vi.hoisted(() => vi.fn())
const focusTaskBoardTaskIdMock = vi.hoisted(() => vi.fn())

vi.mock('@/features/task', () => ({
	focusTaskBoardTaskId: focusTaskBoardTaskIdMock,
	useTaskDetailViewModel: useTaskDetailViewModelMock,
	TaskDetailContent: ({
		onClose,
		scrollRef,
		viewModel,
	}: {
		onClose: () => void
		scrollRef: React.Ref<HTMLDivElement>
		viewModel: MockTaskDetailViewModel
	}) => (
		<div ref={scrollRef} data-testid='task-detail-viewport'>
			<input
				aria-label='任务详情草稿'
				onChange={(event) => viewModel.setDraftTitle(event.currentTarget.value)}
				value={viewModel.draftTitle}
			/>
			<button onClick={onClose} type='button'>
				关闭内容
			</button>
		</div>
	),
}))

describe('EntityDetailDrawerHost', () => {
	const onClose = vi.fn<() => void>()

	beforeEach(() => {
		onClose.mockReset()
		focusTaskBoardTaskIdMock.mockReset()
		useTaskDetailViewModelMock.mockReset().mockImplementation(function useMockTaskDetailViewModel({
			taskId,
		}: {
			taskId: string
		}) {
			const [draftTitle, setDraftTitle] = useState('草稿 ' + taskId)
			return {
				status: 'ready',
				autosave: { flushNow: vi.fn().mockResolvedValue(true) },
				draftTitle,
				setDraftTitle,
			} satisfies MockTaskDetailViewModel
		})
	})

	afterEach(() => vi.restoreAllMocks())

	it('desktop 提供可访问的详情侧栏并连接当前任务', () => {
		renderHost({ children: <div data-testid='main-content'>任务列表</div> })

		expect(screen.getByTestId('main-content')).toHaveTextContent('任务列表')
		expect(screen.getByRole('complementary', { name: '任务详情' })).toBeInTheDocument()
		expect(screen.getByRole('separator', { name: '调整任务详情宽度' })).toHaveAttribute(
			'aria-orientation',
			'vertical',
		)
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
		expect(useTaskDetailViewModelMock).toHaveBeenCalledWith({ taskId: 'task-a', onClose })
	})

	it('compact 提供详情 dialog，并阻断行级字符快捷键冒泡', async () => {
		const onWindowKeyDown = vi.fn()
		window.addEventListener('keydown', onWindowKeyDown)
		renderHost({ isCompact: true })

		const dialog = await screen.findByRole('dialog', { name: '任务详情' })
		expect(screen.queryByRole('complementary', { name: '任务详情' })).not.toBeInTheDocument()
		fireEvent.keyDown(dialog, { key: 'w' })
		expect(onWindowKeyDown).not.toHaveBeenCalled()

		window.removeEventListener('keydown', onWindowKeyDown)
	})

	it('跨断点保留草稿、滚动位置与主集合 DOM', async () => {
		const children = <div data-testid='main-content'>任务列表</div>
		const view = renderHost({ children })
		const mainContent = screen.getByTestId('main-content')
		const viewport = screen.getByTestId('task-detail-viewport')
		viewport.scrollTop = 180
		fireEvent.change(screen.getByRole('textbox', { name: '任务详情草稿' }), {
			target: { value: '断点切换中的草稿' },
		})

		view.rerender(createHost({ children, isCompact: true }))
		await screen.findByRole('dialog', { name: '任务详情' })

		expect(screen.getByTestId('main-content')).toBe(mainContent)
		expect(screen.getByRole('textbox', { name: '任务详情草稿' })).toHaveValue('断点切换中的草稿')
		expect(screen.getByTestId('task-detail-viewport')).toHaveProperty('scrollTop', 180)
		expect(onClose).not.toHaveBeenCalled()
	})

	it('切换任务时按 taskId 恢复各自滚动位置', () => {
		const view = renderHost()
		const viewport = screen.getByTestId('task-detail-viewport')
		viewport.scrollTop = 180

		view.rerender(createHost({ activeDetail: { kind: 'task', id: 'task-b' } }))
		expect(screen.getByTestId('task-detail-viewport')).toBe(viewport)
		expect(viewport).toHaveProperty('scrollTop', 0)

		view.rerender(createHost())
		expect(viewport).toHaveProperty('scrollTop', 180)
	})

	it('关闭详情后恢复仍连接的原焦点元素', async () => {
		const view = render(
			<>
				<button type='button'>任务行</button>
				{createHost({ open: false })}
			</>,
		)
		screen.getByRole('button', { name: '任务行' }).focus()

		view.rerender(
			<>
				<button type='button'>任务行</button>
				{createHost()}
			</>,
		)
		fireEvent.focus(screen.getByRole('button', { name: '关闭内容' }))
		view.rerender(
			<>
				<button type='button'>任务行</button>
				{createHost({ open: false })}
			</>,
		)

		await waitFor(() => expect(screen.getByRole('button', { name: '任务行' })).toHaveFocus())
	})

	it('原任务行已卸载时恢复集合根并请求 stable id 重挂聚焦', async () => {
		const view = render(
			<div data-board-root='true' tabIndex={-1}>
				<div data-task-id='task-a'>
					<button type='button'>任务行</button>
				</div>
				{createHost({ open: false })}
			</div>,
		)
		screen.getByRole('button', { name: '任务行' }).focus()

		view.rerender(
			<div data-board-root='true' tabIndex={-1}>
				<div data-task-id='task-a'>
					<button type='button'>任务行</button>
				</div>
				{createHost()}
			</div>,
		)
		fireEvent.focus(screen.getByRole('button', { name: '关闭内容' }))
		view.rerender(
			<div data-board-root='true' tabIndex={-1}>
				<div />
				{createHost({ open: false })}
			</div>,
		)

		await waitFor(() => expect(document.querySelector('[data-board-root="true"]')).toHaveFocus())
		expect(focusTaskBoardTaskIdMock).toHaveBeenCalledWith('task-a')
	})

	it('无 active detail 时不渲染实体内容', () => {
		const { container } = renderHost({ activeDetail: null })
		expect(container).toBeEmptyDOMElement()
	})

	function renderHost(
		overrides: Partial<React.ComponentProps<typeof EntityDetailDrawerHost>> = {},
	) {
		return render(createHost(overrides))
	}

	function createHost(
		overrides: Partial<React.ComponentProps<typeof EntityDetailDrawerHost>> = {},
	) {
		return (
			<EntityDetailDrawerHost
				activeDetail={{ kind: 'task', id: 'task-a' }}
				isCompact={false}
				onClose={onClose}
				open
				{...overrides}
			/>
		)
	}
})

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { isAnyModalOpen } from '@/shared/lib/modal-guard'
import { EntityDetailDrawerHost } from './EntityDetailDrawerHost'

type MockTaskDetailViewModel = {
	status: 'ready'
	autosave: { flushNow: () => Promise<boolean> }
	draftTitle: string
	setDraftTitle: (value: string) => void
}

const useTaskDetailViewModelMock = vi.hoisted(() => vi.fn())

vi.mock('@/features/task', () => ({
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
		useTaskDetailViewModelMock.mockReset().mockImplementation(function useMockTaskDetailViewModel({
			taskId,
		}: {
			taskId: string
		}) {
			const [draftTitle, setDraftTitle] = useState(`草稿 ${taskId}`)
			return {
				status: 'ready',
				autosave: { flushNow: vi.fn().mockResolvedValue(true) },
				draftTitle,
				setDraftTitle,
			} satisfies MockTaskDetailViewModel
		})
	})

	afterEach(() => vi.restoreAllMocks())

	it('desktop 使用 HeroUI Resizable 构建列表与 Aside 双栏', () => {
		renderHost({ children: <div data-testid='main-content'>任务列表</div> })

		expect(screen.getByTestId('main-content')).toHaveTextContent('任务列表')
		const aside = screen.getByRole('complementary', { name: '任务详情' })
		expect(aside).toBeInTheDocument()
		expect(fireEvent.contextMenu(aside)).toBe(false)
		expect(screen.getByRole('separator', { name: '调整任务详情宽度' })).toHaveAttribute(
			'aria-orientation',
			'vertical',
		)
		const panels = document.querySelectorAll<HTMLElement>('[data-slot="resizable-panel"]')
		expect(panels).toHaveLength(2)
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
		expect(document.querySelector('[data-slot="sheet-backdrop"]')).not.toBeInTheDocument()
		expect(useTaskDetailViewModelMock).toHaveBeenCalledWith({ taskId: 'task-a', onClose })
	})

	it('compact 使用 MainCard scope 内的 HeroUI 原生 opaque Sheet', async () => {
		renderHost({ children: <div data-testid='main-content'>任务列表</div>, isCompact: true })

		const dialog = await screen.findByRole('dialog', { name: '任务详情' })
		const closeTrigger = screen.getByRole('button', { name: '关闭任务详情' })
		const layout = document.querySelector<HTMLElement>('[data-entity-detail-layout="true"]')
		const backdrop = document.querySelector<HTMLElement>('[data-slot="sheet-backdrop"]')
		const content = document.querySelector<HTMLElement>('[data-slot="sheet-content"]')

		expect(layout).toContainElement(backdrop)
		expect(backdrop).toHaveClass('absolute', 'before:absolute', 'sheet__backdrop--opaque')
		expect(content).toHaveClass(
			'absolute',
			'w-[min(420px,calc(100%_-_16px))]',
			'h-full',
			'max-w-none',
		)
		expect(dialog).toHaveClass('h-full', 'rounded-none')
		expect(closeTrigger).toHaveClass('z-10')
		expect(document.querySelector('[data-entity-detail-aside="true"]')).not.toBeInTheDocument()
		expect(document.querySelectorAll('[data-slot="resizable-panel"]')).toHaveLength(1)
	})

	it('跨断点只切换容器，并保留 viewModel 草稿、滚动位置与主集合 DOM', async () => {
		const children = <div data-testid='main-content'>任务列表</div>
		const view = renderHost({ children })
		const mainContent = screen.getByTestId('main-content')
		const desktopViewport = screen.getByTestId('task-detail-viewport')
		desktopViewport.scrollTop = 180
		fireEvent.change(screen.getByRole('textbox', { name: '任务详情草稿' }), {
			target: { value: '断点切换中的草稿' },
		})

		view.rerender(createHost({ children, isCompact: true }))

		await screen.findByRole('dialog', { name: '任务详情' })
		expect(screen.getByTestId('main-content')).toBe(mainContent)
		expect(screen.getByRole('textbox', { name: '任务详情草稿' })).toHaveValue('断点切换中的草稿')
		expect(screen.getByTestId('task-detail-viewport')).toHaveProperty('scrollTop', 180)

		view.rerender(createHost({ children, isCompact: false }))

		expect(screen.getByRole('complementary', { name: '任务详情' })).toBeInTheDocument()
		expect(screen.getByRole('textbox', { name: '任务详情草稿' })).toHaveValue('断点切换中的草稿')
		expect(screen.getByTestId('task-detail-viewport')).toHaveProperty('scrollTop', 180)
		expect(onClose).not.toHaveBeenCalled()
	})

	it('compact Sheet 注册模态闸门，切回 desktop 后立即释放', async () => {
		const view = renderHost({ isCompact: true })
		await waitFor(() => expect(isAnyModalOpen()).toBe(true))

		view.rerender(createHost({ isCompact: false }))
		await waitFor(() => expect(isAnyModalOpen()).toBe(false))
	})

	it('compact 使用 Sheet 原生关闭触发器清理详情意图', async () => {
		renderHost({ isCompact: true })

		fireEvent.click(await screen.findByRole('button', { name: '关闭任务详情' }))
		await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
	})

	it('打开和关闭详情时不重建主集合 DOM', () => {
		const children = <div data-testid='main-content'>任务列表</div>
		const view = renderHost({ children })
		const mainContent = screen.getByTestId('main-content')

		view.rerender(createHost({ children, open: false }))
		expect(screen.getByTestId('main-content')).toBe(mainContent)

		view.rerender(createHost({ children }))
		expect(screen.getByTestId('main-content')).toBe(mainContent)
	})

	it('切换任务时按 taskId 恢复真实滚动 viewport', () => {
		const view = renderHost()
		const firstViewport = screen.getByTestId('task-detail-viewport')
		firstViewport.scrollTop = 180

		view.rerender(createHost({ activeDetail: { kind: 'task', id: 'task-b' } }))
		expect(screen.getByTestId('task-detail-viewport')).toBe(firstViewport)
		expect(screen.getByTestId('task-detail-viewport')).toHaveProperty('scrollTop', 0)

		view.rerender(createHost())
		expect(screen.getByTestId('task-detail-viewport')).toHaveProperty('scrollTop', 180)
	})

	it('关闭详情后恢复仍连接的原焦点元素', async () => {
		const view = render(
			<>
				<button type='button'>任务行</button>
				{createHost({ open: false })}
			</>,
		)
		const trigger = screen.getByRole('button', { name: '任务行' })
		trigger.focus()

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

	it('原任务行已卸载时恢复已捕获的集合根', async () => {
		const view = render(
			<div data-board-root='true' tabIndex={-1}>
				<div>
					<button type='button'>任务行</button>
				</div>
				{createHost({ open: false })}
			</div>,
		)
		screen.getByRole('button', { name: '任务行' }).focus()

		view.rerender(
			<div data-board-root='true' tabIndex={-1}>
				<div>
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
	})

	it('关闭或无 active detail 时不渲染实体内容', () => {
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

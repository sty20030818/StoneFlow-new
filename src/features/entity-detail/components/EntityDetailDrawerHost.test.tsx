import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { EntityDetailDrawerHost } from './EntityDetailDrawerHost'
import { isAnyModalOpen } from '@/shared/lib/modal-guard'

const useTaskDetailViewModelMock = vi.hoisted(() => vi.fn(() => ({ status: 'ready' })))

vi.mock('@/features/task', () => ({
	useTaskDetailViewModel: useTaskDetailViewModelMock,
	TaskDetailContent: ({
		onClose,
		scrollRef,
	}: {
		onClose: () => void
		scrollRef: React.Ref<HTMLDivElement>
	}) => (
		<div ref={scrollRef} data-testid='task-detail-viewport'>
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
		useTaskDetailViewModelMock.mockClear()
	})

	it('把 Main card 内的灰色模态 Sheet portal 到 Main card', async () => {
		const portalContainer = document.createElement('div')
		document.body.append(portalContainer)
		const view = renderHost({ effectivePresentation: 'sheet', portalContainer })

		expect(await screen.findByRole('dialog')).toBeInTheDocument()
		expect(screen.getByRole('heading', { name: '任务详情' })).toBeInTheDocument()
		const sheet = document.querySelector<HTMLElement>('[data-entity-detail-sheet="true"]')
		expect(portalContainer).toContainElement(sheet)
		expect(sheet).toHaveAttribute('data-sheet-detached')
		expect(sheet).toHaveStyle({
			top: '8px',
			bottom: '8px',
			height: 'auto',
			position: 'absolute',
			width: 'min(40rem, calc(100% - 1rem))',
		})
		const backdrop = document.querySelector('[data-slot="sheet-backdrop"]')
		expect(backdrop).toHaveClass('sheet__backdrop--opaque', 'sf-entity-detail-backdrop')
		expect(backdrop).toHaveStyle({ inset: '0', position: 'absolute' })
		expect(isAnyModalOpen()).toBe(true)
		expect(screen.getByRole('button', { name: '关闭任务详情' })).toBeInTheDocument()
		expect(useTaskDetailViewModelMock).toHaveBeenCalledWith({ taskId: 'task-a', onClose })

		fireEvent.click(screen.getByRole('button', { name: '关闭任务详情' }))
		expect(onClose).toHaveBeenCalledTimes(1)
		view.unmount()
		expect(isAnyModalOpen()).toBe(false)
		portalContainer.remove()
	})

	it('使用非模态 aside 与垂直 separator 呈现常驻详情', () => {
		renderHost({ effectivePresentation: 'aside', asideWidth: 480 })

		expect(screen.getByRole('complementary', { name: '任务详情' })).toHaveStyle({ width: '480px' })
		expect(screen.getByRole('separator')).toHaveAttribute('aria-orientation', 'vertical')
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
		expect(screen.getByTestId('task-detail-viewport')).toBeInTheDocument()
	})

	it('Sheet 与 Aside 切换时按 taskId 恢复真实滚动 viewport', () => {
		const view = renderHost({ effectivePresentation: 'sheet' })
		const sheetViewport = screen.getByTestId('task-detail-viewport')
		sheetViewport.scrollTop = 180

		view.rerender(createHost({ effectivePresentation: 'aside' }))
		expect(screen.getByTestId('task-detail-viewport')).toHaveProperty('scrollTop', 180)

		view.rerender(
			createHost({
				activeDetail: { kind: 'task', id: 'task-b' },
				effectivePresentation: 'aside',
			}),
		)
		expect(screen.getByTestId('task-detail-viewport')).toHaveProperty('scrollTop', 0)

		view.rerender(createHost({ effectivePresentation: 'sheet' }))
		expect(screen.getByTestId('task-detail-viewport')).toHaveProperty('scrollTop', 180)
	})

	it('关闭 Aside 后恢复仍连接的原焦点元素', async () => {
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
				{createHost({ effectivePresentation: 'aside' })}
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
				{createHost({ effectivePresentation: 'aside' })}
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

	function renderHost(overrides: Partial<React.ComponentProps<typeof EntityDetailDrawerHost>>) {
		return render(createHost(overrides))
	}

	function createHost(
		overrides: Partial<React.ComponentProps<typeof EntityDetailDrawerHost>> = {},
	) {
		return (
			<EntityDetailDrawerHost
				activeDetail={{ kind: 'task', id: 'task-a' }}
				asideWidth={480}
				effectivePresentation='sheet'
				onClose={onClose}
				open
				portalContainer={document.body}
				{...overrides}
			/>
		)
	}
})

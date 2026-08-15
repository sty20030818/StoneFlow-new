import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { SHELL_DESKTOP_MEDIA_QUERY } from '@/shared/lib/shellSidebarGeometry'
import { EntityDetailDrawerHost } from './EntityDetailDrawerHost'

const flushNowMock = vi.hoisted(() => vi.fn<() => Promise<boolean>>())
const useTaskDetailViewModelMock = vi.hoisted(() =>
	vi.fn(() => ({ status: 'ready', autosave: { flushNow: flushNowMock } })),
)

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
	let viewport: ReturnType<typeof installViewport>

	beforeEach(() => {
		onClose.mockReset()
		flushNowMock.mockReset().mockResolvedValue(true)
		useTaskDetailViewModelMock.mockClear()
		viewport = installViewport(true)
	})

	it('只使用 HeroUI Resizable 呈现可拖宽的非模态 Aside', () => {
		renderHost({
			children: <div data-testid='main-content'>任务列表</div>,
		})

		expect(screen.getByTestId('main-content')).toHaveTextContent('任务列表')
		const aside = screen.getByRole('complementary', { name: '任务详情' })
		expect(aside).toBeInTheDocument()
		expect(fireEvent.contextMenu(aside)).toBe(false)
		expect(screen.getByRole('separator', { name: '调整任务详情宽度' })).toHaveAttribute(
			'aria-orientation',
			'vertical',
		)
		expect(document.querySelectorAll('[data-slot="resizable-panel"]')).toHaveLength(2)
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
		expect(document.querySelector('[data-slot="sheet-backdrop"]')).not.toBeInTheDocument()
		expect(screen.getByTestId('task-detail-viewport')).toBeInTheDocument()
		expect(useTaskDetailViewModelMock).toHaveBeenCalledWith({ taskId: 'task-a', onClose })
	})

	it('打开和关闭 Aside 时不重建主集合 DOM', () => {
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
		screen.getByTestId('task-detail-viewport').scrollTop = 180

		view.rerender(
			createHost({
				activeDetail: { kind: 'task', id: 'task-b' },
			}),
		)
		expect(screen.getByTestId('task-detail-viewport')).toHaveProperty('scrollTop', 0)

		view.rerender(createHost())
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

	it('Aside 进入 compact 时先保存再关闭', async () => {
		renderHost()

		await act(async () => {
			viewport.setDesktop(false)
		})

		expect(flushNowMock).toHaveBeenCalledOnce()
		expect(onClose).toHaveBeenCalledOnce()
		expect(flushNowMock.mock.invocationCallOrder[0]).toBeLessThan(
			onClose.mock.invocationCallOrder[0]!,
		)
	})

	it('compact 下恢复遗留 Aside 时先保存再关闭', async () => {
		viewport.setDesktop(false)

		renderHost()

		await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
		expect(flushNowMock).toHaveBeenCalledOnce()
	})

	it('保存失败时保留 Aside', async () => {
		flushNowMock.mockResolvedValue(false)
		renderHost()

		await act(async () => {
			viewport.setDesktop(false)
		})

		expect(flushNowMock).toHaveBeenCalledOnce()
		expect(onClose).not.toHaveBeenCalled()
		expect(screen.getByRole('complementary', { name: '任务详情' })).toBeInTheDocument()
	})

	it('保存期间重新变宽会取消关闭', async () => {
		let resolveSave: ((saved: boolean) => void) | null = null
		flushNowMock.mockImplementation(
			() =>
				new Promise<boolean>((resolve) => {
					resolveSave = resolve
				}),
		)
		renderHost()

		await act(async () => {
			viewport.setDesktop(false)
			viewport.setDesktop(true)
			resolveSave?.(true)
		})

		expect(flushNowMock).toHaveBeenCalledOnce()
		expect(onClose).not.toHaveBeenCalled()
	})

	it('Aside 卸载后不会执行延迟关闭', async () => {
		let resolveSave: ((saved: boolean) => void) | null = null
		flushNowMock.mockImplementation(
			() =>
				new Promise<boolean>((resolve) => {
					resolveSave = resolve
				}),
		)
		const view = renderHost()

		act(() => viewport.setDesktop(false))
		view.unmount()
		await act(async () => resolveSave?.(true))

		expect(onClose).not.toHaveBeenCalled()
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
				onClose={onClose}
				open
				{...overrides}
			/>
		)
	}
})

function installViewport(initialDesktop: boolean) {
	let matches = initialDesktop
	const listeners = new Set<(event: MediaQueryListEvent) => void>()
	const mediaQuery = {
		get matches() {
			return matches
		},
		media: SHELL_DESKTOP_MEDIA_QUERY,
		onchange: null,
		addEventListener: vi.fn((_type: string, listener: EventListenerOrEventListenerObject) => {
			listeners.add(listener as (event: MediaQueryListEvent) => void)
		}),
		removeEventListener: vi.fn((_type: string, listener: EventListenerOrEventListenerObject) => {
			listeners.delete(listener as (event: MediaQueryListEvent) => void)
		}),
		addListener: vi.fn(),
		removeListener: vi.fn(),
		dispatchEvent: vi.fn(() => false),
	} satisfies MediaQueryList

	Object.defineProperty(window, 'matchMedia', {
		configurable: true,
		value: vi.fn(() => mediaQuery),
	})

	return {
		setDesktop(nextDesktop: boolean) {
			matches = nextDesktop
			const event = { matches, media: mediaQuery.media } as MediaQueryListEvent
			listeners.forEach((listener) => listener(event))
		},
	}
}

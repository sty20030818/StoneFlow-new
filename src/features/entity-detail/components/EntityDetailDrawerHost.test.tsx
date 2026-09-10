import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
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
		const aside = screen.getByRole('complementary', { name: '任务详情' })
		const getAnimations = vi.fn(() => [])
		Object.defineProperty(aside.closest('[data-panel]')!, 'getAnimations', { value: getAnimations })
		viewport.scrollTop = 180

		view.rerender(createHost({ activeDetail: { kind: 'task', id: 'task-b' } }))
		expect(screen.getByTestId('task-detail-viewport')).toBe(viewport)
		expect(viewport).toHaveProperty('scrollTop', 0)

		view.rerender(createHost())
		expect(viewport).toHaveProperty('scrollTop', 180)
		expect(screen.getByRole('complementary', { name: '任务详情' })).toBe(aside)
		expect(aside).toHaveAttribute('data-detail-open', 'true')
		expect(getAnimations).not.toHaveBeenCalled()
	})

	it('desktop 关闭时等待占位面板收起，而不是只等待内部内容淡出', async () => {
		const view = renderHost()
		const aside = screen.getByRole('complementary', { name: '任务详情' })
		const panel = aside.closest<HTMLElement>('[data-panel]')!
		const exit = Promise.withResolvers<void>()
		Object.defineProperty(panel, 'getAnimations', {
			value: () => [{ finished: exit.promise }],
		})

		view.rerender(createHost({ open: false, activeDetail: null }))

		expect(aside).toBeInTheDocument()
		expect(aside).toHaveAttribute('inert')
		expect(aside).toHaveAttribute('aria-hidden', 'true')
		expect(screen.queryByRole('complementary', { name: '任务详情' })).not.toBeInTheDocument()
		expect(screen.getByRole('separator', { name: '调整任务详情宽度' })).toHaveAttribute(
			'aria-disabled',
			'true',
		)

		await act(async () => exit.resolve())
		expect(aside).not.toBeInTheDocument()
		expect(screen.queryByRole('separator')).not.toBeInTheDocument()
	})

	it.each([320, 360, 440])('desktop 按实际 %ipx 宽度开合，结束后释放尺寸控制', async (width) => {
		const view = renderHost()
		const aside = screen.getByRole('complementary', { name: '任务详情' })
		const panel = aside.closest<HTMLElement>('[data-panel]')!
		vi.spyOn(panel, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, width, 600))
		const { animate, finish } = installPanelMotion(panel)

		await act(async () => {})
		expect(animate).toHaveBeenLastCalledWith([{ maxWidth: '0px' }, { maxWidth: `${width}px` }], {
			duration: 200,
			easing: 'cubic-bezier(0.32, 0.72, 0, 1)',
			fill: 'both',
		})
		expect(aside.style.width).toBe(`${width}px`)
		await act(async () => finish())
		expect(aside.style.width).toBe('')
		expect(panel.getAnimations()).toEqual([])

		view.rerender(createHost({ open: false, activeDetail: null }))
		expect(animate).toHaveBeenLastCalledWith([{ maxWidth: `${width}px` }, { maxWidth: '0px' }], {
			duration: 200,
			easing: 'cubic-bezier(0.32, 0.72, 0, 1)',
			fill: 'both',
		})
		expect(aside).toBeInTheDocument()
		await act(async () => finish())
		expect(aside).not.toBeInTheDocument()
	})

	it('desktop 快速关开不会被旧退出完成回调卸载，也不重建任务内容', async () => {
		const view = renderHost()
		const aside = screen.getByRole('complementary', { name: '任务详情' })
		const panel = aside.closest<HTMLElement>('[data-panel]')!
		const viewport = screen.getByTestId('task-detail-viewport')
		const bounds = vi
			.spyOn(panel, 'getBoundingClientRect')
			.mockReturnValue(new DOMRect(0, 0, 360, 600))
		const { animate, finish } = installPanelMotion(panel)
		await act(async () => {})
		await act(async () => finish())

		view.rerender(createHost({ open: false, activeDetail: null }))
		// 正在收起的当前帧为 120px，取消效果后的自然宽度仍是 360px。
		bounds.mockReturnValueOnce(new DOMRect(0, 0, 120, 600))
		view.rerender(createHost({ activeDetail: { kind: 'task', id: 'task-b' } }))
		await act(async () => {})

		expect(screen.getByRole('complementary', { name: '任务详情' })).toBe(aside)
		expect(screen.getByTestId('task-detail-viewport')).toBe(viewport)
		expect(aside).not.toHaveAttribute('inert')
		expect(aside).toHaveAttribute('data-detail-open', 'true')
		expect(useTaskDetailViewModelMock).toHaveBeenLastCalledWith({ taskId: 'task-b', onClose })
		expect(animate).toHaveBeenLastCalledWith(
			[{ maxWidth: '120px' }, { maxWidth: '360px' }],
			expect.any(Object),
		)
		expect(aside.style.width).toBe('360px')
		await act(async () => finish())
		expect(aside.style.width).toBe('')
	})

	it.each(['分隔线键盘', '相邻内容指针'])('%s交互同步释放入场尺寸', async (interaction) => {
		renderHost()
		const aside = screen.getByRole('complementary', { name: '任务详情' })
		const panel = aside.closest<HTMLElement>('[data-panel]')!
		vi.spyOn(panel, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 360, 600))
		const { animate } = installPanelMotion(panel)
		await act(async () => {})

		if (interaction === '分隔线键盘') {
			// JSDOM 不计算面板几何；这里只验证捕获阶段先交还控制，真实调宽由浏览器验收。
			panel.parentElement!.addEventListener('keydown', (event) => event.stopPropagation(), {
				capture: true,
				once: true,
			})
			fireEvent.keyDown(screen.getByRole('separator'), { key: 'ArrowLeft' })
		} else {
			fireEvent.pointerDown(aside)
		}

		expect(animate).toHaveBeenCalledTimes(1)
		expect(panel.getAnimations()).toEqual([])
		expect(aside.style.width).toBe('')
	})

	it('减少动态效果时不启动宽度动画，关闭立即释放占位', async () => {
		const matchMedia = window.matchMedia
		vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
			...matchMedia(query),
			matches: query === '(prefers-reduced-motion: reduce)',
		}))
		const view = renderHost()
		const aside = screen.getByRole('complementary', { name: '任务详情' })
		const panel = aside.closest<HTMLElement>('[data-panel]')!
		vi.spyOn(panel, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 360, 600))
		const { animate } = installPanelMotion(panel)
		await act(async () => {})

		view.rerender(createHost({ open: false, activeDetail: null }))

		expect(animate).not.toHaveBeenCalled()
		expect(aside).not.toBeInTheDocument()
	})

	it('动画中开启减少动态效果会立即完成并释放冻结宽度', async () => {
		const query = '(prefers-reduced-motion: reduce)'
		const preference = Object.assign(new EventTarget(), { matches: false })
		const matchMedia = window.matchMedia
		vi.spyOn(window, 'matchMedia').mockImplementation((value) =>
			value === query ? (preference as MediaQueryList) : matchMedia(value),
		)
		renderHost()
		const aside = screen.getByRole('complementary', { name: '任务详情' })
		const panel = aside.closest<HTMLElement>('[data-panel]')!
		vi.spyOn(panel, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 360, 600))
		installPanelMotion(panel)
		await act(async () => {})

		await act(async () => {
			preference.matches = true
			preference.dispatchEvent(new Event('change'))
		})

		expect(panel.getAnimations()).toEqual([])
		expect(aside.style.width).toBe('')
	})

	it('没有实际动画时立即关闭，不为 reduced-motion 保留空白面板', () => {
		const view = renderHost()
		const aside = screen.getByRole('complementary', { name: '任务详情' })
		Object.defineProperty(aside.closest('[data-panel]')!, 'getAnimations', { value: () => [] })

		view.rerender(createHost({ open: false, activeDetail: null }))

		expect(aside).not.toBeInTheDocument()
		expect(screen.queryByRole('separator')).not.toBeInTheDocument()
	})

	it('compact 受控关闭保留 Sheet 自身退出动画，完成后释放详情', async () => {
		const view = renderHost({ isCompact: true })
		const dialog = await screen.findByRole('dialog', { name: '任务详情' })
		const content = dialog.closest<HTMLElement>('[data-slot="sheet-content"]')!
		const exit = Promise.withResolvers<void>()
		Object.defineProperty(content, 'getAnimations', {
			value: () => [{ finished: exit.promise }],
		})

		view.rerender(createHost({ isCompact: true, open: false, activeDetail: null }))
		expect(content).toBeInTheDocument()
		expect(content).toHaveAttribute('data-exiting')
		expect(content).toHaveAttribute('inert')

		await act(async () => exit.resolve())
		expect(content).not.toBeInTheDocument()
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

function installPanelMotion(panel: HTMLElement) {
	let active: Animation | null = null
	const animate = vi.fn((_keyframes: Keyframe[], _options: KeyframeAnimationOptions) => {
		const completion = Promise.withResolvers<Animation>()
		const animation = {
			finished: completion.promise,
			onfinish: null,
			cancel: vi.fn(() => {
				if (active === animation) active = null
				completion.reject(new DOMException('取消动画', 'AbortError'))
			}),
			finish: vi.fn(() => {
				completion.resolve(animation)
				queueMicrotask(() => {
					animation.onfinish?.call(animation, new Event('finish') as AnimationPlaybackEvent)
				})
			}),
		} as unknown as Animation
		// 浏览器只在消费 finished 时暴露取消 rejection；测试替身预先创建 Promise。
		void completion.promise.catch(() => undefined)
		active = animation
		return animation
	})
	Object.defineProperty(panel, 'animate', { configurable: true, value: animate })
	Object.defineProperty(panel, 'getAnimations', {
		configurable: true,
		value: () => (active ? [active] : []),
	})
	return { animate, finish: () => active?.finish() }
}

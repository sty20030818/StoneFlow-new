import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

import { Button, Kbd, Modal } from '@heroui/react'

import { ActionTooltip, DisabledActionTooltip, OverflowTooltip } from '.'

describe('shared tooltip patterns', () => {
	it.each(['动作', '禁用', '截断'] as const)(
		'Modal 内的%s提示仍可被读屏访问，背景操作保持隔离',
		async (pattern) => {
			const content = {
				动作: (
					<ActionTooltip label='弹窗操作提示'>
						<button type='button'>弹窗操作</button>
					</ActionTooltip>
				),
				禁用: (
					<DisabledActionTooltip ariaLabel='弹窗操作' label='弹窗操作提示' reason={null}>
						<button disabled type='button'>
							弹窗操作
						</button>
					</DisabledActionTooltip>
				),
				截断: <OverflowTooltip content='弹窗操作提示'>弹窗操作</OverflowTooltip>,
			}[pattern]
			render(
				<>
					<button type='button'>背景操作</button>
					<Modal.Backdrop isOpen>
						<Modal.Container>
							<Modal.Dialog>
								<Modal.Heading>测试弹窗</Modal.Heading>
								{content}
							</Modal.Dialog>
						</Modal.Container>
					</Modal.Backdrop>
				</>,
			)
			const trigger =
				pattern === '截断'
					? screen.getByText('弹窗操作')
					: screen.getByRole(pattern === '动作' ? 'button' : 'group', { name: '弹窗操作' })
			if (pattern === '截断') setElementSize(trigger, { clientWidth: 80, scrollWidth: 160 })
			fireEvent.pointerMove(trigger, { pointerType: 'mouse' })
			fireEvent.pointerEnter(trigger, { pointerType: 'mouse' })

			expect(await screen.findByRole('tooltip')).toHaveTextContent('弹窗操作提示')
			expect(trigger).toHaveAccessibleDescription('弹窗操作提示')
			expect(screen.queryByRole('button', { name: '背景操作' })).not.toBeInTheDocument()
		},
	)

	it('ActionTooltip 仅鼠标 hover 自动显示，Tab 聚焦不打开且关闭已有提示', () => {
		vi.useFakeTimers()
		try {
			render(
				<ActionTooltip label='延迟策略'>
					<Button type='button'>延迟策略</Button>
				</ActionTooltip>,
			)

			const trigger = screen.getByRole('button', { name: '延迟策略' })
			fireEvent.pointerMove(trigger, { pointerType: 'mouse' })
			fireEvent.pointerEnter(trigger, { pointerType: 'mouse' })
			act(() => vi.advanceTimersByTime(250))
			fireEvent.keyDown(trigger, { key: 'Tab' })
			act(() => vi.advanceTimersByTime(500))
			expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()

			fireEvent.pointerLeave(trigger, { pointerType: 'mouse' })
			fireEvent.pointerEnter(trigger, { pointerType: 'mouse' })
			act(() => vi.advanceTimersByTime(499))
			expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()

			act(() => vi.advanceTimersByTime(1))
			expect(screen.getByRole('tooltip')).toBeInTheDocument()
			fireEvent.pointerLeave(trigger, { pointerType: 'mouse' })
			expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()

			fireEvent.keyDown(document, { key: 'Tab' })
			act(() => trigger.focus())
			expect(trigger).toHaveFocus()
			expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
			act(() => vi.advanceTimersByTime(500))
			expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()

			fireEvent.pointerMove(trigger, { pointerType: 'mouse' })
			fireEvent.pointerEnter(trigger, { pointerType: 'mouse' })
			act(() => vi.advanceTimersByTime(500))
			expect(screen.getByRole('tooltip')).toBeInTheDocument()
			fireEvent.keyDown(trigger, { key: 'Tab' })
			expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()

			fireEvent.pointerLeave(trigger, { pointerType: 'mouse' })
			fireEvent.pointerMove(trigger, { pointerType: 'mouse' })
			fireEvent.pointerEnter(trigger, { pointerType: 'mouse' })
			act(() => vi.advanceTimersByTime(500))
			expect(screen.getByRole('tooltip')).toBeInTheDocument()
			fireEvent.keyDown(trigger, { key: 'Escape' })
			expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
		} finally {
			cleanup()
			act(() => vi.runOnlyPendingTimers())
			vi.useRealTimers()
		}
	})

	it('ActionTooltip 从触发器移入提示保持显示，离开提示后按延迟关闭', () => {
		vi.useFakeTimers()
		try {
			render(
				<ActionTooltip closeDelay={200} delay={0} label='悬停提示'>
					<Button type='button'>触发提示</Button>
				</ActionTooltip>,
			)
			const trigger = screen.getByRole('button', { name: '触发提示' })
			fireEvent.pointerMove(trigger, { pointerType: 'mouse' })
			fireEvent.pointerEnter(trigger, { pointerType: 'mouse' })
			const tooltip = screen.getByRole('tooltip')

			fireEvent.pointerLeave(trigger, { pointerType: 'mouse' })
			fireEvent.pointerEnter(tooltip, { pointerType: 'mouse' })
			act(() => vi.advanceTimersByTime(200))
			expect(tooltip).toBeInTheDocument()

			fireEvent.pointerLeave(tooltip, { pointerType: 'mouse' })
			act(() => vi.advanceTimersByTime(199))
			expect(tooltip).toBeInTheDocument()
			act(() => vi.advanceTimersByTime(1))
			expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
		} finally {
			cleanup()
			act(() => vi.runOnlyPendingTimers())
			vi.useRealTimers()
		}
	})

	it('ActionTooltip 组合动作文案和快捷键提示', async () => {
		render(
			<ActionTooltip
				defaultOpen
				delay={0}
				label='全部任务'
				shortcut={
					<Kbd>
						<Kbd.Content>G → T</Kbd.Content>
					</Kbd>
				}
			>
				<button type='button'>任务入口</button>
			</ActionTooltip>,
		)

		expect(screen.getByRole('button', { name: '任务入口' })).toBeInTheDocument()
		const tooltip = await screen.findByRole('tooltip')
		expect(tooltip).toHaveAttribute('data-placement', 'bottom')
		expect(tooltip).toHaveTextContent('全部任务G → T')
		expect(tooltip.querySelectorAll('[data-slot="action-tooltip-row"]')).toHaveLength(1)
	})

	it('ActionTooltip 可由外部 overlay 状态受控关闭', async () => {
		const { rerender } = renderControlledActionTooltip(true)

		expect(await screen.findByRole('tooltip')).toHaveTextContent('设置')

		rerender(renderControlledActionTooltipNode(false))
		await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument())
	})

	it('ActionTooltip 不把纯展示子节点加入 Tab 顺序', () => {
		render(
			<ActionTooltip label='更新时间'>
				<span>今天</span>
			</ActionTooltip>,
		)

		expect(screen.getByText('今天')).not.toHaveAttribute('tabindex')
	})

	it('ActionTooltip 不消费 Tab，仍允许子按钮自己的键盘处理消费事件', () => {
		const onParentKeyDown = vi.fn()
		const onButtonKeyDown = vi.fn()
		render(
			<div onKeyDown={onParentKeyDown}>
				<ActionTooltip label='创建任务'>
					<Button
						onKeyDown={(event) => {
							onButtonKeyDown(event.key)
							if (event.key === 'ArrowDown') event.stopPropagation()
						}}
					>
						创建任务
					</Button>
				</ActionTooltip>
			</div>,
		)
		const trigger = screen.getByRole('button', { name: '创建任务' })
		fireEvent.keyDown(trigger, { key: 'Tab' })
		expect(onParentKeyDown).toHaveBeenCalledOnce()
		onParentKeyDown.mockClear()

		fireEvent.keyDown(trigger, { key: 'ArrowDown' })

		expect(onButtonKeyDown.mock.calls).toEqual([['Tab'], ['ArrowDown']])
		expect(onParentKeyDown).not.toHaveBeenCalled()
	})

	it('DisabledActionTooltip 分离可见文案与无障碍名称，并展示快捷键和禁用原因', async () => {
		render(
			<DisabledActionTooltip
				ariaLabel='删除任务：任务 A'
				label='删除任务'
				reason='你没有删除权限'
				shortcut={<span aria-label='按 X'>X</span>}
			>
				<button disabled type='button'>
					删除
				</button>
			</DisabledActionTooltip>,
		)

		const trigger = screen.getByRole('group', { name: '删除任务：任务 A' })
		expect(trigger).toHaveAttribute('tabindex', '0')
		expect(trigger).toHaveAttribute('aria-disabled', 'true')

		fireEvent.keyDown(document, { key: 'Tab' })
		act(() => trigger.focus())
		const tooltip = await screen.findByRole('tooltip')
		expect(tooltip).toHaveTextContent('删除任务X你没有删除权限')
		expect(tooltip).not.toHaveTextContent('任务 A')
		expect(screen.getByLabelText('按 X')).toBeInTheDocument()
	})

	it('DisabledActionTooltip 可只显示动作名和快捷键，不伪造禁用原因', async () => {
		render(
			<DisabledActionTooltip label='归档任务' reason={null} shortcut={<span>A</span>}>
				<button disabled type='button'>
					归档任务
				</button>
			</DisabledActionTooltip>,
		)

		const trigger = screen.getByRole('group', { name: '归档任务' })
		act(() => trigger.focus())
		expect(await screen.findByRole('tooltip')).toHaveTextContent('归档任务A')
		expect(
			screen.getByRole('tooltip').querySelector('[data-slot="disabled-action-tooltip-reason"]'),
		).not.toBeInTheDocument()
	})

	it('OverflowTooltip 首次 hover 复测截断，并在 resize 后不再截断时关闭', async () => {
		const observers: ResizeObserverTestDouble[] = []
		vi.spyOn(globalThis, 'ResizeObserver').mockImplementation(
			class ResizeObserverTestDouble {
				readonly callback: ResizeObserverCallback
				disconnect = vi.fn()
				observe = vi.fn()
				unobserve = vi.fn()

				constructor(callback: ResizeObserverCallback) {
					this.callback = callback
					observers.push(this)
				}
			},
		)

		render(<OverflowTooltip content='一个完整的项目名称'>一个完整的项目名称</OverflowTooltip>)

		const trigger = document.querySelector(
			'[data-slot="overflow-tooltip-trigger"]',
		) as HTMLSpanElement
		expect(trigger).not.toHaveAttribute('tabindex')
		setElementSize(trigger, { clientWidth: 80, scrollWidth: 160 })

		fireEvent.pointerMove(trigger, { pointerType: 'mouse' })
		fireEvent.pointerEnter(trigger, { pointerType: 'mouse' })
		const tooltip = await screen.findByRole('tooltip')
		expect(tooltip).toHaveAttribute('data-placement', 'bottom')
		expect(tooltip).toHaveTextContent('一个完整的项目名称')

		setElementSize(trigger, { clientWidth: 80, scrollWidth: 80 })
		const triggerObserver = observers.find((candidate) =>
			candidate.observe.mock.calls.some(([element]) => element === trigger),
		)
		expect(triggerObserver).toBeDefined()
		act(() => triggerObserver!.callback([], triggerObserver!))

		await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument())
		expect(triggerObserver!.observe).toHaveBeenCalledWith(trigger)
	})

	it('OverflowTooltip 未发生截断时不打开', () => {
		render(<OverflowTooltip content='短名称'>短名称</OverflowTooltip>)

		const trigger = document.querySelector(
			'[data-slot="overflow-tooltip-trigger"]',
		) as HTMLSpanElement
		setElementSize(trigger, { clientWidth: 80, scrollWidth: 80 })
		fireEvent.pointerMove(trigger, { pointerType: 'mouse' })
		fireEvent.pointerEnter(trigger, { pointerType: 'mouse' })

		expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
	})
})

type ResizeObserverTestDouble = ResizeObserver & {
	callback: ResizeObserverCallback
	disconnect: ReturnType<typeof vi.fn>
	observe: ReturnType<typeof vi.fn>
	unobserve: ReturnType<typeof vi.fn>
}

function renderControlledActionTooltip(isOpen: boolean) {
	return render(renderControlledActionTooltipNode(isOpen))
}

function renderControlledActionTooltipNode(isOpen: boolean) {
	return (
		<ActionTooltip delay={0} isOpen={isOpen} label='设置' onOpenChange={() => undefined}>
			<button type='button'>设置入口</button>
		</ActionTooltip>
	)
}

function setElementSize(
	element: HTMLElement,
	{ clientWidth, scrollWidth }: { clientWidth: number; scrollWidth: number },
) {
	Object.defineProperty(element, 'clientWidth', { configurable: true, value: clientWidth })
	Object.defineProperty(element, 'scrollWidth', { configurable: true, value: scrollWidth })
}

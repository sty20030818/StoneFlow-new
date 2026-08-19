import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'

import { Kbd } from '@heroui/react'

import { ActionTooltip, DisabledActionTooltip, OverflowTooltip } from '.'

describe('shared tooltip patterns', () => {
	it('ActionTooltip 对鼠标等待 500ms，但键盘 focus 立即打开', async () => {
		vi.useFakeTimers()
		try {
			render(
				<ActionTooltip label='延迟策略'>
					<button type='button'>延迟策略</button>
				</ActionTooltip>,
			)

			const trigger = screen.getByRole('button', { name: '延迟策略' })
			fireEvent.pointerMove(trigger, { pointerType: 'mouse' })
			fireEvent.pointerEnter(trigger, { pointerType: 'mouse' })
			act(() => vi.advanceTimersByTime(499))
			expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()

			act(() => vi.advanceTimersByTime(1))
			expect(screen.getByRole('tooltip')).toBeInTheDocument()
		} finally {
			vi.useRealTimers()
		}

		const trigger = screen.getByRole('button', { name: '延迟策略' })
		act(() => trigger.blur())
		fireEvent.keyDown(document, { key: 'Tab' })
		act(() => trigger.focus())
		expect(await screen.findByRole('tooltip')).toBeInTheDocument()
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

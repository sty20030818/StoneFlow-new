import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'

import { Kbd } from '@/shared/components/base/kbd'
import { TooltipProvider } from '@/shared/components/base/tooltip'
import { ActionTooltip, DisabledActionTooltip, OverflowTooltip } from '.'

describe('shared tooltip patterns', () => {
	it('全局 Provider 对鼠标等待 500ms，但键盘 focus 立即打开', async () => {
		vi.useFakeTimers()
		try {
			render(
				<TooltipProvider>
					<ActionTooltip>
						<ActionTooltip.Trigger asChild>
							<button type='button'>延迟策略</button>
						</ActionTooltip.Trigger>
						<ActionTooltip.Content>
							<ActionTooltip.Row label='延迟策略' />
						</ActionTooltip.Content>
					</ActionTooltip>
				</TooltipProvider>,
			)

			const trigger = screen.getByRole('button', { name: '延迟策略' })
			fireEvent.pointerMove(trigger, { pointerType: 'mouse' })
			act(() => vi.advanceTimersByTime(499))
			expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()

			act(() => vi.advanceTimersByTime(1))
			expect(screen.getByRole('tooltip')).toBeInTheDocument()
		} finally {
			vi.useRealTimers()
		}

		fireEvent.blur(screen.getByRole('button', { name: '延迟策略' }))
		fireEvent.focus(screen.getByRole('button', { name: '延迟策略' }))
		expect(await screen.findByRole('tooltip')).toBeInTheDocument()
	})

	it('ActionTooltip 用同一套显式组合支持单项和多项快捷键提示', async () => {
		render(
			<TooltipProvider delayDuration={0}>
				<ActionTooltip defaultOpen>
					<ActionTooltip.Trigger asChild>
						<button type='button'>任务入口</button>
					</ActionTooltip.Trigger>
					<ActionTooltip.Content>
						<ActionTooltip.Row label='全部任务' shortcut={<Kbd>G → T</Kbd>} />
						<ActionTooltip.Row label='独立任务' shortcut={<Kbd>G → I</Kbd>} />
					</ActionTooltip.Content>
				</ActionTooltip>
			</TooltipProvider>,
		)

		expect(screen.getByRole('button', { name: '任务入口' })).toBeInTheDocument()
		const tooltip = await screen.findByRole('tooltip')
		expect(tooltip).toHaveAttribute('data-side', 'bottom')
		expect(tooltip).toHaveTextContent('全部任务G → T')
		expect(tooltip).toHaveTextContent('独立任务G → I')
		expect(tooltip.querySelectorAll('[data-slot="action-tooltip-row"]')).toHaveLength(2)
	})

	it('ActionTooltip 可由外部 overlay 状态受控关闭', async () => {
		const { rerender } = renderControlledActionTooltip(true)

		expect(await screen.findByRole('tooltip')).toHaveTextContent('设置')

		rerender(renderControlledActionTooltipNode(false))
		await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument())
	})

	it('DisabledActionTooltip 为禁用原因提供可聚焦触发点', async () => {
		render(
			<TooltipProvider delayDuration={0}>
				<DisabledActionTooltip label='删除任务' reason='你没有删除权限'>
					<button disabled type='button'>
						删除
					</button>
				</DisabledActionTooltip>
			</TooltipProvider>,
		)

		const trigger = document.querySelector('[data-slot="disabled-action-tooltip-trigger"]')
		expect(trigger).toHaveAttribute('tabindex', '0')
		expect(trigger).toHaveAttribute('aria-disabled', 'true')

		fireEvent.focus(trigger!)
		expect(await screen.findByRole('tooltip')).toHaveTextContent('删除任务你没有删除权限')
	})

	it('OverflowTooltip 首次 focus 复测截断，并在 resize 后不再截断时关闭', async () => {
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

		render(
			<TooltipProvider delayDuration={0}>
				<OverflowTooltip content='一个完整的项目名称'>一个完整的项目名称</OverflowTooltip>
			</TooltipProvider>,
		)

		const trigger = document.querySelector(
			'[data-slot="overflow-tooltip-trigger"]',
		) as HTMLSpanElement
		setElementSize(trigger, { clientWidth: 80, scrollWidth: 160 })

		fireEvent.focus(trigger)
		const tooltip = await screen.findByRole('tooltip')
		expect(tooltip).toHaveAttribute('data-side', 'bottom')
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
		render(
			<TooltipProvider delayDuration={0}>
				<OverflowTooltip content='短名称'>短名称</OverflowTooltip>
			</TooltipProvider>,
		)

		const trigger = document.querySelector(
			'[data-slot="overflow-tooltip-trigger"]',
		) as HTMLSpanElement
		setElementSize(trigger, { clientWidth: 80, scrollWidth: 80 })
		fireEvent.focus(trigger)

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
		<TooltipProvider delayDuration={0}>
			<ActionTooltip onOpenChange={() => undefined} open={isOpen}>
				<ActionTooltip.Trigger asChild>
					<button type='button'>设置入口</button>
				</ActionTooltip.Trigger>
				<ActionTooltip.Content>
					<ActionTooltip.Row label='设置' />
				</ActionTooltip.Content>
			</ActionTooltip>
		</TooltipProvider>
	)
}

function setElementSize(
	element: HTMLElement,
	{ clientWidth, scrollWidth }: { clientWidth: number; scrollWidth: number },
) {
	Object.defineProperty(element, 'clientWidth', { configurable: true, value: clientWidth })
	Object.defineProperty(element, 'scrollWidth', { configurable: true, value: scrollWidth })
}

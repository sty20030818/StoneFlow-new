import { fireEvent, render, screen } from '@testing-library/react'

import { TooltipProvider } from '@/shared/components/base/tooltip'
import { ShellFooterHit } from '@/shared/components/patterns/ShellFooterHit'
import { ShellFooterStatus } from '@/shared/components/patterns/ShellFooterStatus'

describe('Shell Footer Tooltip patterns', () => {
	it('ShellFooterHit 仅在补充文案时显示 Tooltip，并移除 native title', async () => {
		render(
			<TooltipProvider delayDuration={0}>
				<ShellFooterHit label='有更新' tooltipLabel='发现新版本 1.2.0' onClick={() => undefined}>
					<span aria-hidden>•</span>
				</ShellFooterHit>
			</TooltipProvider>,
		)

		const action = screen.getByRole('button', { name: '发现新版本 1.2.0' })
		expect(action).not.toHaveAttribute('title')
		fireEvent.focus(action)
		expect(await screen.findByRole('tooltip')).toHaveTextContent('发现新版本 1.2.0')
	})

	it('ShellFooterStatus icon action 可用时提示名称，禁用时展示已有真实原因', async () => {
		const { rerender } = render(
			<TooltipProvider delayDuration={0}>
				<ShellFooterStatus.IconButton aria-label='立即同步'>↻</ShellFooterStatus.IconButton>
			</TooltipProvider>,
		)

		const action = screen.getByRole('button', { name: '立即同步' })
		fireEvent.focus(action)
		expect(await screen.findByRole('tooltip')).toHaveTextContent('立即同步')

		rerender(
			<TooltipProvider delayDuration={0}>
				<ShellFooterStatus.IconButton
					aria-label='立即同步'
					disabled
					disabledReason='同步未配置远端'
				>
					↻
				</ShellFooterStatus.IconButton>
			</TooltipProvider>,
		)

		const disabledTrigger = document.querySelector('[data-slot="disabled-action-tooltip-trigger"]')
		fireEvent.focus(disabledTrigger!)
		expect(await screen.findByRole('tooltip')).toHaveTextContent('立即同步同步未配置远端')
	})
})

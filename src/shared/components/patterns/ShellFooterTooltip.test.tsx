import { fireEvent, render, screen } from '@testing-library/react'

import { ShellFooterHit } from '@/shared/components/patterns/ShellFooterHit'
import { ShellFooterStatus } from '@/shared/components/patterns/ShellFooterStatus'

describe('Shell Footer Tooltip patterns', () => {
	it('ShellFooterHit 仅在补充文案时显示 Tooltip，并移除 native title', async () => {
		render(
			<ShellFooterHit label='有更新' tooltipLabel='发现新版本 1.2.0' onClick={() => undefined}>
				<span aria-hidden>•</span>
			</ShellFooterHit>,
		)

		const action = screen.getByRole('button', { name: '发现新版本 1.2.0' })
		expect(action).not.toHaveAttribute('title')
		fireEvent.keyDown(document, { key: 'Tab' })
		action.focus()
		expect(await screen.findByRole('tooltip')).toHaveTextContent('发现新版本 1.2.0')
	})

	it('ShellFooterStatus icon action 可用时提示名称，禁用时展示已有真实原因', async () => {
		const { rerender } = render(
			<ShellFooterStatus.IconButton aria-label='立即同步'>↻</ShellFooterStatus.IconButton>,
		)

		const action = screen.getByRole('button', { name: '立即同步' })
		fireEvent.keyDown(document, { key: 'Tab' })
		action.focus()
		expect(await screen.findByRole('tooltip')).toHaveTextContent('立即同步')

		rerender(
			<ShellFooterStatus.IconButton aria-label='立即同步' disabled disabledReason='同步未配置远端'>
				↻
			</ShellFooterStatus.IconButton>,
		)

		const disabledTrigger = document.querySelector(
			'[data-slot="disabled-action-tooltip-trigger"]',
		) as HTMLElement
		fireEvent.keyDown(document, { key: 'Tab' })
		disabledTrigger.focus()
		expect(await screen.findByRole('tooltip')).toHaveTextContent('立即同步同步未配置远端')
	})
})

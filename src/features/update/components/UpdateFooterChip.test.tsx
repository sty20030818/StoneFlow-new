import { fireEvent, render, screen } from '@testing-library/react'

import { TooltipProvider } from '@/shared/components/base/tooltip'
import { UpdateFooterChip } from './UpdateFooterChip'

describe('UpdateFooterChip', () => {
	it.each([
		{
			label: '有更新',
			phase: 'available' as const,
			title: '发现新版本 1.2.0',
		},
		{
			label: '30%',
			phase: 'downloading' as const,
			title: '正在下载 1.2.0',
		},
	])('$phase 用全局 Tooltip 展示补充信息，不保留 native title', async (view) => {
		render(
			<TooltipProvider delayDuration={0}>
				<UpdateFooterChip
					view={{
						...view,
						downloaded: 30,
						errorMessage: null,
						ringValue: 30,
						total: 100,
						version: '1.2.0',
					}}
					onOpen={() => undefined}
				/>
			</TooltipProvider>,
		)

		const action = screen.getByRole('button', { name: view.title })
		expect(action).not.toHaveAttribute('title')
		fireEvent.focus(action)
		expect(await screen.findByRole('tooltip')).toHaveTextContent(view.title)
	})
})

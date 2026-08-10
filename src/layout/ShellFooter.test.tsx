import { fireEvent, render, screen } from '@testing-library/react'

import { ShellFooter } from '@/layout/ShellFooter'
import { TooltipProvider } from '@/shared/components/base/tooltip'

vi.mock('@/features/sync', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@/features/sync')>()
	return {
		...actual,
		/** 壳 footer 只测拼装；同步条内部状态用桩替代 */
		SyncFooterStatusItem: () => (
			<div role='status' aria-label='已同步'>
				<span aria-hidden className='rounded-full' />
				<span>已同步</span>
				<button type='button' aria-label='立即同步'>
					立即同步
				</button>
			</div>
		),
	}
})

vi.mock('@tauri-apps/api/app', () => ({
	getVersion: vi.fn(async () => '0.1.1'),
}))

describe('ShellFooter', () => {
	it('左侧：状态灯 + 文案 + 同步按钮分离；右侧：版本；无快捷键', async () => {
		const { container } = render(
			<TooltipProvider delayDuration={0}>
				<ShellFooter />
			</TooltipProvider>,
		)

		// 文案独立
		expect(screen.getByText('已同步')).toBeInTheDocument()

		// 同步按钮独立（不与文案合成同一 button）
		const syncButton = screen.getByRole('button', { name: '立即同步' })
		expect(syncButton).toBeInTheDocument()
		expect(syncButton).not.toHaveTextContent('已同步')

		// 状态灯存在（只读圆点）
		const status = screen.getByRole('status')
		const dot = status.querySelector('span[aria-hidden]')
		expect(dot).toBeTruthy()
		expect(dot?.className).toMatch(/rounded-full/)

		// 右侧版本
		const version = await screen.findByText('v0.1.1')
		expect(version).toBeInTheDocument()
		expect(version).not.toHaveAttribute('title')
		fireEvent.focus(version)
		expect(await screen.findByRole('tooltip')).toHaveTextContent('版本 0.1.1')

		// 无快捷键提示
		expect(screen.queryByText('命令')).not.toBeInTheDocument()
		expect(screen.queryByText('新建')).not.toBeInTheDocument()
		expect(container.querySelector('kbd')).toBeNull()
	})
})

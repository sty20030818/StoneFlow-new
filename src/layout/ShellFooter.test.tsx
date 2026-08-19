import { render, screen } from '@testing-library/react'

import { ShellFooter } from '@/layout/ShellFooter'

vi.mock('@/features/sync', () => ({
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
}))

vi.mock('@tauri-apps/api/app', () => ({
	getVersion: vi.fn(async () => '0.1.1'),
}))

describe('ShellFooter', () => {
	it('拼装独立的同步状态、同步动作与应用版本', async () => {
		render(<ShellFooter />)

		expect(screen.getByText('已同步')).toBeInTheDocument()
		const syncButton = screen.getByRole('button', { name: '立即同步' })
		expect(syncButton).toBeInTheDocument()
		expect(syncButton).not.toHaveTextContent('已同步')
		expect(screen.getByRole('status', { name: '已同步' })).toBeInTheDocument()
		expect(await screen.findByText('v0.1.1')).toBeInTheDocument()
	})
})

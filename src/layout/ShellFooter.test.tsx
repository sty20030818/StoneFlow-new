import { render, screen } from '@testing-library/react'

import { ShellFooter } from '@/layout/ShellFooter'

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
	getVersion: vi.fn(async () => '0.1.0'),
}))

vi.mock('@/features/update', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@/features/update')>()
	return {
		...actual,
		getUpdateSettings: vi.fn(async () => ({
			checkMode: 'notifyOnly',
			channel: 'stable',
			skippedVersion: null,
			lastCheckedAt: null,
			checkIntervalSecs: 21600,
		})),
	}
})

describe('ShellFooter', () => {
	it('左侧：状态灯 + 文案 + 同步按钮分离；右侧：版本；无快捷键', async () => {
		const { container } = render(<ShellFooter />)

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
		expect(await screen.findByText('v0.1.0')).toBeInTheDocument()

		// 无快捷键提示
		expect(screen.queryByText('命令')).not.toBeInTheDocument()
		expect(screen.queryByText('新建')).not.toBeInTheDocument()
		expect(container.querySelector('kbd')).toBeNull()
	})
})

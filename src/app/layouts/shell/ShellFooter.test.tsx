import { render, screen } from '@testing-library/react'

import { ShellFooter } from '@/app/layouts/shell/ShellFooter'
import { SyncStatusProvider } from '@/features/sync/model/SyncStatusProvider'

vi.mock('@/features/sync/model/useSyncStatusController', () => ({
	useSyncStatusController: () => ({
		displayedStatus: 'synced' as const,
		loading: false,
		message: null,
		refresh: vi.fn(),
		runNow: vi.fn(),
		running: false,
		statusPayload: {
			status: 'synced',
			hasRemoteConfig: true,
			replicaState: 'ready',
			lastSyncAt: null,
			lastError: null,
		},
	}),
}))

vi.mock('@tauri-apps/api/app', () => ({
	getVersion: vi.fn(async () => '0.1.0'),
}))

vi.mock('@/features/update/api/updates', () => ({
	getUpdateSettings: vi.fn(async () => ({
		checkMode: 'notifyOnly',
		channel: 'stable',
		skippedVersions: [],
		lastCheckedAt: null,
		checkIntervalSecs: 21600,
	})),
}))

describe('ShellFooter', () => {
	it('左侧：状态灯 + 文案 + 同步按钮分离；右侧：版本；无快捷键', async () => {
		const { container } = render(
			<SyncStatusProvider>
				<ShellFooter />
			</SyncStatusProvider>,
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
		expect(await screen.findByText('v0.1.0')).toBeInTheDocument()

		// 无快捷键提示
		expect(screen.queryByText('命令')).not.toBeInTheDocument()
		expect(screen.queryByText('新建')).not.toBeInTheDocument()
		expect(container.querySelector('kbd')).toBeNull()
	})
})

import { fireEvent, render, screen } from '@testing-library/react'

import { SyncFooterStatusItem } from './SyncFooterStatusItem'

const runNow = vi.fn(async () => undefined)

vi.mock('@/features/sync/model/SyncStatusProvider', () => ({
	useSharedSyncStatus: () => ({
		displayedStatus: 'synced',
		loading: false,
		message: null,
		runNow,
		running: false,
		statusPayload: {
			credentialState: 'available',
			hasRemoteConfig: true,
			replicaState: 'ready',
		},
	}),
}))

it('以静态 ARIA 状态呈现同步结果并执行手动同步', () => {
	render(<SyncFooterStatusItem />)

	expect(screen.getByRole('status', { name: '已同步' })).toBeInTheDocument()
	fireEvent.click(screen.getByRole('button', { name: '立即同步' }))
	expect(runNow).toHaveBeenCalledTimes(1)
})

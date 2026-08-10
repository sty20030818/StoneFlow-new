import { fireEvent, render, screen } from '@testing-library/react'

import { TooltipProvider } from '@/shared/components/base/tooltip'
import { SyncFooterStatusItem } from './SyncFooterStatusItem'

const mocks = vi.hoisted(() => ({
	runNow: vi.fn(),
	useSharedSyncStatus: vi.fn(),
}))

vi.mock('@/features/sync/model/SyncStatusProvider', () => ({
	useSharedSyncStatus: mocks.useSharedSyncStatus,
}))

describe('SyncFooterStatusItem', () => {
	it('可用同步动作显示名称 Tooltip', async () => {
		mocks.useSharedSyncStatus.mockReturnValue({
			displayedStatus: 'synced',
			loading: false,
			message: null,
			runNow: mocks.runNow,
			running: false,
			statusPayload: {
				credentialState: 'available',
				hasRemoteConfig: true,
				replicaState: 'ready',
			},
		})

		render(
			<TooltipProvider delayDuration={0}>
				<SyncFooterStatusItem />
			</TooltipProvider>,
		)

		const action = screen.getByRole('button', { name: '立即同步' })
		expect(action).not.toHaveAttribute('title')
		fireEvent.focus(action)
		expect(await screen.findByRole('tooltip')).toHaveTextContent('立即同步')
	})

	it('禁用同步动作只展示状态模型提供的真实原因', async () => {
		mocks.useSharedSyncStatus.mockReturnValue({
			displayedStatus: 'disabled',
			loading: false,
			message: null,
			runNow: mocks.runNow,
			running: false,
			statusPayload: null,
		})

		render(
			<TooltipProvider delayDuration={0}>
				<SyncFooterStatusItem />
			</TooltipProvider>,
		)

		const trigger = document.querySelector('[data-slot="disabled-action-tooltip-trigger"]')
		expect(trigger).not.toHaveAttribute('title')
		fireEvent.focus(trigger!)
		expect(await screen.findByRole('tooltip')).toHaveTextContent(
			'立即同步同步未配置远端，请到设置中配置',
		)
	})
})

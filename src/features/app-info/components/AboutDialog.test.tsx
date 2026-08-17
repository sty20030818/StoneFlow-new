import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getAppVersion, openAppInfoUrl } from '../api/appInfo'
import { AboutDialog } from './AboutDialog'

vi.mock('../api/appInfo', () => ({
	getAppVersion: vi.fn(),
	openAppInfoUrl: vi.fn(),
}))

describe('AboutDialog', () => {
	beforeEach(() => {
		vi.mocked(getAppVersion).mockResolvedValue('0.1.2')
	})

	it('展示运行中版本与不可用的资料入口', async () => {
		renderAboutDialog(<AboutDialog onOpenChange={vi.fn()} onOpenChangelog={vi.fn()} open />)

		expect(await screen.findByText('v0.1.2')).toBeInTheDocument()
		expect(screen.getByRole('button', { name: /官方网站，待配置/ })).toBeDisabled()
		expect(screen.getByRole('button', { name: /反馈与支持，待配置/ })).toBeDisabled()
		expect(screen.getByRole('button', { name: /隐私政策，待配置/ })).toBeDisabled()
		expect(screen.getByRole('button', { name: /许可证，待配置/ })).toBeDisabled()
		const disabledLinkTrigger = document.querySelector(
			'[data-slot="disabled-action-tooltip-trigger"]',
		) as HTMLElement
		fireEvent.keyDown(document, { key: 'Tab' })
		disabledLinkTrigger.focus()
		await waitFor(() => expect(screen.getByRole('tooltip')).toHaveTextContent('此资料入口尚未配置'))
		expect(openAppInfoUrl).not.toHaveBeenCalled()
	})

	it('关闭关于窗口并可转到更新日志', async () => {
		const onOpenChange = vi.fn()
		const onOpenChangelog = vi.fn()
		renderAboutDialog(
			<AboutDialog onOpenChange={onOpenChange} onOpenChangelog={onOpenChangelog} open />,
		)

		const closeButton = await screen.findByRole('button', { name: '关闭关于 StoneFlow' })
		closeButton.blur()
		fireEvent.keyDown(document, { key: 'Tab' })
		closeButton.focus()
		expect(await screen.findByRole('tooltip')).toHaveTextContent('关闭')
		fireEvent.click(closeButton)
		expect(onOpenChange).toHaveBeenCalledWith(false)

		fireEvent.click(screen.getByRole('button', { name: /更新日志/ }))
		await waitFor(() => expect(onOpenChangelog).toHaveBeenCalledTimes(1))
		expect(onOpenChange).toHaveBeenCalledWith(false)
	})
})

function renderAboutDialog(node: React.ReactNode) {
	return render(node)
}

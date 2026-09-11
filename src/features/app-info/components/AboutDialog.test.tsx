import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useManualUpdateCheck } from '@/features/update'

import { getAppVersion, openAppInfoUrl } from '../api/appInfo'
import type { AppInfoLink } from '../model/appInfoLinks'
import { AboutDialog } from './AboutDialog'

const linkConfig = vi.hoisted(() => ({ links: null as readonly AppInfoLink[] | null }))

vi.mock('../api/appInfo', () => ({
	getAppVersion: vi.fn(),
	openAppInfoUrl: vi.fn(),
}))

vi.mock('@/features/update', () => ({ useManualUpdateCheck: vi.fn() }))

vi.mock('../model/appInfoLinks', async (importOriginal) => {
	const actual = await importOriginal<typeof import('../model/appInfoLinks')>()
	return {
		...actual,
		get appInfoLinks() {
			return linkConfig.links ?? actual.appInfoLinks
		},
	}
})

describe('AboutDialog', () => {
	beforeEach(() => {
		linkConfig.links = null
		vi.mocked(getAppVersion).mockResolvedValue('0.1.2')
		vi.mocked(openAppInfoUrl).mockResolvedValue(undefined)
		vi.mocked(useManualUpdateCheck).mockReturnValue({
			checkNow: vi.fn().mockResolvedValue(undefined),
			disabled: false,
			isChecking: false,
		})
	})

	it('展示运行中版本，资料未配置时不展示空支持区或禁用占位', async () => {
		renderAboutDialog(<AboutDialog onOpenChange={vi.fn()} onOpenChangelog={vi.fn()} open />)

		expect(await screen.findByText('v0.1.2')).toBeInTheDocument()
		expect(screen.getByRole('dialog', { name: 'StoneFlow' })).toHaveAccessibleDescription(
			'本地优先的任务与项目管理。',
		)
		expect(screen.queryByText('资料与支持')).not.toBeInTheDocument()
		expect(
			screen.queryAllByRole('button', { name: /官方网站|反馈与支持|隐私政策|许可证/ }),
		).toHaveLength(0)
		expect(screen.getByRole('button', { name: '更新日志' })).toBeEnabled()
		expect(screen.getByRole('button', { name: '检查更新' })).toBeEnabled()
	})

	it('仅展示已配置的 HTTPS 资料入口，并交给现有 opener 打开', async () => {
		linkConfig.links = [
			{ key: 'website', label: '官方网站', url: 'https://stoneflow.example' },
			{ key: 'feedback', label: '反馈与支持', url: null },
			{ key: 'privacyPolicy', label: '隐私政策', url: 'http://stoneflow.example/privacy' },
		]
		renderAboutDialog(<AboutDialog onOpenChange={vi.fn()} onOpenChangelog={vi.fn()} open />)

		const website = await screen.findByRole('button', { name: '官方网站' })
		expect(screen.getByText('资料与支持')).toBeInTheDocument()
		expect(screen.queryAllByRole('button', { name: /反馈与支持|隐私政策/ })).toHaveLength(0)
		fireEvent.click(website)
		expect(openAppInfoUrl).toHaveBeenCalledExactlyOnceWith('https://stoneflow.example')
	})

	it('检查更新复用现有入口，检查中不能再次触发', async () => {
		const checkNow = vi.fn().mockResolvedValue(undefined)
		vi.mocked(useManualUpdateCheck).mockReturnValue({
			checkNow,
			disabled: false,
			isChecking: false,
		})
		const { rerender } = renderAboutDialog(
			<AboutDialog onOpenChange={vi.fn()} onOpenChangelog={vi.fn()} open />,
		)
		fireEvent.click(await screen.findByRole('button', { name: '检查更新' }))
		expect(checkNow).toHaveBeenCalledTimes(1)

		vi.mocked(useManualUpdateCheck).mockReturnValue({ checkNow, disabled: true, isChecking: true })
		rerender(<AboutDialog onOpenChange={vi.fn()} onOpenChangelog={vi.fn()} open />)
		const checking = screen.getByRole('button', { name: '检查中...' })
		expect(checking).toBeDisabled()
		fireEvent.click(checking)
		expect(checkNow).toHaveBeenCalledTimes(1)
	})

	it('关闭关于窗口并可转到更新日志', async () => {
		const onOpenChange = vi.fn()
		const onOpenChangelog = vi.fn()
		renderAboutDialog(
			<AboutDialog onOpenChange={onOpenChange} onOpenChangelog={onOpenChangelog} open />,
		)

		const closeButton = await screen.findByRole('button', { name: '关闭关于 StoneFlow' })
		fireEvent.click(closeButton)
		expect(onOpenChange).toHaveBeenCalledWith(false)

		fireEvent.click(screen.getByRole('button', { name: /更新日志/ }))
		await waitFor(() => expect(onOpenChangelog).toHaveBeenCalledTimes(1))
		expect(onOpenChange).toHaveBeenCalledWith(false)
	})

	it.each([false, true])('首尾 Tab 回绕（Shift=%s）', async (shiftKey) => {
		renderAboutDialog(<AboutDialog onOpenChange={vi.fn()} onOpenChangelog={vi.fn()} open />)
		await screen.findByText('v0.1.2')
		const first = screen.getByRole('button', { name: '关闭关于 StoneFlow' })
		const last = screen.getByRole('button', { name: '检查更新' })
		const source = shiftKey ? first : last
		const target = shiftKey ? last : first
		act(() => source.focus())
		expect(source).toHaveFocus()

		fireEvent.keyDown(source, { key: 'Tab', shiftKey })

		expect(target).toHaveFocus()
	})

	it('Escape 关闭关于窗口并把焦点还给入口', async () => {
		renderAboutDialog(<AboutDialogWithTrigger />)
		const trigger = screen.getByRole('button', { name: '打开关于' })
		act(() => trigger.focus())
		fireEvent.click(trigger)
		await screen.findByRole('dialog', { name: 'StoneFlow' })

		const changelog = screen.getByRole('button', { name: '更新日志' })
		act(() => changelog.focus())
		fireEvent.keyDown(changelog, { key: 'Escape' })

		await waitFor(() => {
			expect(screen.queryByRole('dialog', { name: 'StoneFlow' })).not.toBeInTheDocument()
			expect(trigger).toHaveFocus()
		})
	})
})

function AboutDialogWithTrigger() {
	const [open, setOpen] = useState(false)
	return (
		<>
			<button onClick={() => setOpen(true)} type='button'>
				打开关于
			</button>
			<AboutDialog onOpenChange={setOpen} onOpenChangelog={vi.fn()} open={open} />
		</>
	)
}

function renderAboutDialog(node: React.ReactNode) {
	return render(node)
}

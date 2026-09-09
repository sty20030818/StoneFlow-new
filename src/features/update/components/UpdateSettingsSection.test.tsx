import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
	getUpdateSettings,
	setChannel,
	setCheckIntervalSecs,
	setCheckMode,
	type UpdateSettings,
} from '../api/updates'
import { UpdateSettingsSection } from './UpdateSettingsSection'

const { checkNow } = vi.hoisted(() => ({ checkNow: vi.fn() }))

vi.mock('../api/updates', async (importOriginal) => ({
	...(await importOriginal<typeof import('../api/updates')>()),
	getUpdateSettings: vi.fn(),
	setChannel: vi.fn(),
	setCheckIntervalSecs: vi.fn(),
	setCheckMode: vi.fn(),
}))

vi.mock('../hooks/useManualUpdateCheck', () => ({
	useManualUpdateCheck: () => ({ checkNow, disabled: false, isChecking: false }),
}))

const settings: UpdateSettings = {
	checkMode: 'notifyOnly',
	channel: 'stable',
	checkIntervalSecs: 6 * 60 * 60,
	skippedVersion: null,
	lastCheckedAt: null,
}

describe('UpdateSettingsSection', () => {
	beforeEach(() => {
		vi.resetAllMocks()
		vi.mocked(getUpdateSettings).mockResolvedValue(settings)
		vi.mocked(setCheckMode).mockResolvedValue(undefined)
		vi.mocked(setChannel).mockResolvedValue(undefined)
		vi.mocked(setCheckIntervalSecs).mockResolvedValue(undefined)
	})

	it('整卡可选择，并在保存成功后更新模式、渠道和检查间隔', async () => {
		let completeSave: (() => void) | undefined
		vi.mocked(setCheckMode).mockReturnValueOnce(
			new Promise<void>((resolve) => {
				completeSave = resolve
			}),
		)
		render(<UpdateSettingsSection />)

		expect(await screen.findByRole('radio', { name: /^仅提醒/ })).toBeChecked()
		fireEvent.click(screen.getByText('自动检查并后台下载，不会自动安装或重启。'))
		expect(setCheckMode).toHaveBeenCalledWith('autoDownload')
		expect(screen.getByRole('radio', { name: /^仅提醒/ })).toBeChecked()
		expect(screen.getByRole('radio', { name: /^自动下载/ })).toBeDisabled()
		expect(screen.getByRole('radio', { name: /^测试版/ })).toBeDisabled()
		expect(screen.getByRole('button', { name: '检查更新' })).toBeDisabled()

		await act(async () => completeSave?.())
		expect(screen.getByRole('radio', { name: /^自动下载/ })).toBeChecked()
		fireEvent.click(screen.getByText('提前体验新功能，可能存在未修复的问题。'))
		await waitFor(() => expect(screen.getByRole('radio', { name: /^测试版/ })).toBeChecked())
		expect(setChannel).toHaveBeenCalledWith('beta')

		fireEvent.click(screen.getByRole('radio', { name: '每 3 小时' }))
		await waitFor(() => expect(screen.getByRole('radio', { name: '每 3 小时' })).toBeChecked())
		expect(setCheckIntervalSecs).toHaveBeenCalledWith(3 * 60 * 60)

		fireEvent.click(screen.getByRole('radio', { name: /^手动检查/ }))
		await waitFor(() => expect(screen.getByRole('radio', { name: /^手动检查/ })).toBeChecked())
		expect(screen.queryByRole('radio', { name: '每 3 小时' })).not.toBeInTheDocument()
		fireEvent.click(screen.getByRole('button', { name: '检查更新' }))
		expect(checkNow).toHaveBeenCalledTimes(1)
	})

	it('读取失败时不展示无效选项，重试成功后恢复当前设置', async () => {
		vi.mocked(getUpdateSettings).mockRejectedValueOnce(new Error('设置暂时不可读'))
		render(<UpdateSettingsSection />)

		expect(await screen.findByRole('alert')).toHaveTextContent('设置暂时不可读')
		expect(screen.queryAllByRole('radiogroup')).toHaveLength(0)
		expect(screen.queryByRole('radio', { name: '每 6 小时' })).not.toBeInTheDocument()
		fireEvent.click(screen.getByRole('button', { name: '重试' }))

		expect(await screen.findByRole('radio', { name: /^仅提醒/ })).toBeChecked()
		expect(screen.getByRole('radio', { name: /^正式版/ })).toBeChecked()
		expect(getUpdateSettings).toHaveBeenCalledTimes(2)
		expect(screen.queryByRole('alert')).not.toBeInTheDocument()
	})

	it('各选项标题不复用单选组的标签 id', async () => {
		const { container } = render(<UpdateSettingsSection />)
		await screen.findByRole('radiogroup', { name: '更新检查方式' })

		const ids = [...container.querySelectorAll('[id]')].map((element) => element.id)
		expect(new Set(ids).size).toBe(ids.length)
	})

	it('保存失败时保留旧值，再次选择后可以成功保存', async () => {
		vi.mocked(setCheckMode).mockRejectedValueOnce(new Error('保存暂时不可用'))
		render(<UpdateSettingsSection />)

		fireEvent.click(await screen.findByRole('radio', { name: /^自动下载/ }))
		expect(await screen.findByRole('alert')).toHaveTextContent('保存暂时不可用')
		expect(screen.getByRole('radio', { name: /^仅提醒/ })).toBeChecked()
		expect(screen.getByRole('radio', { name: /^自动下载/ })).not.toBeChecked()
		expect(screen.getByRole('radio', { name: /^自动下载/ })).toBeEnabled()

		fireEvent.click(screen.getByRole('radio', { name: /^自动下载/ }))
		await waitFor(() => expect(screen.getByRole('radio', { name: /^自动下载/ })).toBeChecked())
		expect(setCheckMode).toHaveBeenCalledTimes(2)
		expect(screen.queryByRole('alert')).not.toBeInTheDocument()
	})
})

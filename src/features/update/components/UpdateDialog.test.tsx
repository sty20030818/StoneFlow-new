import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useUpdateStore } from '../model/useUpdateStore'
import { UpdateDialog } from './UpdateDialog'

const mocks = vi.hoisted(() => ({
	checkNow: vi.fn(),
}))

vi.mock('@/features/changelog', () => ({
	ChangelogMarkdown: () => null,
	useChangelog: () => ({ entry: null }),
}))

vi.mock('../hooks/useUpdateInstallActions', () => ({
	useUpdateInstallActions: () => ({
		cancelDownloadUi: vi.fn(),
		restart: vi.fn(),
		startDownload: vi.fn(),
	}),
}))

vi.mock('../hooks/useManualUpdateCheck', () => ({
	useManualUpdateCheck: () => ({ checkNow: mocks.checkNow }),
}))

describe('UpdateDialog', () => {
	beforeEach(() => {
		useUpdateStore.getState().reset()
		vi.clearAllMocks()
	})

	it('检查失败时不展示安装动作，并允许重新检查', () => {
		useUpdateStore.setState({
			dialogVisible: true,
			errorMessage: '检查更新失败',
			phase: 'error',
		})
		render(<UpdateDialog />)

		expect(screen.getByRole('button', { name: '重新检查' })).toBeInTheDocument()
		expect(screen.getAllByRole('button', { name: '关闭' })).toHaveLength(1)
		expect(screen.queryByRole('button', { name: '立即更新' })).not.toBeInTheDocument()
		expect(screen.queryByRole('button', { name: '跳过此版本' })).not.toBeInTheDocument()

		fireEvent.click(screen.getByRole('button', { name: '重新检查' }))
		expect(mocks.checkNow).toHaveBeenCalledTimes(1)
		expect(useUpdateStore.getState().dialogVisible).toBe(true)
	})

	it('检查中时在当前弹窗显示禁用的进度操作', () => {
		useUpdateStore.setState({ dialogVisible: true, phase: 'checking' })
		render(<UpdateDialog />)

		expect(screen.getByRole('button', { name: '正在检查...' })).toBeDisabled()
		expect(screen.queryByRole('button', { name: '重新检查' })).not.toBeInTheDocument()
		expect(screen.queryByRole('button', { name: '立即更新' })).not.toBeInTheDocument()
	})
})

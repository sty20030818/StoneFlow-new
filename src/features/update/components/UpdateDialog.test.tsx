import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useUpdateStore } from '../model/useUpdateStore'
import { UpdateDialog } from './UpdateDialog'

const mocks = vi.hoisted(() => ({
	cancelDownload: vi.fn(),
	checkNow: vi.fn(),
	getCurrentVersion: vi.fn(),
	getUpdateSettings: vi.fn(),
	install: vi.fn(),
	skipVersion: vi.fn(),
	startDownload: vi.fn(),
	toastError: vi.fn(),
	useChangelog: vi.fn(),
}))

vi.mock('@/features/changelog', () => ({
	ChangelogRelease: ({ release }: { release: { version: string } }) => (
		<article>v{release.version}</article>
	),
	useChangelog: mocks.useChangelog,
}))

vi.mock('../hooks/useUpdateInstallActions', () => ({
	useUpdateInstallActions: () => ({
		cancelDownload: mocks.cancelDownload,
		install: mocks.install,
		startDownload: mocks.startDownload,
	}),
}))

vi.mock('../hooks/useManualUpdateCheck', () => ({
	useManualUpdateCheck: () => ({ checkNow: mocks.checkNow }),
}))

vi.mock('../api/updates', () => ({
	getCurrentVersion: mocks.getCurrentVersion,
	getUpdateSettings: mocks.getUpdateSettings,
	skipVersion: mocks.skipVersion,
}))

vi.mock('@heroui/react', async (importOriginal) => ({
	...(await importOriginal<typeof import('@heroui/react')>()),
	toast: { danger: mocks.toastError },
}))

const stableSettings = {
	checkMode: 'notifyOnly' as const,
	channel: 'stable' as const,
	skippedVersion: null,
	lastCheckedAt: null,
	checkIntervalSecs: 60 * 60,
}

function showSnapshot(
	phase: 'idle' | 'available' | 'downloading' | 'ready' | 'installing',
	options: {
		channel?: 'stable' | 'beta'
		errorMessage?: string | null
		version?: string
	} = {},
) {
	const version = options.version ?? '0.2.0'
	useUpdateStore.setState({
		dialogVisible: true,
		snapshot: {
			revision: 1,
			phase,
			update: phase === 'idle' ? null : { version, channel: options.channel ?? 'stable' },
			progress: phase === 'downloading' ? { downloaded: 10, total: 100 } : null,
			errorMessage: options.errorMessage ?? null,
		},
	})
}

describe('UpdateDialog', () => {
	beforeEach(() => {
		useUpdateStore.getState().reset()
		vi.clearAllMocks()
		mocks.getCurrentVersion.mockReturnValue(new Promise(() => {}))
		mocks.getUpdateSettings.mockResolvedValue(stableSettings)
		mocks.useChangelog.mockReturnValue({ releases: [], isLoading: false })
	})

	it('检查失败时不展示安装动作，并允许重新检查', async () => {
		useUpdateStore.setState({
			dialogVisible: true,
			snapshot: {
				revision: 0,
				phase: 'idle',
				update: null,
				progress: null,
				errorMessage: '检查更新失败',
			},
		})
		renderUpdateDialog()

		expect(screen.getByRole('button', { name: '重新检查' })).toBeInTheDocument()
		expect(screen.getAllByRole('button', { name: '关闭' })).toHaveLength(1)
		expect(screen.queryByRole('button', { name: '立即更新' })).not.toBeInTheDocument()
		expect(screen.queryByRole('button', { name: '跳过此版本' })).not.toBeInTheDocument()

		fireEvent.click(screen.getByRole('button', { name: '重新检查' }))
		expect(mocks.checkNow).toHaveBeenCalledTimes(1)
		expect(useUpdateStore.getState().dialogVisible).toBe(true)
	})

	it('检查中时在当前弹窗显示禁用的进度操作', () => {
		useUpdateStore.setState({ dialogVisible: true, manualCheckPending: true })
		renderUpdateDialog()

		expect(screen.getByRole('button', { name: '正在检查...' })).toBeDisabled()
		expect(screen.queryByRole('button', { name: '重新检查' })).not.toBeInTheDocument()
		expect(screen.queryByRole('button', { name: '立即更新' })).not.toBeInTheDocument()
	})

	it('按运行版本和 staged 渠道请求并展示累计更新说明', async () => {
		mocks.getCurrentVersion.mockResolvedValue('0.1.2-beta.2')
		mocks.useChangelog.mockImplementation((query) => ({
			isLoading: false,
			releases: query ? [{ version: '0.1.2-beta.4' }, { version: '0.1.2-beta.3' }] : [],
		}))
		showSnapshot('available', { channel: 'beta', version: '0.1.2-beta.4' })
		renderUpdateDialog()

		await waitFor(() =>
			expect(mocks.useChangelog).toHaveBeenLastCalledWith({
				kind: 'range',
				channel: 'beta',
				currentVersion: '0.1.2-beta.2',
				targetVersion: '0.1.2-beta.4',
			}),
		)
		const notes = screen.getByRole('region', { name: '本次累计更新说明' })
		expect(within(notes).getByText('v0.1.2-beta.4')).toBeInTheDocument()
		expect(within(notes).getByText('v0.1.2-beta.3')).toBeInTheDocument()
	})

	it('累计区间无说明时仍可下载 staged 目标', async () => {
		mocks.getCurrentVersion.mockResolvedValue('0.1.0')
		showSnapshot('available', { channel: 'stable', version: '0.2.0' })
		renderUpdateDialog()

		await waitFor(() =>
			expect(mocks.useChangelog).toHaveBeenLastCalledWith({
				kind: 'range',
				channel: 'stable',
				currentVersion: '0.1.0',
				targetVersion: '0.2.0',
			}),
		)
		expect(screen.queryByRole('region', { name: '本次累计更新说明' })).not.toBeInTheDocument()
		const updateButton = screen.getByRole('button', { name: '立即更新' })
		expect(updateButton).toBeEnabled()
		fireEvent.click(updateButton)
		expect(mocks.startDownload).toHaveBeenCalledTimes(1)
	})

	it('只在后端确认跳过成功后应用权威快照并关闭', async () => {
		showSnapshot('available', { channel: 'beta', version: '0.2.0-beta.4' })
		mocks.skipVersion.mockResolvedValue({
			status: 'ok',
			snapshot: {
				revision: 2,
				phase: 'idle',
				update: null,
				progress: null,
				errorMessage: null,
			},
		})
		renderUpdateDialog()

		fireEvent.click(screen.getByRole('button', { name: '跳过此版本' }))
		await waitFor(() => expect(useUpdateStore.getState().dialogVisible).toBe(false))

		expect(mocks.skipVersion).toHaveBeenCalledWith('0.2.0-beta.4', 'beta')
		expect(useUpdateStore.getState().snapshot).toMatchObject({ revision: 2, phase: 'idle' })
	})

	it('跳过失败时保留权威 Available 和 Dialog 并提示错误', async () => {
		showSnapshot('available', { channel: 'beta', version: '0.2.0-beta.4' })
		mocks.skipVersion.mockResolvedValue({
			status: 'failed',
			message: '更新失败: 设置保存失败',
			snapshot: {
				revision: 2,
				phase: 'available',
				update: { version: '0.2.0-beta.4', channel: 'beta' },
				progress: null,
				errorMessage: null,
			},
		})
		renderUpdateDialog()

		fireEvent.click(screen.getByRole('button', { name: '跳过此版本' }))
		await waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith('更新失败: 设置保存失败'))

		expect(useUpdateStore.getState()).toMatchObject({
			dialogVisible: true,
			snapshot: { revision: 2, phase: 'available' },
		})
	})

	it('Ready 打开后先读取配置渠道，完成前禁止安装', async () => {
		let resolveSettings: ((settings: typeof stableSettings) => void) | undefined
		mocks.getUpdateSettings.mockReturnValue(
			new Promise((resolve) => {
				resolveSettings = resolve
			}),
		)
		showSnapshot('ready')
		renderUpdateDialog()

		expect(screen.getByRole('button', { name: '正在确认...' })).toBeDisabled()
		expect(mocks.getUpdateSettings).toHaveBeenCalledTimes(1)

		await act(async () => {
			resolveSettings?.(stableSettings)
		})
		const installButton = await screen.findByRole('button', { name: '立即重启' })
		expect(installButton).toBeEnabled()
		fireEvent.click(installButton)
		expect(mocks.install).toHaveBeenCalledWith(null)
		expect(useUpdateStore.getState()).not.toHaveProperty('configuredChannel')
	})

	it('渠道已切换时明示 staged 身份，并提交精确来源渠道确认', async () => {
		showSnapshot('ready', { channel: 'beta', version: '0.2.0-beta.4' })
		renderUpdateDialog()

		expect(
			await screen.findByText('当前配置为 Stable 渠道，仍将安装 Beta v0.2.0-beta.4。'),
		).toBeInTheDocument()
		fireEvent.click(screen.getByRole('button', { name: '确认安装并重启' }))
		expect(mocks.install).toHaveBeenCalledWith('beta')
	})

	it('安装失败保持 Ready、原版本和同一安装重试入口', async () => {
		mocks.getUpdateSettings.mockResolvedValue({ ...stableSettings, channel: 'beta' })
		showSnapshot('ready', {
			channel: 'beta',
			errorMessage: '系统安装器拒绝了安装包',
			version: '0.2.0-beta.4',
		})
		renderUpdateDialog()

		const retryButton = await screen.findByRole('button', { name: '重试安装' })
		expect(screen.getByText('系统安装器拒绝了安装包')).toBeInTheDocument()
		expect(screen.getByText(/安装包仍然完整保留/)).toBeInTheDocument()
		fireEvent.click(retryButton)

		expect(mocks.install).toHaveBeenCalledWith(null)
		expect(mocks.startDownload).not.toHaveBeenCalled()
		expect(mocks.checkNow).not.toHaveBeenCalled()
	})

	it('Installing 明确锁定关闭和全部更新操作', async () => {
		showSnapshot('installing')
		renderUpdateDialog()

		expect(screen.getByRole('heading', { name: '正在安装更新' })).toBeInTheDocument()
		expect(screen.getByRole('button', { name: '正在安装...' })).toBeDisabled()
		const closeButton = screen.getByRole('button', { name: '关闭' })
		expect(closeButton).toBeDisabled()
		fireEvent.click(closeButton)

		expect(useUpdateStore.getState().dialogVisible).toBe(true)
		expect(mocks.getUpdateSettings).not.toHaveBeenCalled()
		expect(mocks.install).not.toHaveBeenCalled()
		expect(screen.queryByRole('button', { name: '重新检查' })).not.toBeInTheDocument()
		expect(screen.queryByRole('button', { name: '立即更新' })).not.toBeInTheDocument()
		await waitFor(() => expect(useUpdateStore.getState().dialogVisible).toBe(true))
	})
})

function renderUpdateDialog() {
	return render(<UpdateDialog />)
}

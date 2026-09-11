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
	useChangelog: mocks.useChangelog,
}))

vi.mock('@/features/changelog/presentation', () => ({
	ChangelogRelease: ({ release }: { release: { version: string } }) => (
		<article>v{release.version}</article>
	),
	ChangelogReleaseContent: () => <p>目标版本更新内容</p>,
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

	it.each([false, true])('首尾 Tab 回绕（Shift=%s）', (shiftKey) => {
		showSnapshot('available')
		renderUpdateDialog()
		const first = screen.getByRole('button', { name: '关闭' })
		const last = screen.getByRole('button', { name: '立即更新' })
		const source = shiftKey ? first : last
		const target = shiftKey ? last : first
		act(() => source.focus())
		expect(source).toHaveFocus()

		fireEvent.keyDown(source, { key: 'Tab', shiftKey })

		expect(target).toHaveFocus()
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
			releases: query
				? [{ version: '0.1.2-beta.4', date: '2026-08-07' }, { version: '0.1.2-beta.3' }]
				: [],
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
		expect(notes).toHaveAttribute('tabindex', '0')
		expect(screen.getByRole('heading', { name: '发现新版本' })).toBeInTheDocument()
		expect(screen.getAllByText(/0\.1\.2-beta\.4/)).toHaveLength(1)
		expect(screen.getByText('2026-08-07')).toHaveAttribute('datetime', '2026-08-07')
		expect(notes).not.toContainElement(screen.getByText('v0.1.2-beta.4'))
		expect(within(notes).getByText('目标版本更新内容')).toBeInTheDocument()
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
		expect(screen.getByRole('region', { name: '本次累计更新说明' })).toBeInTheDocument()
		expect(screen.getByText('本次更新说明暂不可用，不影响更新。')).toBeInTheDocument()
		expect(screen.getAllByText('v0.2.0')).toHaveLength(1)
		expect(screen.queryByText('2026-08-07')).not.toBeInTheDocument()
		const updateButton = screen.getByRole('button', { name: '立即更新' })
		expect(updateButton).toBeEnabled()
		fireEvent.click(updateButton)
		expect(mocks.startDownload).toHaveBeenCalledTimes(1)
	})

	it('说明仍在加载或只缓存了部分版本时，不隐藏已有内容也不禁用更新', async () => {
		mocks.getCurrentVersion.mockResolvedValue('0.1.0')
		mocks.useChangelog.mockReturnValue({ releases: [{ version: '0.1.1' }], isLoading: true })
		showSnapshot('available', { version: '0.2.0' })
		renderUpdateDialog()

		expect(await screen.findByText('正在读取本次更新说明…')).toBeInTheDocument()
		expect(screen.getAllByText('v0.2.0')).toHaveLength(1)
		expect(screen.getByText('v0.1.1')).toBeInTheDocument()
		expect(screen.getByRole('button', { name: '立即更新' })).toBeEnabled()
	})

	it('运行版本读取失败时结束说明加载提示，仍允许更新', async () => {
		mocks.getCurrentVersion.mockRejectedValue(new Error('version unavailable'))
		showSnapshot('available')
		renderUpdateDialog()

		expect(await screen.findByText('本次更新说明暂不可用，不影响更新。')).toBeInTheDocument()
		expect(screen.getByRole('button', { name: '立即更新' })).toBeEnabled()
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

	it('稍后只关闭当前提醒，不跳过版本或启动下载', () => {
		showSnapshot('available')
		const snapshot = useUpdateStore.getState().snapshot
		renderUpdateDialog()

		fireEvent.click(screen.getByRole('button', { name: '稍后' }))

		expect(useUpdateStore.getState()).toMatchObject({
			dialogVisible: false,
			dialogClosedRevision: 1,
		})
		expect(useUpdateStore.getState().snapshot).toBe(snapshot)
		expect(mocks.skipVersion).not.toHaveBeenCalled()
		expect(mocks.startDownload).not.toHaveBeenCalled()
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

	it('下载时用进度条表达状态，只保留取消与后台继续两个动作', () => {
		showSnapshot('downloading')
		renderUpdateDialog()

		expect(screen.getByRole('progressbar', { name: '下载进度' })).toBeInTheDocument()
		expect(screen.queryByRole('button', { name: '下载中' })).not.toBeInTheDocument()
		fireEvent.click(screen.getByRole('button', { name: '取消下载' }))
		expect(mocks.cancelDownload).toHaveBeenCalledTimes(1)
		fireEvent.click(screen.getByRole('button', { name: '后台继续' }))
		expect(useUpdateStore.getState().dialogVisible).toBe(false)
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
		expect(screen.queryByText('安装包已就绪')).not.toBeInTheDocument()
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

	it('重新打开同一 Ready 版本时重新确认渠道，不沿用上次安装许可', async () => {
		showSnapshot('ready', { channel: 'beta', version: '0.2.0-beta.4' })
		renderUpdateDialog()
		expect(await screen.findByRole('button', { name: '确认安装并重启' })).toBeEnabled()
		act(() => useUpdateStore.setState({ dialogVisible: false }))

		const pendingSettings = Promise.withResolvers<typeof stableSettings>()
		mocks.getUpdateSettings.mockReturnValueOnce(pendingSettings.promise)
		act(() => useUpdateStore.setState({ dialogVisible: true }))
		expect(screen.getByRole('button', { name: '正在确认...' })).toBeDisabled()
		expect(mocks.getUpdateSettings).toHaveBeenCalledTimes(2)
		expect(mocks.install).not.toHaveBeenCalled()

		await act(async () => pendingSettings.resolve(stableSettings))
		expect(await screen.findByRole('button', { name: '确认安装并重启' })).toBeEnabled()
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

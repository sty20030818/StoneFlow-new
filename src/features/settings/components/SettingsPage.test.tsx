import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { listen } from '@tauri-apps/api/event'
import type * as TauriEvent from '@tauri-apps/api/event'
import { Toast, toast } from '@heroui/react'

import type { ShellSidebarSettings } from '../api/shellDevicePreferences'
import { SettingsPage } from './SettingsPage'
import {
	applyAccentPreference,
	bootstrapAppearance,
	readAccentPreference,
} from '@/features/appearance'
import type { Space } from '@/shared/types'
import { renderWithRouterContext } from '@/test/renderWithRouter'

const loadSidebarSettingsSpy = vi.fn<() => Promise<void>>()
const setItemVisibilitySpy =
	vi.fn<(target: { kind: 'main' | 'footer'; key: string }, visible: boolean) => Promise<void>>()
const setProjectSectionConfigSpy =
	vi.fn<(config: ShellSidebarSettings['projectSection']) => Promise<void>>()
const loadSpacesSpy = vi.fn<() => Promise<void>>()
const setDefaultSpaceSpy = vi.fn<(spaceId: string) => Promise<Space>>()
const getSyncStatusSpy = vi.fn<() => Promise<unknown>>()
const getSyncDiagnosticsSpy = vi.fn<() => Promise<unknown>>()
const configureSyncSpy = vi.fn<(input: { databaseUrl: string }) => Promise<unknown>>()
const runSyncSpy = vi.fn<() => Promise<unknown>>()
const updateSyncPolicySpy =
	vi.fn<
		(input: {
			mode: 'interval' | 'on_write' | 'manual'
			intervalMinutes: number
		}) => Promise<unknown>
	>()
const unlistenSyncStatusSpy = vi.fn<() => void>()
const mockedListen = vi.mocked(listen)

let sidebarStoreState = createSidebarStoreState()
let spaceStoreState = createSpaceStoreState()

vi.mock('@tauri-apps/api/event', () => ({
	listen: vi.fn<typeof listen>(),
}))

vi.mock('../model/useSidebarSettingsStore', () => ({
	selectSidebarSettings: (state: typeof sidebarStoreState) => state.settings,
	selectSidebarSettingsStatus: (state: typeof sidebarStoreState) => state.status,
	selectSidebarSettingsError: (state: typeof sidebarStoreState) => state.errorMessage,
	useSidebarSettingsStore: (selector: (state: typeof sidebarStoreState) => unknown) =>
		selector(sidebarStoreState),
}))

vi.mock('@/features/space', () => ({
	useSpaces: () => ({
		spaces: spaceStoreState.spaces,
		status: spaceStoreState.status,
		error: spaceStoreState.error,
		refetch: loadSpacesSpy,
	}),
	useSetDefaultSpaceMutation: () => ({
		mutateAsync: setDefaultSpaceSpy,
	}),
}))

vi.mock('@/features/sync', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@/features/sync')>()
	return {
		...actual,
		getSyncStatus: () => getSyncStatusSpy(),
		getSyncDiagnostics: () => getSyncDiagnosticsSpy(),
		configureSync: (input: { databaseUrl: string }) => configureSyncSpy(input),
		runSync: () => runSyncSpy(),
		updateSyncPolicy: (input: {
			mode: 'interval' | 'on_write' | 'manual'
			intervalMinutes: number
		}) => updateSyncPolicySpy(input),
	}
})

let mockSettingsSection: 'general' | 'sidebar' | 'sync' | 'update' = 'sidebar'

vi.mock('@/app/navigation/ShellRouteContext', () => ({
	useCurrentShellRoute: () => ({
		kind: 'shell-section',
		scope: { type: 'all' },
		spaceId: null,
		section: 'settings',
		settingsSection: mockSettingsSection,
		isSettingsPath: true,
	}),
}))

describe('SettingsPage', () => {
	beforeEach(() => {
		act(() => toast.clear())
		mockSettingsSection = 'sidebar'
		loadSidebarSettingsSpy.mockReset()
		loadSidebarSettingsSpy.mockResolvedValue(undefined)
		setItemVisibilitySpy.mockReset()
		setItemVisibilitySpy.mockResolvedValue(undefined)
		setProjectSectionConfigSpy.mockReset()
		setProjectSectionConfigSpy.mockResolvedValue(undefined)
		loadSpacesSpy.mockReset()
		loadSpacesSpy.mockResolvedValue(undefined)
		setDefaultSpaceSpy.mockReset()
		setDefaultSpaceSpy.mockImplementation(async (spaceId) => {
			const nextDefaultSpace = spaceStoreState.spaces.find((space) => space.id === spaceId)
			if (!nextDefaultSpace) {
				throw new Error('space not found')
			}
			spaceStoreState.spaces = spaceStoreState.spaces.map((space) => ({
				...space,
				isDefault: space.id === spaceId,
			}))
			return spaceStoreState.spaces.find((space) => space.id === spaceId)!
		})
		getSyncStatusSpy.mockReset()
		getSyncStatusSpy.mockResolvedValue(
			createSyncStatusPayload({
				enabled: false,
				status: 'disabled',
				lastPushAt: null,
				lastPullAt: null,
				lastError: null,
				lastErrorMode: null,
				dirtySince: null,
				pendingResync: false,
				hasRemoteConfig: false,
				remoteUrl: null,
				replicaState: 'uninitialized',
				replicaReason: null,
				lastRestoreAt: null,
			}),
		)
		getSyncDiagnosticsSpy.mockReset()
		getSyncDiagnosticsSpy.mockResolvedValue({
			remoteHost: 'postgresql://user:***@db.example.com:5432/sf',
			local: {
				deviceId: 'device-1',
				lastPulledServerSeq: 12,
				lastRestoreAt: '2026-06-28T00:00:00Z',
				pendingMutationCount: 1,
				counts: {
					spaces: 6,
					projects: 8,
					tasks: 60,
					taskLinks: 0,
					views: 10,
					settings: 4,
					totalItems: 88,
				},
			},
			remote: {
				latestServerSeq: 15,
				counts: {
					spaces: 6,
					projects: 8,
					tasks: 60,
					taskLinks: 0,
					views: 10,
					settings: 4,
					totalItems: 88,
				},
			},
		})
		configureSyncSpy.mockReset()
		configureSyncSpy.mockResolvedValue(
			createSyncStatusPayload({
				enabled: true,
				status: 'synced',
				lastPushAt: null,
				lastPullAt: null,
				lastError: null,
				lastErrorMode: null,
				dirtySince: null,
				pendingResync: false,
				hasRemoteConfig: true,
				remoteUrl: 'postgresql://user:***@db.example.com:5432/sf',
				replicaState: 'ready',
				replicaReason: null,
				lastRestoreAt: null,
			}),
		)
		runSyncSpy.mockReset()
		runSyncSpy.mockResolvedValue(
			createSyncStatusPayload({
				enabled: true,
				status: 'synced',
				lastPushAt: '2026-06-26T00:00:00Z',
				lastPullAt: '2026-06-26T00:00:01Z',
				lastError: null,
				lastErrorMode: null,
				dirtySince: null,
				pendingResync: false,
				hasRemoteConfig: true,
				remoteUrl: 'postgresql://user:***@db.example.com:5432/sf',
				replicaState: 'ready',
				replicaReason: null,
				lastRestoreAt: null,
			}),
		)
		updateSyncPolicySpy.mockReset()
		updateSyncPolicySpy.mockResolvedValue(
			createSyncStatusPayload({
				enabled: true,
				status: 'synced',
				lastPushAt: null,
				lastPullAt: null,
				lastError: null,
				lastErrorMode: null,
				dirtySince: null,
				pendingResync: false,
				hasRemoteConfig: true,
				remoteUrl: 'postgresql://user:***@db.example.com:5432/sf',
				replicaState: 'ready',
				replicaReason: null,
				lastRestoreAt: null,
				policyMode: 'manual',
			}),
		)
		unlistenSyncStatusSpy.mockReset()
		mockedListen.mockReset()
		mockedListen.mockResolvedValue(unlistenSyncStatusSpy)
		sidebarStoreState = createSidebarStoreState()
		spaceStoreState = createSpaceStoreState()
		localStorage.clear()
		applyAccentPreference('cobalt')
	})

	afterEach(() => {
		act(() => toast.clear())
		vi.useRealTimers()
		localStorage.clear()
		applyAccentPreference('cobalt')
	})

	it('渲染侧边栏设置分区并触发初始化加载', async () => {
		mockSettingsSection = 'sidebar'
		await renderSettingsPage()

		await waitFor(() => {
			expect(loadSidebarSettingsSpy).toHaveBeenCalledTimes(1)
		})

		expect(screen.getByText('主导航')).toBeInTheDocument()
		expect(screen.getByText('辅助入口')).toBeInTheDocument()
		expect(screen.getByText('项目分区')).toBeInTheDocument()
		expect(screen.queryByText('默认空间')).not.toBeInTheDocument()
		expect(screen.queryByText('设置功能建设中')).not.toBeInTheDocument()
	})

	it('设置路径复用共享面包屑，只有祖先页可导航', async () => {
		mockSettingsSection = 'sidebar'
		await renderSettingsPage()

		expect(screen.getByRole('link', { name: '设置' })).toHaveAttribute(
			'href',
			'/all/settings/general',
		)
		const current = screen.getByText('侧边栏').closest('[aria-current="page"]')
		expect(current).toHaveAttribute('aria-current', 'page')
		expect(current).not.toHaveAttribute('role')
		expect(screen.getAllByRole('link')).toHaveLength(1)
	})

	it.each([
		{
			label: '所有任务',
			description: '统一查看当前范围内的全部任务。',
			target: { kind: 'main' as const, key: 'allTasks' },
		},
		{
			label: '视图',
			description: '保留视图入口，方便按条件聚焦任务。',
			target: { kind: 'main' as const, key: 'views' },
		},
		{
			label: '项目总览',
			description: '保留项目入口，方便集中查看和管理项目。',
			target: { kind: 'main' as const, key: 'projectOverview' },
		},
		{
			label: '归档',
			description: '显示归档入口，方便集中查看暂时收起的内容。',
			target: { kind: 'footer' as const, key: 'archive' },
		},
		{
			label: '回收站',
			description: '显示回收站入口，方便恢复或彻底删除内容。',
			target: { kind: 'footer' as const, key: 'trash' },
		},
	])('$label 保留说明文案，并提交对应显隐 mutation', async ({ label, description, target }) => {
		mockSettingsSection = 'sidebar'
		await renderSettingsPage()

		const toggle = getToggleByLabel(label)
		expect(screen.getByText(description)).toBeInTheDocument()
		fireEvent.click(toggle)

		await waitFor(() => {
			expect(setItemVisibilitySpy).toHaveBeenCalledTimes(1)
			expect(setItemVisibilitySpy).toHaveBeenCalledWith(target, false)
		})
	})

	it.each([
		{
			label: '显示项目分区',
			description: '决定侧边栏中是否展示项目分区。',
			field: 'visible' as const,
		},
		{
			label: '显示已完成项目',
			description: '控制项目分区里是否包含已完成项目。',
			field: 'showCompleted' as const,
		},
		{
			label: '显示数量',
			description: '控制项目列表是否显示任务数量徽标。',
			field: 'showCounts' as const,
		},
	])(
		'$label 会把对应字段 patch 到 project-section mutation',
		async ({ label, description, field }) => {
			mockSettingsSection = 'sidebar'
			await renderSettingsPage()

			const toggle = getToggleByLabel(label)
			expect(screen.getByText(description)).toBeInTheDocument()
			fireEvent.click(toggle)

			await waitFor(() => {
				expect(setProjectSectionConfigSpy).toHaveBeenCalledTimes(1)
				expect(setProjectSectionConfigSpy).toHaveBeenCalledWith({
					...sidebarStoreState.settings!.projectSection,
					[field]: false,
				})
			})
		},
	)

	it('CellSwitch 暴露公开且可聚焦的 switch 语义', async () => {
		mockSettingsSection = 'sidebar'
		await renderSettingsPage()

		const toggle = getToggleByLabel('显示已完成项目')
		act(() => toggle.focus())

		expect(toggle).toHaveFocus()
		expect(toggle).toHaveAttribute('tabindex', '0')
		// Space 激活依赖浏览器为原生 switch 合成 click；jsdom 不可靠模拟，留给 WebView smoke。
	})

	it('最后一个主入口保持原生 disabled，公开交互不能绕过约束', async () => {
		sidebarStoreState.settings!.mainItems.views.visible = false
		sidebarStoreState.settings!.mainItems.projectOverview.visible = false
		mockSettingsSection = 'sidebar'
		await renderSettingsPage()

		const toggle = getToggleByLabel('所有任务')
		expect(toggle).toBeDisabled()

		fireEvent.click(toggle)
		expect(setItemVisibilitySpy).not.toHaveBeenCalled()
	})

	it('CellSwitch mutation pending 时禁用同组开关，完成后恢复', async () => {
		const deferred = createDeferred<void>()
		setItemVisibilitySpy.mockReturnValueOnce(deferred.promise)
		mockSettingsSection = 'sidebar'
		await renderSettingsPage()

		fireEvent.click(getToggleByLabel('所有任务'))

		await waitFor(() => {
			expect(setItemVisibilitySpy).toHaveBeenCalledTimes(1)
			for (const label of ['所有任务', '视图', '项目总览']) {
				expect(getToggleByLabel(label)).toBeDisabled()
			}
		})

		expect(setItemVisibilitySpy).toHaveBeenCalledTimes(1)

		act(() => deferred.resolve(undefined))
		await waitFor(() => {
			for (const label of ['所有任务', '视图', '项目总览']) {
				expect(getToggleByLabel(label)).toBeEnabled()
			}
		})
	})

	it('CellSwitch mutation 失败时保留 canonical 值并展示分组错误', async () => {
		setItemVisibilitySpy.mockRejectedValueOnce(new Error('主导航写入失败'))
		mockSettingsSection = 'sidebar'
		await renderSettingsPage()

		const toggle = getToggleByLabel('所有任务')
		fireEvent.click(toggle)

		await waitFor(() => {
			expect(screen.getByRole('alert')).toHaveTextContent('主导航写入失败')
			expect(toggle).toBeChecked()
			expect(toggle).toBeEnabled()
		})
	})

	it('默认 Space 展示 canonical 当前值，选择当前项不重复提交，选择新项才提交', async () => {
		mockSettingsSection = 'general'
		await renderSettingsPage()

		const trigger = getDefaultSpaceTrigger()
		expect(trigger).toHaveTextContent('工作')

		fireEvent.click(trigger)
		fireEvent.click(await screen.findByRole('option', { name: '工作' }))
		expect(setDefaultSpaceSpy).not.toHaveBeenCalled()

		fireEvent.click(trigger)
		fireEvent.click(await screen.findByRole('option', { name: '生活' }))

		await waitFor(() => {
			expect(setDefaultSpaceSpy).toHaveBeenCalledTimes(1)
			expect(setDefaultSpaceSpy).toHaveBeenCalledWith('space-2')
			expect(trigger).toHaveTextContent('生活')
			expect(screen.getByText('当前默认项：生活')).toBeInTheDocument()
		})
	})

	it('默认 Space 提交期间禁用选择并拦截重复操作', async () => {
		const deferred = createDeferred<Space>()
		setDefaultSpaceSpy.mockReturnValueOnce(deferred.promise)
		mockSettingsSection = 'general'
		await renderSettingsPage()

		const trigger = getDefaultSpaceTrigger()
		fireEvent.click(trigger)
		fireEvent.click(await screen.findByRole('option', { name: '生活' }))

		await waitFor(() => {
			expect(setDefaultSpaceSpy).toHaveBeenCalledTimes(1)
			expect(trigger).toBeDisabled()
			expect(trigger.closest('[aria-busy]')).toHaveAttribute('aria-busy', 'true')
		})

		fireEvent.click(trigger)
		expect(setDefaultSpaceSpy).toHaveBeenCalledTimes(1)

		act(() => deferred.resolve(spaceStoreState.spaces[1]!))
		await waitFor(() => expect(trigger).toBeEnabled())
	})

	it('默认 Space 提交失败时保留 canonical 当前值与错误反馈', async () => {
		setDefaultSpaceSpy.mockRejectedValueOnce(new Error('默认空间写入失败'))
		mockSettingsSection = 'general'
		await renderSettingsPage()

		const trigger = getDefaultSpaceTrigger()
		fireEvent.click(trigger)
		fireEvent.click(await screen.findByRole('option', { name: '生活' }))

		await waitFor(() => {
			expect(screen.getByRole('alert')).toHaveTextContent('默认空间写入失败')
			expect(trigger).toHaveTextContent('工作')
			expect(trigger).toBeEnabled()
		})
	})

	it('没有可用 Space 时保留禁用的 CellSelect 与空状态反馈', async () => {
		spaceStoreState.spaces = []
		mockSettingsSection = 'general'
		await renderSettingsPage()

		expect(getDefaultSpaceTrigger()).toBeDisabled()
		expect(screen.getByText('当前没有可用空间')).toBeInTheDocument()
		expect(setDefaultSpaceSpy).not.toHaveBeenCalled()
	})

	it('选择主题色后立即应用，并在重新挂载时恢复本机选择', async () => {
		mockSettingsSection = 'general'
		const view = await renderSettingsPage()
		const cobalt = screen.getByRole('radio', { name: '钴蓝' })

		expect(screen.getAllByRole('radio')).toHaveLength(6)
		expect(cobalt).toBeChecked()

		fireEvent.keyDown(cobalt, { key: 'ArrowDown' })
		await waitFor(() => expect(screen.getByRole('radio', { name: '海洋蓝' })).toBeChecked())

		fireEvent.click(screen.getByRole('radio', { name: '松柏' }))
		await waitFor(() => {
			expect(screen.getByRole('radio', { name: '松柏' })).toBeChecked()
			expect(document.documentElement.dataset.accent).toBe('pine')
			expect(readAccentPreference()).toBe('pine')
		})

		view.unmount()
		applyAccentPreference('cobalt')
		bootstrapAppearance()
		await renderSettingsPage()

		expect(screen.getByRole('radio', { name: '松柏' })).toBeChecked()
		expect(document.documentElement.dataset.accent).toBe('pine')
	})

	it('保存同步配置时调用 configureSync、关闭弹窗并显示成功 Toast', async () => {
		mockSettingsSection = 'sync'
		await renderSettingsPage()
		openSyncConfigDialog()

		fireEvent.change(screen.getByLabelText('同步数据库连接'), {
			target: { value: 'postgresql://user:secret@db.example.com:5432/sf' },
		})
		fireEvent.click(screen.getByRole('button', { name: '保存配置' }))

		await waitFor(() => {
			expect(configureSyncSpy).toHaveBeenCalledWith({
				databaseUrl: 'postgresql://user:secret@db.example.com:5432/sf',
			})
		})
		// 保存路径直接用 configureSync 返回的状态，不再额外 getSyncStatus
		expect(getSyncStatusSpy).toHaveBeenCalledTimes(1)

		await waitFor(() =>
			expect(screen.queryByRole('dialog', { name: '配置云端副本' })).not.toBeInTheDocument(),
		)
		const successToast = await screen.findByRole('alertdialog', { name: '配置已保存' })
		expect(successToast).toBeVisible()
		expect(successToast).toHaveTextContent('正在后台验证连接。')
		openSyncConfigDialog()
		await waitFor(() => {
			expect(screen.getByLabelText('同步数据库连接')).toHaveValue('')
		})
	})

	it('同步配置保存失败时显示弹窗内 Alert，并通过原位主按钮再次保存', async () => {
		configureSyncSpy.mockRejectedValueOnce(new Error('连接被拒绝'))
		mockSettingsSection = 'sync'
		await renderSettingsPage()
		openSyncConfigDialog()

		const dialog = screen.getByRole('dialog', { name: '配置云端副本' })
		const databaseUrl = screen.getByLabelText('同步数据库连接')
		fireEvent.change(databaseUrl, {
			target: { value: 'postgresql://user:secret@db.example.com:5432/sf' },
		})
		const saveButton = screen.getByRole('button', { name: '保存配置' })
		fireEvent.click(saveButton)

		const inlineError = await within(dialog).findByRole('alert')
		expect(inlineError).toHaveTextContent('保存失败')
		expect(inlineError).toHaveTextContent('连接被拒绝')
		expect(inlineError).toHaveTextContent('输入已保留，请检查后再次保存。')
		expect(dialog).toBeInTheDocument()
		expect(databaseUrl).toHaveValue('postgresql://user:secret@db.example.com:5432/sf')
		expect(databaseUrl).not.toHaveAttribute('aria-invalid', 'true')
		expect(screen.queryByRole('alertdialog', { name: '保存失败' })).not.toBeInTheDocument()
		expect(screen.getByRole('button', { name: '保存配置' })).toBe(saveButton)

		await waitFor(() => expect(saveButton).toBeEnabled())
		fireEvent.click(saveButton)
		await waitFor(() =>
			expect(screen.queryByRole('dialog', { name: '配置云端副本' })).not.toBeInTheDocument(),
		)
		expect(configureSyncSpy).toHaveBeenCalledTimes(2)
		expect(await screen.findByRole('alertdialog', { name: '配置已保存' })).toBeVisible()
	})

	it('离开设置页后取消同步配置的延迟刷新', async () => {
		const delayedRefreshes = new Map<number, () => void>()
		let nextTimerId = 10_000
		const nativeSetTimeout = window.setTimeout.bind(window)
		const nativeClearTimeout = window.clearTimeout.bind(window)
		const setTimeoutSpy = vi
			.spyOn(window, 'setTimeout')
			.mockImplementation((handler, timeout, ...args) => {
				if ((timeout === 2500 || timeout === 8000) && typeof handler === 'function') {
					const timerId = nextTimerId++
					delayedRefreshes.set(timerId, () => handler(...args))
					return timerId
				}
				return nativeSetTimeout(handler, timeout, ...args)
			})
		const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout').mockImplementation((timerId) => {
			if (typeof timerId === 'number' && delayedRefreshes.delete(timerId)) return
			nativeClearTimeout(timerId)
		})

		try {
			mockSettingsSection = 'sync'
			const view = await renderSettingsPage()
			openSyncConfigDialog()
			fireEvent.change(screen.getByLabelText('同步数据库连接'), {
				target: { value: 'postgresql://user:secret@db.example.com:5432/sf' },
			})
			fireEvent.click(screen.getByRole('button', { name: '保存配置' }))

			await waitFor(() => expect(delayedRefreshes.size).toBe(2))
			view.unmount()
			getSyncStatusSpy.mockClear()
			act(() => delayedRefreshes.forEach((refresh) => refresh()))

			expect(getSyncStatusSpy).not.toHaveBeenCalled()
		} finally {
			clearTimeoutSpy.mockRestore()
			setTimeoutSpy.mockRestore()
		}
	})

	it('同步配置仍在保存时离开设置页不会再排定延迟刷新', async () => {
		const deferred = createDeferred<unknown>()
		configureSyncSpy.mockReturnValueOnce(deferred.promise)
		const setTimeoutSpy = vi.spyOn(window, 'setTimeout')

		try {
			mockSettingsSection = 'sync'
			const view = await renderSettingsPage()
			openSyncConfigDialog()
			fireEvent.change(screen.getByLabelText('同步数据库连接'), {
				target: { value: 'postgresql://user:secret@db.example.com:5432/sf' },
			})
			fireEvent.click(screen.getByRole('button', { name: '保存配置' }))
			await waitFor(() => expect(configureSyncSpy).toHaveBeenCalledTimes(1))

			view.unmount()
			setTimeoutSpy.mockClear()
			await act(async () => {
				deferred.resolve(createReadyIntervalSyncStatus())
				await deferred.promise
			})

			expect(setTimeoutSpy).not.toHaveBeenCalledWith(expect.any(Function), 2500)
			expect(setTimeoutSpy).not.toHaveBeenCalledWith(expect.any(Function), 8000)
		} finally {
			setTimeoutSpy.mockRestore()
		}
	})

	it('页面加载后连接串输入保持空白（密码不回显）', async () => {
		getSyncStatusSpy.mockResolvedValue(
			createSyncStatusPayload({
				enabled: true,
				status: 'synced',
				lastPushAt: null,
				lastPullAt: null,
				lastError: null,
				lastErrorMode: null,
				dirtySince: null,
				pendingResync: false,
				hasRemoteConfig: true,
				remoteUrl: 'postgresql://user:***@saved.example.com:5432/sf',
				replicaState: 'ready',
				replicaReason: null,
				lastRestoreAt: null,
			}),
		)

		mockSettingsSection = 'sync'
		await renderSettingsPage()
		openSyncConfigDialog()

		expect(screen.getByLabelText('同步数据库连接')).toHaveValue('')
		expect(screen.getByText('云端副本已配置')).toBeInTheDocument()
	})

	it('开发构建的同步配置只提示 .env.local，不提供写入表单', async () => {
		getSyncStatusSpy.mockResolvedValue(
			createSyncStatusPayload({
				enabled: false,
				status: 'disabled',
				lastPushAt: null,
				lastPullAt: null,
				lastError: null,
				lastErrorMode: null,
				dirtySince: null,
				pendingResync: false,
				hasRemoteConfig: false,
				credentialState: 'missing',
				configSource: 'environment',
				remoteUrl: null,
				replicaState: 'uninitialized',
				replicaReason: null,
				lastRestoreAt: null,
			}),
		)

		mockSettingsSection = 'sync'
		await renderSettingsPage()
		openSyncConfigDialog()

		expect(screen.getByText('.env.local 是唯一配置来源')).toBeInTheDocument()
		expect(screen.queryByLabelText('同步数据库连接')).not.toBeInTheDocument()
		expect(screen.queryByRole('button', { name: '保存配置' })).not.toBeInTheDocument()
	})

	it('后台状态刷新时不应覆盖正在编辑的同步配置草稿', async () => {
		const setIntervalSpy = vi.spyOn(window, 'setInterval')
		setIntervalSpy.mockImplementation((callback) => {
			if (typeof callback === 'function') {
				void callback()
			}
			return 1 as unknown as number
		})

		getSyncStatusSpy
			.mockResolvedValueOnce(
				createSyncStatusPayload({
					enabled: true,
					status: 'synced',
					lastPushAt: null,
					lastPullAt: null,
					lastError: null,
					lastErrorMode: null,
					dirtySince: null,
					pendingResync: false,
					hasRemoteConfig: true,
					remoteUrl: 'postgresql://user:***@saved.example.com:5432/sf',
					replicaState: 'ready',
					replicaReason: null,
					lastRestoreAt: null,
				}),
			)
			.mockResolvedValue(
				createSyncStatusPayload({
					enabled: true,
					status: 'synced',
					lastPushAt: null,
					lastPullAt: null,
					lastError: null,
					lastErrorMode: null,
					dirtySince: null,
					pendingResync: false,
					hasRemoteConfig: true,
					remoteUrl: 'postgresql://user:***@saved.example.com:5432/sf',
					replicaState: 'ready',
					replicaReason: null,
					lastRestoreAt: null,
				}),
			)

		mockSettingsSection = 'sync'
		await renderSettingsPage()
		openSyncConfigDialog()

		fireEvent.change(screen.getByLabelText('同步数据库连接'), {
			target: { value: 'postgresql://user:new@new.example.com:5432/sf' },
		})

		await waitFor(() => {
			expect(getSyncStatusSpy).toHaveBeenCalledTimes(2)
		})

		expect(screen.getByLabelText('同步数据库连接')).toHaveValue(
			'postgresql://user:new@new.example.com:5432/sf',
		)
		expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 60_000)

		setIntervalSpy.mockRestore()
	})

	it('同步状态事件刷新失败时展示错误', async () => {
		let syncStatusChangedHandler: TauriEvent.EventCallback<unknown> = () => undefined
		mockedListen.mockImplementation(async (_eventName, handler) => {
			syncStatusChangedHandler = handler
			return unlistenSyncStatusSpy
		})

		mockSettingsSection = 'sync'
		await renderSettingsPage()

		await waitFor(() => {
			expect(getSyncStatusSpy).toHaveBeenCalledTimes(1)
			expect(mockedListen).toHaveBeenCalledWith(
				'stoneflow://sync/status-changed',
				expect.any(Function),
			)
		})

		getSyncStatusSpy.mockRejectedValueOnce(new Error('事件刷新失败'))
		act(() => {
			syncStatusChangedHandler({
				event: 'stoneflow://sync/status-changed',
				id: 1,
				payload: { source: 'sync', reason: 'completed' },
			})
		})

		await waitFor(() => {
			expect(getSyncStatusSpy).toHaveBeenCalledTimes(2)
		})
		openSyncDetails()
		expect(await screen.findByRole('alert')).toHaveTextContent('事件刷新失败')
	})

	it('点击立即同步时调用 runSync', async () => {
		getSyncStatusSpy.mockResolvedValue(
			createSyncStatusPayload({
				enabled: true,
				status: 'synced',
				lastPushAt: null,
				lastPullAt: null,
				lastError: null,
				lastErrorMode: null,
				dirtySince: null,
				pendingResync: false,
				hasRemoteConfig: true,
				remoteUrl: 'postgresql://user:***@db.example.com:5432/sf',
				replicaState: 'ready',
				replicaReason: null,
				lastRestoreAt: null,
			}),
		)

		mockSettingsSection = 'sync'
		await renderSettingsPage()

		fireEvent.click(screen.getByRole('button', { name: '立即同步' }))

		await waitFor(() => {
			expect(runSyncSpy).toHaveBeenCalledTimes(1)
		})
	})

	it('切换同步频率时保留定时间隔偏好', async () => {
		getSyncStatusSpy.mockResolvedValue(
			createSyncStatusPayload({
				enabled: true,
				status: 'synced',
				lastPushAt: null,
				lastPullAt: null,
				lastError: null,
				lastErrorMode: null,
				dirtySince: null,
				pendingResync: false,
				hasRemoteConfig: true,
				remoteUrl: 'postgresql://user:***@db.example.com:5432/sf',
				replicaState: 'ready',
				replicaReason: null,
				lastRestoreAt: null,
				policyMode: 'interval',
				policyIntervalMinutes: 7,
			}),
		)
		updateSyncPolicySpy.mockResolvedValue(
			createSyncStatusPayload({
				enabled: true,
				status: 'synced',
				lastPushAt: null,
				lastPullAt: null,
				lastError: null,
				lastErrorMode: null,
				dirtySince: null,
				pendingResync: false,
				hasRemoteConfig: true,
				remoteUrl: 'postgresql://user:***@db.example.com:5432/sf',
				replicaState: 'ready',
				replicaReason: null,
				lastRestoreAt: null,
				policyMode: 'manual',
				policyIntervalMinutes: 7,
			}),
		)

		mockSettingsSection = 'sync'
		await renderSettingsPage()

		fireEvent.click(screen.getByRole('radio', { name: /手动/ }))

		await waitFor(() => {
			expect(updateSyncPolicySpy).toHaveBeenCalledWith({
				mode: 'manual',
				intervalMinutes: 7,
			})
		})
	})

	it('同步间隔在字段内部输入和步进时只更新草稿，离开整个字段后保存', async () => {
		const initialStatus = createReadyIntervalSyncStatus()
		getSyncStatusSpy.mockResolvedValue(initialStatus)
		updateSyncPolicySpy.mockResolvedValue({ ...initialStatus, policyIntervalMinutes: 9 })

		mockSettingsSection = 'sync'
		await renderSettingsPage()

		const input = screen.getByRole('textbox', { name: '同步间隔（分钟）' })
		await waitFor(() => expect(input).not.toBeDisabled())
		const incrementButton = screen.getByRole('button', { name: /增加同步间隔/ })
		const outsideButton = screen.getByRole('button', { name: '配置同步数据库' })
		fireEvent.focus(input)
		fireEvent.change(input, { target: { value: '7' } })
		fireEvent.blur(input, { relatedTarget: incrementButton })
		fireEvent.focus(incrementButton)

		expect(updateSyncPolicySpy).not.toHaveBeenCalled()

		fireEvent.click(incrementButton)
		await waitFor(() => expect(input).toHaveValue('8'))
		expect(updateSyncPolicySpy).not.toHaveBeenCalled()

		fireEvent.blur(incrementButton, { relatedTarget: outsideButton })
		fireEvent.focus(outsideButton)

		await waitFor(() => {
			expect(updateSyncPolicySpy).toHaveBeenCalledTimes(1)
			expect(updateSyncPolicySpy).toHaveBeenCalledWith({
				mode: 'interval',
				intervalMinutes: 8,
			})
			expect(input).toHaveValue('9')
		})
	})

	it('同步间隔按 Enter 保存一次，随后失焦不会重复保存', async () => {
		const initialStatus = createReadyIntervalSyncStatus()
		getSyncStatusSpy.mockResolvedValue(initialStatus)
		updateSyncPolicySpy.mockResolvedValue({ ...initialStatus, policyIntervalMinutes: 1440 })

		mockSettingsSection = 'sync'
		await renderSettingsPage()

		const input = screen.getByRole('textbox', { name: '同步间隔（分钟）' })
		await waitFor(() => expect(input).not.toBeDisabled())
		fireEvent.change(input, { target: { value: '1500' } })
		fireEvent.keyDown(input, { key: 'Enter' })
		fireEvent.keyUp(input, { key: 'Enter' })

		await waitFor(() => {
			expect(updateSyncPolicySpy).toHaveBeenCalledTimes(1)
			expect(updateSyncPolicySpy).toHaveBeenCalledWith({
				mode: 'interval',
				intervalMinutes: 1440,
			})
		})

		fireEvent.blur(input, {
			relatedTarget: screen.getByRole('button', { name: '配置同步数据库' }),
		})

		await waitFor(() => expect(updateSyncPolicySpy).toHaveBeenCalledTimes(1))
	})

	it('同步间隔未变化时离开字段不保存', async () => {
		mockSettingsSection = 'sync'
		await renderSettingsPage()

		const input = screen.getByRole('textbox', { name: '同步间隔（分钟）' })
		await waitFor(() => expect(input).not.toBeDisabled())
		fireEvent.focus(input)
		fireEvent.blur(input, {
			relatedTarget: screen.getByRole('button', { name: '配置同步数据库' }),
		})

		expect(updateSyncPolicySpy).not.toHaveBeenCalled()
	})

	it('同步间隔保存失败时恢复后台值并保留错误反馈', async () => {
		const initialStatus = createReadyIntervalSyncStatus()
		getSyncStatusSpy.mockResolvedValue(initialStatus)
		updateSyncPolicySpy.mockRejectedValueOnce(new Error('策略写入失败'))

		mockSettingsSection = 'sync'
		await renderSettingsPage()

		const input = screen.getByRole('textbox', { name: '同步间隔（分钟）' })
		await waitFor(() => expect(input).not.toBeDisabled())
		fireEvent.focus(input)
		fireEvent.change(input, { target: { value: '7' } })
		fireEvent.blur(input, {
			relatedTarget: screen.getByRole('button', { name: '配置同步数据库' }),
		})

		await waitFor(() => {
			expect(updateSyncPolicySpy).toHaveBeenCalledWith({
				mode: 'interval',
				intervalMinutes: 7,
			})
		})
		await waitFor(() => {
			expect(getSyncStatusSpy).toHaveBeenCalledTimes(2)
			expect(input).toHaveValue('15')
		})

		openSyncDetails()
		expect(await screen.findByRole('alert')).toHaveTextContent('策略写入失败')
	})

	it('缺少同步基线时展示提示并允许建立基线同步', async () => {
		getSyncStatusSpy.mockResolvedValue(
			createSyncStatusPayload({
				enabled: true,
				status: 'synced',
				lastPushAt: null,
				lastPullAt: null,
				lastError: null,
				lastErrorMode: null,
				dirtySince: null,
				pendingResync: false,
				hasRemoteConfig: true,
				remoteUrl: 'postgresql://user:***@db.example.com:5432/sf',
				replicaState: 'baseline_required',
				replicaReason:
					'当前设备已有本地数据，但缺少 server_seq cursor。为避免把未知本地副本误覆盖，暂不自动同步；请先完成同步基线迁移。',
				lastRestoreAt: null,
			}),
		)

		mockSettingsSection = 'sync'
		await renderSettingsPage()

		expect(screen.getAllByText('需要首次同步建立基线').length).toBeGreaterThanOrEqual(1)
		expect(screen.getAllByText('缺少基线').length).toBeGreaterThanOrEqual(1)
		// 允许点「建立基线并同步」：会 origin seed + 上传，不会 wipe 本机
		expect(screen.getByRole('button', { name: '建立基线并同步' })).toBeEnabled()
	})

	it('点击刷新诊断时展示远端与本地摘要', async () => {
		getSyncStatusSpy.mockResolvedValue(
			createSyncStatusPayload({
				enabled: true,
				status: 'synced',
				lastPushAt: null,
				lastPullAt: null,
				lastError: null,
				lastErrorMode: null,
				dirtySince: null,
				pendingResync: false,
				hasRemoteConfig: true,
				remoteUrl: 'postgresql://user:***@db.example.com:5432/sf',
				replicaState: 'ready',
				replicaReason: null,
				lastRestoreAt: '2026-06-28T00:00:00Z',
			}),
		)

		mockSettingsSection = 'sync'
		await renderSettingsPage()
		openSyncDetails()

		fireEvent.click(screen.getByRole('button', { name: '刷新诊断' }))

		await waitFor(() => {
			expect(getSyncDiagnosticsSpy).toHaveBeenCalledTimes(1)
			expect(screen.getByText('同步诊断')).toBeInTheDocument()
			expect(screen.getByText('postgresql://user:***@db.example.com:5432/sf')).toBeInTheDocument()
			expect(screen.getAllByText('总计 88 条主数据')).toHaveLength(2)
			expect(screen.getAllByText('1 条').length).toBeGreaterThanOrEqual(1)
		})
	})
})

async function renderSettingsPage() {
	return renderWithRouterContext(
		<>
			<SettingsPage />
			<Toast.Provider placement='bottom end' />
		</>,
	)
}

function openSyncConfigDialog() {
	fireEvent.click(screen.getByRole('button', { name: '配置同步数据库' }))
}

function openSyncDetails() {
	fireEvent.click(screen.getByRole('button', { name: '详情与诊断' }))
}

function createSyncStatusPayload(overrides: Record<string, unknown>) {
	return {
		credentialState: 'available',
		configSource: 'system_keychain',
		policyMode: 'interval',
		policyIntervalMinutes: 15,
		nextSyncAt: null,
		...overrides,
	}
}

function createReadyIntervalSyncStatus(intervalMinutes = 15) {
	return createSyncStatusPayload({
		enabled: true,
		status: 'synced',
		lastPushAt: null,
		lastPullAt: null,
		lastError: null,
		lastErrorMode: null,
		dirtySince: null,
		pendingResync: false,
		hasRemoteConfig: true,
		remoteUrl: 'postgresql://user:***@db.example.com:5432/sf',
		replicaState: 'ready',
		replicaReason: null,
		lastRestoreAt: null,
		policyMode: 'interval',
		policyIntervalMinutes: intervalMinutes,
	})
}

function getToggleByLabel(label: string) {
	return screen.getByRole('switch', { name: label })
}

function getDefaultSpaceTrigger() {
	return screen.getByRole('button', { name: /默认空间/ })
}

function createSidebarStoreState() {
	return {
		status: 'ready' as const,
		settings: createSidebarSettings(),
		errorMessage: null,
		load: loadSidebarSettingsSpy,
		resetMainItemsVisibility: vi.fn(),
		setItemVisibility: setItemVisibilitySpy,
		setSidebarPreferences: vi.fn(),
		setProjectSectionConfig: setProjectSectionConfigSpy,
	}
}

function createSpaceStoreState() {
	return {
		spaces: [
			createSpace({ id: 'space-1', name: '工作', isDefault: true }),
			createSpace({ id: 'space-2', name: '生活', isDefault: false }),
		],
		status: 'ready' as const,
		error: null,
		load: loadSpacesSpy,
		createSpace: vi.fn(),
		updateSpace: vi.fn(),
		setDefaultSpace: setDefaultSpaceSpy,
		archiveSpace: vi.fn(),
		restoreSpace: vi.fn(),
		deleteSpace: vi.fn(),
	}
}

function createSidebarSettings(): ShellSidebarSettings {
	return {
		mainItems: {
			allTasks: { visible: true, order: 200 },
			views: { visible: true, order: 300 },
			projectOverview: { visible: true, order: 400 },
		},
		projectSection: {
			visible: true,
			order: 500,
			collapsed: false,
			showCounts: true,
			showCompleted: true,
			maxVisible: null,
		},
		footerItems: {
			archive: { visible: true, order: 900 },
			trash: { visible: true, order: 1000 },
		},
		width: 256,
		desktopPreference: 'expanded',
	}
}

function createSpace(overrides: Partial<Space> & Pick<Space, 'id' | 'name' | 'isDefault'>): Space {
	return {
		id: overrides.id,
		name: overrides.name,
		iconKey: overrides.iconKey ?? 'briefcase',
		colorKey: overrides.colorKey ?? 'blue',
		isDefault: overrides.isDefault,
		position: overrides.position ?? 100,
		archivedAt: overrides.archivedAt ?? null,
		deletedAt: overrides.deletedAt ?? null,
		createdAt: overrides.createdAt ?? '2026-05-03T10:00:00Z',
		updatedAt: overrides.updatedAt ?? '2026-05-03T10:00:00Z',
	}
}

function createDeferred<T>() {
	let resolve: ((value: T) => void) | undefined
	const promise = new Promise<T>((nextResolve) => {
		resolve = nextResolve
	})

	return {
		promise,
		resolve(value: T) {
			resolve?.(value)
		},
	}
}

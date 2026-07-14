import React from 'react'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { listen } from '@tauri-apps/api/event'
import type * as TauriEvent from '@tauri-apps/api/event'

import type { ShellSidebarSettings } from '@/app/layouts/shell/model/shellDevicePreferences'
import { SettingsPage } from '@/features/settings/ui/SettingsPage'
import type { Space } from '@/shared/types'
import { renderWithRouterContext } from '@/test/renderWithRouter'

const loadSidebarSettingsSpy = vi.fn<() => Promise<void>>()
const setItemVisibilitySpy =
	vi.fn<(target: { kind: 'main'; key: string }, visible: boolean) => Promise<void>>()
const setProjectSectionConfigSpy =
	vi.fn<(config: ShellSidebarSettings['projectSection']) => Promise<void>>()
const loadSpacesSpy = vi.fn<() => Promise<void>>()
const setDefaultSpaceSpy = vi.fn<(spaceId: string) => Promise<Space>>()
const getSyncStatusSpy = vi.fn<() => Promise<unknown>>()
const getSyncDiagnosticsSpy = vi.fn<() => Promise<unknown>>()
const configureSyncSpy = vi.fn<(input: { url: string; token: string }) => Promise<unknown>>()
const runSyncSpy = vi.fn<() => Promise<unknown>>()
const updateSyncPolicySpy =
	vi.fn<
		(input: { mode: 'interval' | 'manual'; intervalMinutes: 5 | 15 | 30 }) => Promise<unknown>
	>()
const unlistenSyncStatusSpy = vi.fn<() => void>()
const mockedListen = vi.mocked(listen)

let sidebarStoreState = createSidebarStoreState()
let spaceStoreState = createSpaceStoreState()
let syncStatusChangedHandler: TauriEvent.EventCallback<unknown> = () => undefined

vi.mock('@tauri-apps/api/event', () => ({
	listen: vi.fn<typeof TauriEvent.listen>(),
}))

vi.mock('@/app/layouts/shell/model/useSidebarSettingsStore', () => ({
	selectSidebarSettings: (state: typeof sidebarStoreState) => state.settings,
	selectSidebarSettingsStatus: (state: typeof sidebarStoreState) => state.status,
	selectSidebarSettingsError: (state: typeof sidebarStoreState) => state.errorMessage,
	useSidebarSettingsStore: (selector: (state: typeof sidebarStoreState) => unknown) =>
		selector(sidebarStoreState),
}))

vi.mock('@/features/space/query', () => ({
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

vi.mock('@/features/sync/api/sync', () => ({
	getSyncStatus: () => getSyncStatusSpy(),
	getSyncDiagnostics: () => getSyncDiagnosticsSpy(),
	configureSync: (input: { url: string; token: string }) => configureSyncSpy(input),
	runSync: () => runSyncSpy(),
	updateSyncPolicy: (input: { mode: 'interval' | 'manual'; intervalMinutes: 5 | 15 | 30 }) =>
		updateSyncPolicySpy(input),
}))

let mockSettingsSection: 'general' | 'sidebar' | 'sync' | 'update' = 'sidebar'

vi.mock('@/app/layouts/shell/model/ShellRouteContext', () => ({
	useCurrentShellRoute: () => ({
		kind: 'shell-section',
		scope: { type: 'all' },
		spaceId: null,
		section: 'settings',
		settingsSection: mockSettingsSection,
		isSettingsPath: true,
	}),
}))

vi.mock('@/shared/ui/base/select', () => {
	type SelectContextValue = {
		value?: string
		onValueChange?: (value: string) => void
		disabled?: boolean
	}

	type SelectItemProps = {
		value: string
		children: React.ReactNode
	}

	const SelectContext = React.createContext<SelectContextValue | null>(null)
	function MockSelectItem(_props: SelectItemProps) {
		return null
	}

	function collectSelectItems(children: React.ReactNode): SelectItemProps[] {
		const items: SelectItemProps[] = []

		React.Children.forEach(children, (child) => {
			if (!React.isValidElement(child)) {
				return
			}

			if (child.type === MockSelectItem) {
				items.push((child as React.ReactElement<SelectItemProps>).props)
				return
			}

			const nestedChildren = (child as React.ReactElement<{ children?: React.ReactNode }>).props
				.children
			if (nestedChildren) {
				items.push(...collectSelectItems(nestedChildren))
			}
		})

		return items
	}

	return {
		Select: ({
			value,
			onValueChange,
			disabled,
			children,
		}: {
			value?: string
			onValueChange?: (value: string) => void
			disabled?: boolean
			children: React.ReactNode
		}) => {
			const items = collectSelectItems(children)
			const trigger = React.Children.toArray(children).find(
				(child) => React.isValidElement(child) && child.type === MockSelectTrigger,
			)
			const triggerProps =
				React.isValidElement(trigger) && typeof trigger.props === 'object'
					? (trigger.props as Record<string, unknown>)
					: {}

			return (
				<SelectContext.Provider value={{ value, onValueChange, disabled }}>
					<label className='contents'>
						<select
							aria-label={triggerProps['aria-label'] as string | undefined}
							disabled={disabled}
							onChange={(event) => onValueChange?.(event.currentTarget.value)}
							value={value}
						>
							{items.map((item) => (
								<option key={item.value} value={item.value}>
									{item.children}
								</option>
							))}
						</select>
					</label>
				</SelectContext.Provider>
			)
		},
		SelectTrigger: MockSelectTrigger,
		SelectValue: () => null,
		SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
		SelectGroup: ({ children }: { children: React.ReactNode }) => <>{children}</>,
		SelectItem: MockSelectItem,
	}

	function MockSelectTrigger({ children }: { children?: React.ReactNode; 'aria-label'?: string }) {
		const context = React.useContext(SelectContext)
		return <>{context ? children : null}</>
	}
})

describe('SettingsPage', () => {
	beforeEach(() => {
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
			return nextDefaultSpace
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
			remoteHost: 'libsql://example.turso.io',
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
				remoteUrl: 'libsql://example.turso.io',
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
				remoteUrl: 'libsql://example.turso.io',
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
				remoteUrl: 'libsql://example.turso.io',
				replicaState: 'ready',
				replicaReason: null,
				lastRestoreAt: null,
				policyMode: 'manual',
			}),
		)
		unlistenSyncStatusSpy.mockReset()
		syncStatusChangedHandler = () => undefined
		mockedListen.mockReset()
		mockedListen.mockImplementation(async (_eventName, handler) => {
			syncStatusChangedHandler = handler
			return unlistenSyncStatusSpy
		})
		sidebarStoreState = createSidebarStoreState()
		spaceStoreState = createSpaceStoreState()
	})

	afterEach(() => {
		vi.useRealTimers()
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

	it('切换主入口显隐时调用 sidebar settings store', async () => {
		mockSettingsSection = 'sidebar'
		await renderSettingsPage()

		fireEvent.click(getCheckboxByLabel('所有任务'))

		await waitFor(() => {
			expect(setItemVisibilitySpy).toHaveBeenCalledWith({ kind: 'main', key: 'allTasks' }, false)
		})
	})

	it('切换辅助入口显隐时调用 sidebar settings store', async () => {
		mockSettingsSection = 'sidebar'
		await renderSettingsPage()

		fireEvent.click(getCheckboxByLabel('回收站'))

		await waitFor(() => {
			expect(setItemVisibilitySpy).toHaveBeenCalledWith({ kind: 'footer', key: 'trash' }, false)
		})
	})

	it('修改 projects section 配置时调用更新方法', async () => {
		mockSettingsSection = 'sidebar'
		await renderSettingsPage()

		fireEvent.click(getCheckboxByLabel('显示已完成项目'))

		await waitFor(() => {
			expect(setProjectSectionConfigSpy).toHaveBeenCalledWith({
				...sidebarStoreState.settings!.projectSection,
				showCompleted: false,
			})
		})
	})

	it('切换默认 Space 时调用 setDefaultSpace', async () => {
		mockSettingsSection = 'general'
		await renderSettingsPage()

		fireEvent.change(screen.getByLabelText('默认空间'), { target: { value: 'space-2' } })

		await waitFor(() => {
			expect(setDefaultSpaceSpy).toHaveBeenCalledWith('space-2')
		})
	})

	it('保存同步配置时调用 configureSync 并刷新状态', async () => {
		mockSettingsSection = 'sync'
		await renderSettingsPage()
		openSyncConfigDialog()

		fireEvent.change(screen.getByLabelText('Turso URL'), {
			target: { value: 'libsql://example.turso.io' },
		})
		fireEvent.change(screen.getByLabelText('Turso Token'), {
			target: { value: 'secret-token' },
		})
		fireEvent.click(screen.getByRole('button', { name: '保存配置' }))

		await waitFor(() => {
			expect(configureSyncSpy).toHaveBeenCalledWith({
				url: 'libsql://example.turso.io',
				token: 'secret-token',
			})
		})
		expect(getSyncStatusSpy).toHaveBeenCalledTimes(2)
	})

	it('页面加载后会回填已保存的同步配置', async () => {
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
				remoteUrl: 'libsql://saved.turso.io',
				replicaState: 'ready',
				replicaReason: null,
				lastRestoreAt: null,
			}),
		)

		mockSettingsSection = 'sync'
		await renderSettingsPage()
		openSyncConfigDialog()

		expect(screen.getByLabelText('Turso URL')).toHaveValue('libsql://saved.turso.io')
		expect(screen.getByLabelText('Turso Token')).toHaveValue('')
		expect(
			screen.getByText('配置会保存在本地 settings 表；页面刷新后只会自动回填 URL', {
				exact: false,
			}),
		).toBeInTheDocument()
	})

	it('未配置同步时展示本地优先提示', async () => {
		mockSettingsSection = 'sync'
		await renderSettingsPage()

		expect(screen.getByText('尚未启用云同步')).toBeInTheDocument()
		expect(screen.getByText('未配置 Turso 远端，本机只保留本地数据。')).toBeInTheDocument()
		expect(screen.getByText('未启用')).toBeInTheDocument()
		expect(screen.getAllByText('从未同步')).toHaveLength(2)
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
					remoteUrl: 'libsql://saved.turso.io',
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
					remoteUrl: 'libsql://saved.turso.io',
					replicaState: 'ready',
					replicaReason: null,
					lastRestoreAt: null,
				}),
			)

		mockSettingsSection = 'sync'
		await renderSettingsPage()
		openSyncConfigDialog()

		fireEvent.change(screen.getByLabelText('Turso URL'), {
			target: { value: 'libsql://new.turso.io' },
		})
		fireEvent.change(screen.getByLabelText('Turso Token'), {
			target: { value: 'new-token' },
		})

		await waitFor(() => {
			expect(getSyncStatusSpy).toHaveBeenCalledTimes(2)
		})

		expect(screen.getByLabelText('Turso URL')).toHaveValue('libsql://new.turso.io')
		expect(screen.getByLabelText('Turso Token')).toHaveValue('new-token')
		expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 60_000)

		setIntervalSpy.mockRestore()
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
				remoteUrl: 'libsql://example.turso.io',
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

	it('切换同步频率时调用 updateSyncPolicy', async () => {
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
				remoteUrl: 'libsql://example.turso.io',
				replicaState: 'ready',
				replicaReason: null,
				lastRestoreAt: null,
			}),
		)

		mockSettingsSection = 'sync'
		await renderSettingsPage()

		fireEvent.change(screen.getByLabelText('同步频率'), { target: { value: 'manual:15' } })

		await waitFor(() => {
			expect(updateSyncPolicySpy).toHaveBeenCalledWith({
				mode: 'manual',
				intervalMinutes: 15,
			})
		})
	})

	it('待同步状态时展示等待同步提示', async () => {
		vi.useFakeTimers()
		vi.setSystemTime(new Date('2026-06-26T00:10:00Z'))

		getSyncStatusSpy.mockResolvedValue(
			createSyncStatusPayload({
				enabled: true,
				status: 'offline_pending',
				lastPushAt: '2026-06-26T00:00:00Z',
				lastPullAt: '2026-06-26T00:00:01Z',
				lastError: null,
				lastErrorMode: null,
				dirtySince: '2026-06-26T00:00:00Z',
				pendingResync: false,
				hasRemoteConfig: true,
				remoteUrl: 'libsql://example.turso.io',
				replicaState: 'ready',
				replicaReason: null,
				lastRestoreAt: null,
			}),
		)

		mockSettingsSection = 'sync'
		await renderSettingsPage()

		expect(screen.getByText('等待同步')).toBeInTheDocument()
		expect(screen.getByText('本地已有新写入，已等待 10 分钟前。')).toBeInTheDocument()
		expect(screen.getAllByText('待同步').length).toBeGreaterThanOrEqual(1)
		expect(screen.getByText('10 分钟前')).toBeInTheDocument()
	})

	it('同步错误时展示 lastError', async () => {
		getSyncStatusSpy.mockResolvedValue(
			createSyncStatusPayload({
				enabled: true,
				status: 'error',
				lastPushAt: null,
				lastPullAt: null,
				lastError: 'remote unavailable',
				lastErrorMode: 'pull',
				dirtySince: null,
				pendingResync: false,
				hasRemoteConfig: true,
				remoteUrl: 'libsql://example.turso.io',
				replicaState: 'ready',
				replicaReason: null,
				lastRestoreAt: null,
			}),
		)

		mockSettingsSection = 'sync'
		await renderSettingsPage()
		openSyncDetails()

		expect(screen.getAllByText('同步需要处理').length).toBeGreaterThanOrEqual(1)
		expect(screen.getByText('确认失败')).toBeInTheDocument()
		expect(await screen.findByText('remote unavailable')).toBeInTheDocument()
	})

	it('已配置同步时会定时刷新状态', async () => {
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
					remoteUrl: 'libsql://example.turso.io',
					replicaState: 'ready',
					replicaReason: null,
					lastRestoreAt: null,
				}),
			)
			.mockResolvedValue(
				createSyncStatusPayload({
					enabled: true,
					status: 'error',
					lastPushAt: null,
					lastPullAt: null,
					lastError: 'sync timeout',
					lastErrorMode: 'pull',
					dirtySince: null,
					pendingResync: false,
					hasRemoteConfig: true,
					remoteUrl: 'libsql://example.turso.io',
					replicaState: 'ready',
					replicaReason: null,
					lastRestoreAt: null,
				}),
			)

		mockSettingsSection = 'sync'
		await renderSettingsPage()
		openSyncDetails()

		await waitFor(() => {
			expect(getSyncStatusSpy).toHaveBeenCalledTimes(2)
		})
		expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 60_000)
		expect(await screen.findByText('sync timeout')).toBeInTheDocument()
		setIntervalSpy.mockRestore()
	})

	it('收到同步状态事件时刷新状态', async () => {
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
					remoteUrl: 'libsql://example.turso.io',
					replicaState: 'ready',
					replicaReason: null,
					lastRestoreAt: null,
				}),
			)
			.mockResolvedValue(
				createSyncStatusPayload({
					enabled: true,
					status: 'offline_pending',
					lastPushAt: null,
					lastPullAt: null,
					lastError: null,
					lastErrorMode: null,
					dirtySince: '2026-06-26T00:00:00Z',
					pendingResync: false,
					hasRemoteConfig: true,
					remoteUrl: 'libsql://example.turso.io',
					replicaState: 'ready',
					replicaReason: null,
					lastRestoreAt: null,
				}),
			)

		mockSettingsSection = 'sync'
		await renderSettingsPage()

		await waitFor(() => {
			expect(mockedListen).toHaveBeenCalledWith(
				'stoneflow://sync/status-changed',
				expect.any(Function),
			)
		})

		syncStatusChangedHandler({
			event: 'stoneflow://sync/status-changed',
			id: 1,
			payload: {
				source: 'sync',
				reason: 'dirty',
			},
		})

		await waitFor(() => {
			expect(getSyncStatusSpy).toHaveBeenCalledTimes(2)
		})
		expect(await screen.findByText('等待同步')).toBeInTheDocument()
	})

	it('保存同步配置成功后会清空 token 输入框', async () => {
		mockSettingsSection = 'sync'
		await renderSettingsPage()
		openSyncConfigDialog()

		fireEvent.change(screen.getByLabelText('Turso URL'), {
			target: { value: 'libsql://example.turso.io' },
		})
		fireEvent.change(screen.getByLabelText('Turso Token'), {
			target: { value: 'secret-token' },
		})
		fireEvent.click(screen.getByRole('button', { name: '保存配置' }))

		await waitFor(() => {
			expect(configureSyncSpy).toHaveBeenCalledTimes(1)
		})
		openSyncConfigDialog()
		await waitFor(() => {
			expect(screen.getByLabelText('Turso Token')).toHaveValue('')
		})
	})

	it('缺少同步基线时展示提示并禁用立即同步', async () => {
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
				remoteUrl: 'libsql://example.turso.io',
				replicaState: 'baseline_required',
				replicaReason:
					'当前设备已有本地数据，但缺少 server_seq cursor。为避免把未知本地副本误覆盖，暂不自动同步；请先完成同步基线迁移。',
				lastRestoreAt: null,
			}),
		)

		mockSettingsSection = 'sync'
		await renderSettingsPage()

		expect(screen.getByText('当前设备需要建立同步基线')).toBeInTheDocument()
		expect(screen.getAllByText('缺少基线').length).toBeGreaterThanOrEqual(1)
		expect(screen.getByRole('button', { name: '立即同步' })).toBeDisabled()
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
				remoteUrl: 'libsql://example.turso.io',
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
		})
		expect(screen.getByText('同步诊断')).toBeInTheDocument()
		expect(screen.getByText('libsql://example.turso.io')).toBeInTheDocument()
		expect(screen.getAllByText('总计 88 条主数据')).toHaveLength(2)
		expect(screen.getAllByText('1 条').length).toBeGreaterThanOrEqual(1)
	})
})

async function renderSettingsPage() {
	return renderWithRouterContext(<SettingsPage />)
}

function openSyncConfigDialog() {
	fireEvent.click(screen.getByRole('button', { name: '配置 Turso 远端' }))
}

function openSyncDetails() {
	fireEvent.click(screen.getByRole('button', { name: '详情与诊断' }))
}

function createSyncStatusPayload(overrides: Record<string, unknown>) {
	return {
		policyMode: 'interval',
		policyIntervalMinutes: 15,
		nextSyncAt: null,
		...overrides,
	}
}

function getCheckboxByLabel(label: string) {
	const labelEl = screen.getByText(label).closest('label')
	if (!labelEl) {
		throw new Error(`未找到 ${label} 对应的设置项容器`)
	}

	const htmlFor = labelEl.getAttribute('for')
	if (htmlFor) {
		const byId = document.getElementById(htmlFor)
		if (byId instanceof HTMLInputElement) {
			return byId
		}
	}

	const nested = labelEl.querySelector('input[type="checkbox"]')
	if (nested instanceof HTMLInputElement) {
		return nested
	}

	throw new Error(`未找到 ${label} 对应的 checkbox`)
}

function createSidebarStoreState() {
	return {
		status: 'ready' as const,
		settings: createSidebarSettings(),
		errorMessage: null,
		load: loadSidebarSettingsSpy,
		resetMainItemsVisibility: vi.fn(),
		setItemVisibility: setItemVisibilitySpy,
		setSidebarWidth: vi.fn(),
		setDesktopPreference: vi.fn(),
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
			inbox: { visible: true, order: 100 },
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
		sortOrder: overrides.sortOrder ?? 100,
		archivedAt: overrides.archivedAt ?? null,
		deletedAt: overrides.deletedAt ?? null,
		createdAt: overrides.createdAt ?? '2026-05-03T10:00:00Z',
		updatedAt: overrides.updatedAt ?? '2026-05-03T10:00:00Z',
	}
}

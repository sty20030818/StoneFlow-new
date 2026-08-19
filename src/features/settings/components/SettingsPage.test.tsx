import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { listen } from '@tauri-apps/api/event'
import type * as TauriEvent from '@tauri-apps/api/event'

import type { ShellSidebarSettings } from '../api/shellDevicePreferences'
import { SettingsPage } from './SettingsPage'
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
const configureSyncSpy = vi.fn<(input: { databaseUrl: string }) => Promise<unknown>>()
const runSyncSpy = vi.fn<() => Promise<unknown>>()
const updateSyncPolicySpy =
	vi.fn<
		(input: {
			mode: 'interval' | 'on_write' | 'manual'
			intervalMinutes: 5 | 15 | 30
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
			intervalMinutes: 5 | 15 | 30
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

		fireEvent.click(screen.getByRole('button', { name: /默认空间/ }))
		fireEvent.click(await screen.findByRole('option', { name: '生活' }))

		await waitFor(() => {
			expect(setDefaultSpaceSpy).toHaveBeenCalledWith('space-2')
		})
	})

	it('保存同步配置时调用 configureSync 并刷新状态', async () => {
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

		openSyncConfigDialog()
		await waitFor(() => {
			expect(screen.getByLabelText('同步数据库连接')).toHaveValue('')
		})
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

	it('定时模式下修改间隔分钟并提交', async () => {
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
				policyIntervalMinutes: 15,
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
				policyMode: 'interval',
				policyIntervalMinutes: 7,
			}),
		)

		mockSettingsSection = 'sync'
		await renderSettingsPage()

		const input = screen.getByLabelText('同步间隔分钟')
		fireEvent.change(input, { target: { value: '7' } })
		fireEvent.blur(input)

		await waitFor(() => {
			expect(updateSyncPolicySpy).toHaveBeenCalledWith({
				mode: 'interval',
				intervalMinutes: 7,
			})
		})
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
	return renderWithRouterContext(<SettingsPage />)
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

function getCheckboxByLabel(label: string) {
	return screen.getByRole('switch', { name: label })
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

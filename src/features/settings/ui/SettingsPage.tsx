import { useEffect, useState } from 'react'

import { EntityScene } from '@/app/layouts/entity-scene'
import { useCurrentShellRoute } from '@/app/layouts/shell/model/ShellRouteContext'
import { openSection } from '@/app/navigation/intents'
import { resolveShellRouteScope } from '@/app/navigation/scope'
import { Link, useNavigate } from '@/app/routing/tanstackCompat'
import {
	selectSidebarSettings,
	selectSidebarSettingsError,
	selectSidebarSettingsStatus,
	useSidebarSettingsStore,
} from '@/app/layouts/shell/model/useSidebarSettingsStore'
import type { SidebarMainItemKey } from '@/features/settings/api/sidebarSettings'
import {
	configureSync,
	getSyncDiagnostics,
	getSyncStatus,
	restoreSync,
	runSync,
	type SyncDiagnosticsPayload,
	type SyncReplicaState,
	type SyncStatus,
	type SyncStatusPayload,
} from '@/features/sync/api/sync'
import { useSetDefaultSpaceMutation, useSpaces } from '@/features/space/query'
import { cn } from '@/shared/lib/utils'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbList,
	BreadcrumbPage,
} from '@/shared/ui/base/breadcrumb'
import { Button } from '@/shared/ui/base/button'
import { Input } from '@/shared/ui/base/input'
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/shared/ui/base/select'
import { normalizeTauriError } from '@/shared/lib/normalize-tauri-error'
import { emitEvent } from '@/shared/events'
import {
	formFieldHintClass,
	formFieldLabelVariants,
	formFieldStackClass,
} from '@/shared/ui/patterns/form-field'
import { breadcrumbLeadClass, breadcrumbLeadIconClass } from '@/shared/ui/patterns/breadcrumb'
import {
	settingsPanelDescriptionClass,
	settingsPanelHeaderWrapClass,
	settingsPanelSectionClass,
	settingsPanelTitleClass,
} from '@/shared/ui/patterns/settings-panel'
import { statusNoticeCompactTextClass } from '@/shared/ui/patterns/status-notice'
import { StatusNotice } from '@/shared/ui/StatusNotice'
import { Settings2Icon } from 'lucide-react'
import { toast } from 'sonner'

const MAIN_ITEM_OPTIONS: Array<{
	key: SidebarMainItemKey
	label: string
	description: string
}> = [
	{ key: 'inbox', label: '收件箱', description: '保留任务收集入口，方便快速回到待整理列表。' },
	{ key: 'allTasks', label: '所有任务', description: '统一查看当前范围内的全部任务。' },
	{ key: 'views', label: '视图', description: '保留视图入口，方便按条件聚焦任务。' },
	{
		key: 'projectOverview',
		label: '项目总览',
		description: '保留项目入口，方便集中查看和管理项目。',
	},
]

type SettingsSectionKey = 'mainItems' | 'footerItems' | 'projectSection' | 'defaultSpace'

type SectionStateMap = Record<SettingsSectionKey, boolean>
type SectionErrorMap = Partial<Record<SettingsSectionKey, string>>
const SYNC_STATUS_REFRESH_INTERVAL_MS = 3000

/**
 * 设置页只负责组织现有 settings 状态与 Space 数据，不复制配置状态。
 */
export function SettingsPage() {
	const shellRoute = useCurrentShellRoute()
	const scope = resolveShellRouteScope(shellRoute)
	const fallbackSpaceId = shellRoute.spaceId
	const navigate = useNavigate()
	const sidebarStatus = useSidebarSettingsStore(selectSidebarSettingsStatus)
	const sidebarSettings = useSidebarSettingsStore(selectSidebarSettings)
	const sidebarError = useSidebarSettingsStore(selectSidebarSettingsError)
	const loadSidebarSettings = useSidebarSettingsStore((state) => state.load)
	const setItemVisibility = useSidebarSettingsStore((state) => state.setItemVisibility)
	const setProjectSectionConfig = useSidebarSettingsStore((state) => state.setProjectSectionConfig)

	const { spaces, status: spaceStatus, error: spaceError, refetch: refetchSpaces } = useSpaces()
	const setDefaultSpace = useSetDefaultSpaceMutation()

	const [pendingSections, setPendingSections] = useState<SectionStateMap>({
		mainItems: false,
		footerItems: false,
		projectSection: false,
		defaultSpace: false,
	})
	const [sectionErrors, setSectionErrors] = useState<SectionErrorMap>({})
	const [syncStatus, setSyncStatus] = useState<SyncStatusPayload | null>(null)
	const [syncStatusMessage, setSyncStatusMessage] = useState<string | null>(null)
	const [syncDiagnostics, setSyncDiagnostics] = useState<SyncDiagnosticsPayload | null>(null)
	const [syncDiagnosticsMessage, setSyncDiagnosticsMessage] = useState<string | null>(null)
	const [syncLoading, setSyncLoading] = useState(true)
	const [syncSaving, setSyncSaving] = useState(false)
	const [syncRunning, setSyncRunning] = useState(false)
	const [syncRestoring, setSyncRestoring] = useState(false)
	const [syncDiagnosing, setSyncDiagnosing] = useState(false)
	const [syncUrl, setSyncUrl] = useState('')
	const [syncToken, setSyncToken] = useState('')

	useEffect(() => {
		void loadSidebarSettings().catch(() => undefined)
	}, [loadSidebarSettings])

	useEffect(() => {
		void refreshSyncStatus({ syncUrlDraft: true })
	}, [])

	useEffect(() => {
		if (!syncStatus?.hasRemoteConfig) {
			return
		}

		const timer = window.setInterval(() => {
			void refreshSyncStatus({ silent: true, syncUrlDraft: false })
		}, SYNC_STATUS_REFRESH_INTERVAL_MS)

		return () => {
			window.clearInterval(timer)
		}
	}, [syncStatus?.hasRemoteConfig])

	const visibleMainItemCount =
		sidebarSettings === null
			? 0
			: MAIN_ITEM_OPTIONS.filter((item) => sidebarSettings.mainItems[item.key].visible).length
	const visibleFooterItemCount =
		sidebarSettings === null
			? 0
			: (sidebarSettings.footerItems.archive.visible ? 1 : 0) +
				(sidebarSettings.footerItems.trash.visible ? 1 : 0)
	const defaultSpaceId = spaces.find((space) => space.isDefault)?.id ?? ''
	const isSettingsLoading =
		(sidebarStatus === 'idle' || sidebarStatus === 'loading') && sidebarSettings === null

	async function runSectionUpdate(section: SettingsSectionKey, task: () => Promise<void>) {
		setPendingSections((state) => ({
			...state,
			[section]: true,
		}))
		setSectionErrors((state) => ({
			...state,
			[section]: undefined,
		}))

		try {
			await task()
		} catch (error) {
			setSectionErrors((state) => ({
				...state,
				[section]: error instanceof Error ? error.message : '设置更新失败',
			}))
		} finally {
			setPendingSections((state) => ({
				...state,
				[section]: false,
			}))
		}
	}

	async function refreshSyncStatus(options?: { silent?: boolean; syncUrlDraft?: boolean }) {
		const silent = options?.silent ?? false
		const syncUrlDraft = options?.syncUrlDraft ?? true
		if (!silent) {
			setSyncLoading(true)
			setSyncStatusMessage(null)
		}
		try {
			const payload = await getSyncStatus()
			setSyncStatus(payload)
			if (!payload.hasRemoteConfig) {
				setSyncDiagnostics(null)
				setSyncDiagnosticsMessage(null)
			}
			if (syncUrlDraft) {
				setSyncUrl(payload.remoteUrl ?? '')
			}
		} catch (error) {
			setSyncStatus(null)
			setSyncStatusMessage(normalizeTauriError(error, '同步状态读取失败'))
		} finally {
			if (!silent) {
				setSyncLoading(false)
			}
		}
	}

	async function refreshSyncDiagnostics(options?: { silent?: boolean }) {
		const silent = options?.silent ?? false
		if (!silent) {
			setSyncDiagnosing(true)
		}
		setSyncDiagnosticsMessage(null)

		try {
			const payload = await getSyncDiagnostics()
			setSyncDiagnostics(payload)
		} catch (error) {
			setSyncDiagnostics(null)
			setSyncDiagnosticsMessage(normalizeTauriError(error, '同步诊断读取失败'))
		} finally {
			if (!silent) {
				setSyncDiagnosing(false)
			}
		}
	}

	async function handleSaveSyncConfig() {
		setSyncSaving(true)
		setSyncStatusMessage(null)
		setSyncDiagnostics(null)
		setSyncDiagnosticsMessage(null)
		try {
			await configureSync({
				url: syncUrl.trim(),
				token: syncToken.trim(),
			})
			setSyncToken('')
			await refreshSyncStatus({ syncUrlDraft: true })
			await refreshSyncDiagnostics({ silent: true })
		} catch (error) {
			setSyncStatusMessage(normalizeTauriError(error, '同步配置保存失败'))
		} finally {
			setSyncSaving(false)
		}
	}

	async function handleRunSync() {
		setSyncRunning(true)
		setSyncStatusMessage(null)
		try {
			await runSync()
			await refreshSyncStatus({ syncUrlDraft: false })
			await refreshSyncDiagnostics({ silent: true })
		} catch (error) {
			setSyncStatusMessage(normalizeTauriError(error, '手动同步失败'))
			await refreshSyncStatus({ syncUrlDraft: false })
		} finally {
			setSyncRunning(false)
		}
	}

	async function handleRestoreSync() {
		setSyncRestoring(true)
		setSyncStatusMessage(null)
		try {
			const payload = await restoreSync()
			setSyncStatus(payload.status)
			await refreshSyncDiagnostics({ silent: true })
			toast.success(buildRestoreSuccessToastMessage(payload.summary))
			emitEvent({ type: 'workspace:restored', payload: { source: 'sync_restore' } })
			void navigate(openSection(scope, 'tasks', fallbackSpaceId), { replace: true })
		} catch (error) {
			setSyncStatusMessage(normalizeTauriError(error, '从云端恢复本地失败'))
			await refreshSyncStatus({ syncUrlDraft: false })
		} finally {
			setSyncRestoring(false)
		}
	}

	const effectiveSyncError =
		syncStatus?.status === 'error' ? (syncStatus.lastError ?? syncStatusMessage) : syncStatusMessage
	const effectiveSyncErrorTitle = getSyncErrorTitle(
		syncStatus?.lastErrorMode ?? null,
		syncRunning,
		syncRestoring,
	)
	const syncBusy = syncSaving || syncRunning || syncRestoring || syncLoading
	const syncActionBusy = syncBusy || syncDiagnosing
	const syncConfigIncomplete = syncUrl.trim().length === 0 || syncToken.trim().length === 0
	const syncRequiresRestore = syncStatus?.replicaState === 'restore_required'
	const displayedSyncStatus: SyncStatus = syncRunning
		? 'syncing'
		: syncRestoring
			? 'syncing'
		: syncSaving
			? 'syncing'
			: (syncStatus?.status ?? (syncLoading ? 'syncing' : 'disabled'))
	const syncStatusCopy = getSyncStatusCopy({
		dirtySince: syncStatus?.dirtySince ?? null,
		pendingResync: syncStatus?.pendingResync ?? false,
		hasRemoteConfig: syncStatus?.hasRemoteConfig ?? false,
		replicaState: syncStatus?.replicaState ?? 'uninitialized',
		replicaReason: syncStatus?.replicaReason ?? null,
		status: displayedSyncStatus,
		syncLoading,
		syncRunning,
		syncSaving,
		syncRestoring,
	})

	function handleMainItemVisibilityChange(key: SidebarMainItemKey, visible: boolean) {
		if (!sidebarSettings) {
			return
		}

		if (!visible && sidebarSettings.mainItems[key].visible && visibleMainItemCount === 1) {
			setSectionErrors((state) => ({
				...state,
				mainItems: '至少保留一个主入口，避免 Sidebar 没有可见导航项。',
			}))
			return
		}

		void runSectionUpdate('mainItems', async () => {
			await setItemVisibility({ kind: 'main', key }, visible)
		})
	}

	function handleFooterItemVisibilityChange(key: 'archive' | 'trash', visible: boolean) {
		if (!sidebarSettings) {
			return
		}

		if (!visible && sidebarSettings.footerItems[key].visible && visibleFooterItemCount === 1) {
			setSectionErrors((state) => ({
				...state,
				footerItems: '至少保留一个辅助入口，避免底部区域完全消失。',
			}))
			return
		}

		void runSectionUpdate('footerItems', async () => {
			await setItemVisibility({ kind: 'footer', key }, visible)
		})
	}

	function handleProjectSectionChange(
		key: 'visible' | 'showCompleted' | 'showCounts',
		value: boolean,
	) {
		if (!sidebarSettings) {
			return
		}

		void runSectionUpdate('projectSection', async () => {
			await setProjectSectionConfig({
				...sidebarSettings.projectSection,
				[key]: value,
			})
		})
	}

	function handleDefaultSpaceChange(nextSpaceId: string) {
		if (!nextSpaceId || nextSpaceId === defaultSpaceId) {
			return
		}

		void runSectionUpdate('defaultSpace', async () => {
			await setDefaultSpace.mutateAsync(nextSpaceId)
		})
	}

	return (
		<EntityScene
			breadcrumb={
				<Breadcrumb>
					<BreadcrumbList className='text-sm font-semibold leading-5'>
						<BreadcrumbItem>
							<BreadcrumbPage className={breadcrumbLeadClass}>
								<Settings2Icon aria-hidden className={breadcrumbLeadIconClass} />
								设置
							</BreadcrumbPage>
						</BreadcrumbItem>
					</BreadcrumbList>
				</Breadcrumb>
			}
			beforeBoard={
				<div className='flex flex-col gap-4'>
					{sidebarSettings ? (
						<>
							<SettingsSection
								description='控制侧边栏主导航里哪些入口显示。至少保留一个主入口，避免侧边栏失去基本导航能力。'
								title='Sidebar 主入口'
							>
								<div className='grid gap-3 md:grid-cols-2'>
									{MAIN_ITEM_OPTIONS.map((item) => {
										const checked = sidebarSettings.mainItems[item.key].visible
										const disabled =
											pendingSections.mainItems || (checked && visibleMainItemCount === 1)

										return (
											<SettingCheckboxRow
												checked={checked}
												description={item.description}
												disabled={disabled}
												key={item.key}
												label={item.label}
												onChange={(nextChecked) =>
													handleMainItemVisibilityChange(item.key, nextChecked)
												}
											/>
										)
									})}
								</div>
								{sectionErrors.mainItems ? (
									<StatusNotice
										className={`mt-4 ${statusNoticeCompactTextClass}`}
										role='alert'
										size='sm'
										variant='danger'
									>
										{sectionErrors.mainItems}
									</StatusNotice>
								) : null}
							</SettingsSection>

							<SettingsSection
								description='控制底部辅助入口是否显示，方便决定归档和回收站要不要常驻侧边栏。'
								title='辅助入口'
							>
								<div className='grid gap-3 md:grid-cols-2'>
									<SettingCheckboxRow
										checked={sidebarSettings.footerItems.archive.visible}
										description='显示归档入口，方便集中查看暂时收起的内容。'
										disabled={
											pendingSections.footerItems ||
											(sidebarSettings.footerItems.archive.visible && visibleFooterItemCount === 1)
										}
										label='归档'
										onChange={(nextChecked) =>
											handleFooterItemVisibilityChange('archive', nextChecked)
										}
									/>
									<SettingCheckboxRow
										checked={sidebarSettings.footerItems.trash.visible}
										description='显示回收站入口，方便恢复或彻底删除内容。'
										disabled={
											pendingSections.footerItems ||
											(sidebarSettings.footerItems.trash.visible && visibleFooterItemCount === 1)
										}
										label='回收站'
										onChange={(nextChecked) =>
											handleFooterItemVisibilityChange('trash', nextChecked)
										}
									/>
								</div>
								{sectionErrors.footerItems ? (
									<StatusNotice
										className={`mt-4 ${statusNoticeCompactTextClass}`}
										role='alert'
										size='sm'
										variant='danger'
									>
										{sectionErrors.footerItems}
									</StatusNotice>
								) : null}
							</SettingsSection>

							<SettingsSection
								description='控制项目分区在侧边栏里的呈现方式，只保留真正会影响日常导航的几项。'
								title='项目分区'
							>
								<div className='grid gap-3 md:grid-cols-3'>
									<SettingCheckboxRow
										checked={sidebarSettings.projectSection.visible}
										description='决定侧边栏中是否展示项目分区。'
										disabled={pendingSections.projectSection}
										label='显示项目分区'
										onChange={(nextChecked) => handleProjectSectionChange('visible', nextChecked)}
									/>
									<SettingCheckboxRow
										checked={sidebarSettings.projectSection.showCompleted}
										description='控制项目分区里是否包含已完成项目。'
										disabled={pendingSections.projectSection}
										label='显示已完成项目'
										onChange={(nextChecked) =>
											handleProjectSectionChange('showCompleted', nextChecked)
										}
									/>
									<SettingCheckboxRow
										checked={sidebarSettings.projectSection.showCounts}
										description='控制项目列表是否显示任务数量徽标。'
										disabled={pendingSections.projectSection}
										label='显示数量'
										onChange={(nextChecked) =>
											handleProjectSectionChange('showCounts', nextChecked)
										}
									/>
								</div>
								{sectionErrors.projectSection ? (
									<StatusNotice
										className={`mt-4 ${statusNoticeCompactTextClass}`}
										role='alert'
										size='sm'
										variant='danger'
									>
										{sectionErrors.projectSection}
									</StatusNotice>
								) : null}
							</SettingsSection>
						</>
					) : null}

					<SettingsSection
						description='默认空间会影响全局新建和兜底恢复时的优先落点，建议把最常用的空间放在这里。'
						title='默认空间'
					>
						{spaceStatus === 'error' ? (
							<StatusNotice
								actions={
									<Button
										onClick={() => void refetchSpaces()}
										size='sm'
										type='button'
										variant='secondary'
									>
										重试
									</Button>
								}
								description={spaceError ?? 'Space 列表加载失败。'}
								layout='split'
								title='无法读取 Space'
								variant='danger'
							/>
						) : spaces.length === 0 && spaceStatus === 'ready' ? (
							<StatusNotice
								description='当前还没有可用空间，所以暂时不能设置默认项。等空间准备好之后，再回来这里调整就可以了。'
								title='当前没有可用空间'
							/>
						) : (
							<div className='flex flex-col gap-3 md:max-w-sm'>
								<label className={formFieldStackClass}>
									<span className={formFieldLabelVariants()}>选择默认空间</span>
									<Select
										disabled={
											pendingSections.defaultSpace ||
											spaceStatus === 'loading' ||
											spaces.length === 0
										}
										onValueChange={handleDefaultSpaceChange}
										value={defaultSpaceId}
									>
										<SelectTrigger aria-label='默认空间' className='h-10 w-full'>
											<SelectValue placeholder='选择默认空间' />
										</SelectTrigger>
										<SelectContent position='popper'>
											<SelectGroup>
												{spaces.map((space) => (
													<SelectItem key={space.id} value={space.id}>
														{space.name}
													</SelectItem>
												))}
											</SelectGroup>
										</SelectContent>
									</Select>
								</label>
								<p className={formFieldHintClass}>
									当前默认项：
									{spaces.find((space) => space.id === defaultSpaceId)?.name ?? '未设置'}
								</p>
							</div>
						)}
						{sectionErrors.defaultSpace ? (
							<StatusNotice
								className={`mt-4 ${statusNoticeCompactTextClass}`}
								role='alert'
								size='sm'
								variant='danger'
							>
								{sectionErrors.defaultSpace}
							</StatusNotice>
						) : null}
					</SettingsSection>

					<SettingsSection
						description='所有业务仍然只读写本地数据库；这里仅配置 Turso 远端，并在需要时手动或自动触发同步。'
						title='云同步'
					>
						<div className='grid gap-3 md:grid-cols-2'>
							<SettingInfoRow
								description={syncStatusCopy.statusDescription}
								label='当前状态'
								value={<SyncStatusBadge status={displayedSyncStatus} />}
							/>
							<SettingInfoRow
								description='是否已经保存可用的 Turso url 和 token。'
								label='Turso 配置'
								value={
									<span
										className={cn(
											'text-sm font-medium',
											syncStatus?.hasRemoteConfig ? 'text-emerald-700' : 'text-slate-500',
										)}
									>
										{syncStatus?.hasRemoteConfig ? '已配置' : '未配置'}
									</span>
								}
							/>
							<SettingInfoRow
								description='最近一次本地变更成功提交到远端的时间。'
								label='上次提交'
								value={<SyncTimestampValue timestamp={syncStatus?.lastPushAt ?? null} />}
							/>
							<SettingInfoRow
								description='最近一次从远端确认同步结果的时间。'
								label='上次确认'
								value={<SyncTimestampValue timestamp={syncStatus?.lastPullAt ?? null} />}
							/>
							<SettingInfoRow
								description='用于判断当前设备能否继续执行普通同步。若副本为空，会先阻止普通同步，避免把空副本误当成删除源。'
								label='本地副本'
								value={<SyncReplicaBadge state={syncStatus?.replicaState ?? 'uninitialized'} />}
							/>
							<SettingInfoRow
								description='最近一次“从云端恢复本地”完成时间。'
								label='上次恢复'
								value={
									<SyncTimestampValue
										emptyLabel='从未恢复'
										timestamp={syncStatus?.lastRestoreAt ?? null}
									/>
								}
							/>
						</div>

						<div className='mt-4 grid gap-3 md:grid-cols-2'>
							<label className={formFieldStackClass}>
								<span className={formFieldLabelVariants()}>Turso URL</span>
								<Input
									autoComplete='off'
									disabled={syncBusy}
									onChange={(event) => setSyncUrl(event.currentTarget.value)}
									placeholder='libsql://your-db.turso.io'
									type='text'
									value={syncUrl}
								/>
							</label>
							<label className={formFieldStackClass}>
								<span className={formFieldLabelVariants()}>Turso Token</span>
								<Input
									autoComplete='off'
									disabled={syncBusy}
									onChange={(event) => setSyncToken(event.currentTarget.value)}
									placeholder='输入 Turso auth token'
									type='password'
									value={syncToken}
								/>
							</label>
						</div>

						<div className='mt-4 flex flex-wrap gap-3'>
							<Button
								disabled={syncActionBusy || syncConfigIncomplete}
								onClick={() => void handleSaveSyncConfig()}
								type='button'
							>
								{syncSaving ? '保存中...' : '保存配置'}
							</Button>
							<Button
								disabled={syncActionBusy || !syncStatus?.hasRemoteConfig}
								onClick={() => void handleRestoreSync()}
								type='button'
								variant='secondary'
							>
								{syncRestoring ? '恢复中...' : '从云端恢复本地'}
							</Button>
							<Button
								disabled={
									syncActionBusy || !syncStatus?.hasRemoteConfig || syncRequiresRestore
								}
								onClick={() => void handleRunSync()}
								type='button'
								variant='secondary'
							>
								{syncRunning ? '同步中...' : '立即同步'}
							</Button>
							<Button
								disabled={syncBusy || syncDiagnosing || !syncStatus?.hasRemoteConfig}
								onClick={() => void refreshSyncDiagnostics()}
								type='button'
								variant='secondary'
							>
								{syncDiagnosing ? '诊断中...' : '刷新诊断'}
							</Button>
						</div>

						<p className={`mt-3 ${formFieldHintClass}`}>
							配置会直接保存在本地数据库的 settings 表；页面刷新后只会自动回填 URL。出于安全考虑，已保存的 token 不会回显；需要更换时直接输入新 token 覆盖保存。未配置前不会自动同步；配置完成后，本地写入会先标记
							待同步，再由同步引擎异步执行完整同步。若当前设备是空副本，先用“从云端恢复本地”把远端基线完整拉回本机，再继续普通同步。
						</p>

						<StatusNotice
							className='mt-4'
							description={syncStatusCopy.summary}
							title={syncStatusCopy.title}
							variant={syncStatusCopy.variant}
						/>

						{syncRequiresRestore && syncStatus?.replicaReason ? (
							<StatusNotice
								className='mt-4'
								description={syncStatus.replicaReason}
								title='当前设备需要先恢复本地副本'
								variant='warning'
							/>
						) : null}

						{effectiveSyncError ? (
							<StatusNotice
								className={`mt-4 ${statusNoticeCompactTextClass}`}
								description={effectiveSyncError}
								role='alert'
								size='sm'
								title={effectiveSyncErrorTitle}
								variant='danger'
							/>
						) : null}

						<div className='mt-6 flex flex-col gap-3'>
							<div className='flex items-center justify-between gap-3'>
								<div className='min-w-0'>
									<h3 className='text-sm font-semibold text-foreground'>同步诊断</h3>
									<p className={formFieldHintClass}>
										只读查看当前设备与 Turso 远端的 cursor 和工作集摘要，用于排查“为什么没同步到”这类问题。
									</p>
								</div>
							</div>

							{syncDiagnostics ? (
								<div className='grid gap-3 md:grid-cols-2 xl:grid-cols-3'>
									<SettingInfoRow
										description='当前保存并正在使用的 Turso 远端 host。'
										label='远端 Host'
										value={
											<span className='break-all font-medium text-foreground'>
												{syncDiagnostics.remoteHost ?? '未读取'}
											</span>
										}
									/>
									<SettingInfoRow
										description='当前设备最后一次成功吸收远端 operation 后落在本地的 remote cursor。'
										label='本地 cursor'
										value={
											<SyncCursorValue
												value={syncDiagnostics.local.lastPulledRemoteCursor}
											/>
										}
									/>
									<SettingInfoRow
										description='Turso 远端 sync_operations 当前看到的最新 cursor。'
										label='远端 cursor'
										value={
											<SyncCursorValue value={syncDiagnostics.remote.latestRemoteCursor} />
										}
									/>
									<SettingInfoRow
										description='当前设备本地还没提交成功的同步记录数量。'
										label='待同步记录'
										value={
											<span className='font-medium text-foreground'>
												{syncDiagnostics.local.pendingOutboxCount} 条
											</span>
										}
									/>
									<SettingInfoRow
										description='当前设备本地工作集的计数摘要。'
										label='本地工作集'
										value={
											<SyncCountsSummaryValue counts={syncDiagnostics.local.counts} />
										}
									/>
									<SettingInfoRow
										description='Turso 远端当前镜像表的计数摘要。'
										label='远端工作集'
										value={
											<SyncCountsSummaryValue counts={syncDiagnostics.remote.counts} />
										}
									/>
								</div>
							) : (
								<StatusNotice
									description={
										syncStatus?.hasRemoteConfig
											? '当前还没有读取诊断摘要。点击“刷新诊断”后，会显示本地 cursor、远端 cursor 和工作集计数。'
											: '先保存可用的 Turso URL 和 token，才能读取远端诊断信息。'
									}
									title='尚未读取同步诊断'
								/>
							)}

							{syncDiagnosticsMessage ? (
								<StatusNotice
									className={statusNoticeCompactTextClass}
									description={syncDiagnosticsMessage}
									role='alert'
									size='sm'
									title='同步诊断读取失败'
									variant='danger'
								/>
							) : null}
						</div>
					</SettingsSection>
				</div>
			}
			bodyClassName='gap-4 p-2'
			headerActions={
				<Button asChild size='sm' variant='ghost'>
					<Link to={openSection(scope, 'tasks', fallbackSpaceId)}>返回所有任务</Link>
				</Button>
			}
			notices={
				<>
					<StatusNotice
						description='这里先只开放会影响日常导航和默认落点的设置。所有变更都会立即保存，不需要额外确认。'
						title='工作区设置'
					/>

					{isSettingsLoading ? (
						<StatusNotice
							description='正在读取 Sidebar 设置与可见 Space。'
							title='加载中'
							variant='warning'
						/>
					) : null}

					{sidebarStatus === 'error' && sidebarSettings === null ? (
						<StatusNotice
							actions={
								<Button
									onClick={() => {
										void loadSidebarSettings().catch(() => undefined)
									}}
									size='sm'
									type='button'
									variant='secondary'
								>
									重试
								</Button>
							}
							description={sidebarError ?? 'Sidebar 设置加载失败。'}
							layout='split'
							title='无法读取设置'
							variant='danger'
						/>
					) : null}
				</>
			}
			sceneVariant='settings'
		/>
	)
}

function SettingsSection({
	title,
	description,
	children,
}: {
	title: string
	description: string
	children: React.ReactNode
}) {
	return (
		<section className={settingsPanelSectionClass}>
			<div className={settingsPanelHeaderWrapClass}>
				<h2 className={settingsPanelTitleClass}>{title}</h2>
				<p className={settingsPanelDescriptionClass}>{description}</p>
			</div>
			{children}
		</section>
	)
}

function SettingCheckboxRow({
	label,
	description,
	checked,
	disabled,
	onChange,
}: {
	label: string
	description: string
	checked: boolean
	disabled?: boolean
	onChange: (checked: boolean) => void
}) {
	const inputId = `setting-checkbox-${label.replace(/\s+/g, '-').toLowerCase()}`

	return (
		<label
			className={cn(
				'flex items-start gap-3 rounded-xl border border-sf-border-subtle bg-muted/25 p-3 transition-colors',
				disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:bg-muted/45',
			)}
			htmlFor={inputId}
		>
			<input
				checked={checked}
				className='mt-0.5 size-4 rounded border-sf-border-strong'
				disabled={disabled}
				id={inputId}
				onChange={(event) => onChange(event.currentTarget.checked)}
				type='checkbox'
			/>
			<div className='min-w-0'>
				<p className='text-sm font-medium text-foreground'>{label}</p>
				<p className={formFieldHintClass}>{description}</p>
			</div>
		</label>
	)
}

function SettingInfoRow({
	label,
	description,
	value,
}: {
	label: string
	description: string
	value: React.ReactNode
}) {
	return (
		<div className='rounded-xl border border-sf-border-subtle bg-muted/25 p-3'>
			<p className='text-sm font-medium text-foreground'>{label}</p>
			<div className='mt-1 text-sm text-foreground'>{value}</div>
			<p className={`mt-1 ${formFieldHintClass}`}>{description}</p>
		</div>
	)
}

function SyncTimestampValue({
	timestamp,
	emptyLabel = '从未同步',
}: {
	timestamp: string | null
	emptyLabel?: string
}) {
	if (!timestamp) {
		return <span className='text-slate-500'>{emptyLabel}</span>
	}

	return (
		<div className='flex flex-col gap-1'>
			<span className='font-medium text-foreground'>{formatSyncRelativeTime(timestamp)}</span>
			<span className='text-xs text-slate-500'>{formatSyncExactTime(timestamp)}</span>
		</div>
	)
}

function SyncCursorValue({ value }: { value: number | null }) {
	if (value === null) {
		return <span className='text-slate-500'>未记录</span>
	}

	return <span className='font-medium text-foreground'>{value}</span>
}

function SyncCountsSummaryValue({
	counts,
}: {
	counts: {
		spaces: number
		projects: number
		tasks: number
		taskLinks: number
		views: number
		settings: number
		totalItems: number
	}
}) {
	return (
		<div className='flex flex-col gap-1'>
			<span className='font-medium text-foreground'>
				{formatSyncCountsSummary(counts)}
			</span>
			<span className='text-xs text-slate-500'>总计 {counts.totalItems} 条主数据</span>
		</div>
	)
}

function SyncStatusBadge({ status }: { status: SyncStatus }) {
	const tone =
		status === 'synced'
			? 'border-emerald-200 bg-emerald-50 text-emerald-700'
			: status === 'offline_pending'
				? 'border-amber-200 bg-amber-50 text-amber-700'
				: status === 'syncing'
					? 'border-sky-200 bg-sky-50 text-sky-700'
					: status === 'error' || status === 'needs_attention'
						? 'border-red-200 bg-red-50 text-red-700'
						: 'border-slate-200 bg-slate-50 text-slate-600'
	const dotTone =
		status === 'synced'
			? 'bg-emerald-500'
			: status === 'offline_pending'
				? 'bg-amber-500'
				: status === 'syncing'
					? 'bg-sky-500'
					: status === 'error' || status === 'needs_attention'
						? 'bg-red-500'
						: 'bg-slate-400'

	return (
		<span
			className={cn(
				'inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-sm font-medium',
				tone,
			)}
		>
			<span className={cn('size-2.5 rounded-full', dotTone)} />
			{formatSyncStatus(status)}
		</span>
	)
}

function SyncReplicaBadge({ state }: { state: SyncReplicaState }) {
	const tone =
		state === 'ready'
			? 'border-emerald-200 bg-emerald-50 text-emerald-700'
			: state === 'restore_required'
				? 'border-amber-200 bg-amber-50 text-amber-700'
				: state === 'diverged'
					? 'border-red-200 bg-red-50 text-red-700'
					: 'border-slate-200 bg-slate-50 text-slate-600'

	return (
		<span
			className={cn(
				'inline-flex items-center rounded-full border px-2.5 py-1 text-sm font-medium',
				tone,
			)}
		>
			{formatReplicaState(state)}
		</span>
	)
}

function formatSyncRelativeTime(value: string) {
	const date = new Date(value)
	if (Number.isNaN(date.getTime())) {
		return value
	}

	const diffMs = Date.now() - date.getTime()
	const minute = 60 * 1000
	const hour = 60 * minute
	const day = 24 * hour

	if (diffMs < minute) {
		return '刚刚'
	}

	if (diffMs < hour) {
		const minutes = Math.max(1, Math.floor(diffMs / minute))
		return `${minutes} 分钟前`
	}

	if (diffMs < day) {
		const hours = Math.max(1, Math.floor(diffMs / hour))
		return `${hours} 小时前`
	}

	const days = Math.max(1, Math.floor(diffMs / day))
	return `${days} 天前`
}

function formatSyncExactTime(value: string) {
	const date = new Date(value)
	if (Number.isNaN(date.getTime())) {
		return value
	}

	const now = new Date()
	const includeYear = date.getFullYear() !== now.getFullYear()
	return date.toLocaleString('zh-CN', {
		year: includeYear ? 'numeric' : undefined,
		month: 'numeric',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	})
}

function formatSyncCountsSummary(counts: {
	spaces: number
	projects: number
	tasks: number
	taskLinks: number
	views: number
	settings: number
}) {
	return [
		`${counts.tasks} 任务`,
		`${counts.projects} 项目`,
		`${counts.spaces} 空间`,
		`${counts.views} 视图`,
		`${counts.taskLinks} 链接`,
		`${counts.settings} 设置`,
	].join(' / ')
}

function getSyncStatusCopy({
	status,
	dirtySince,
	pendingResync,
	hasRemoteConfig,
	replicaState,
	replicaReason,
	syncLoading,
	syncSaving,
	syncRunning,
	syncRestoring,
}: {
	status: SyncStatus
	dirtySince: string | null
	pendingResync: boolean
	hasRemoteConfig: boolean
	replicaState: SyncReplicaState
	replicaReason: string | null
	syncLoading: boolean
	syncSaving: boolean
	syncRunning: boolean
	syncRestoring: boolean
}) {
	if (syncLoading) {
		return {
			title: '正在读取同步状态',
			summary: '正在读取本机保存的云同步状态与远端配置，完成后会显示最近一次同步结果。',
			statusDescription: '正在读取当前同步状态。',
			variant: 'warning' as const,
		}
	}

	if (syncSaving) {
		return {
			title: '正在保存同步配置',
			summary: '正在保存 Turso URL 和 token。保存成功后会立即刷新状态，并清空当前 token 输入框。',
			statusDescription: '正在保存新的 Turso 远端配置。',
			variant: 'warning' as const,
		}
	}

	if (syncRunning) {
		return {
			title: '正在执行手动同步',
			summary: pendingResync
				? '当前正在执行完整同步；运行期间又有新写入，结束后还会自动补跑一轮。'
				: '当前正在执行完整同步。同步期间本地业务仍然继续只读写本地数据库。',
			statusDescription: '正在执行完整同步。',
			variant: 'warning' as const,
		}
	}

	if (syncRestoring) {
		return {
			title: '正在从云端恢复本地',
			summary:
				'同步引擎正在用 Turso 远端镜像重建当前设备的本地工作副本。恢复期间会先清空当前本地副本，再按远端当前基线完整写回。',
			statusDescription: '正在从远端镜像恢复当前设备的本地副本。',
			variant: 'warning' as const,
		}
	}

	if (!hasRemoteConfig || status === 'disabled') {
		return {
			title: '尚未启用云同步',
			summary: '当前还没有保存可用的 Turso 远端。完成配置前，所有数据只会保留在本地数据库。',
			statusDescription: '未配置 Turso 远端，本机只保留本地数据。',
			variant: 'neutral' as const,
		}
	}

	if (replicaState === 'restore_required') {
		return {
			title: '当前设备需要先恢复本地副本',
			summary:
				replicaReason ??
				'当前本地副本看起来是空的。为避免把空副本误当成删除源，已阻止普通同步，后续需要走“从远端恢复本地”链路。',
			statusDescription: '当前设备的本地副本为空，普通同步已被阻止。',
			variant: 'warning' as const,
		}
	}

	switch (status) {
		case 'synced':
			return {
				title: '同步状态正常',
				summary:
					'当前没有待处理同步动作。本地一旦产生新的写入，会先变成待同步，再由后台异步执行完整同步。',
				statusDescription: '当前没有待处理的同步轮次。',
				variant: 'success' as const,
			}
		case 'offline_pending':
			return {
				title: '等待同步',
				summary: dirtySince
					? `本地已经产生新变更，最早一笔待同步写入开始于 ${formatSyncRelativeTime(dirtySince)}。你可以直接点“立即同步”，也可以等后台自动补跑完整对齐轮次。`
					: '本地已经产生新变更，正在等待下一轮完整对齐同步。你可以直接点“立即同步”，也可以等后台自动补跑。',
				statusDescription: dirtySince
					? `本地已有新写入，已等待 ${formatSyncRelativeTime(dirtySince)}。`
					: '本地已有新写入，等待下一轮完整对齐同步。',
				variant: 'warning' as const,
			}
		case 'syncing':
			return {
				title: '正在同步',
				summary: '同步引擎正在对齐本地和远端数据。这个过程失败时不会影响当前本地写入结果。',
				statusDescription: '正在同步本地和远端数据。',
				variant: 'warning' as const,
			}
		case 'error':
			return {
				title: '同步需要处理',
				summary: '上一轮同步失败了。先检查 URL、token、网络和 Turso 远端状态，修正后再触发下一轮同步。',
				statusDescription: '上一轮同步失败，等待人工处理或下一次重试。',
				variant: 'danger' as const,
			}
		case 'needs_attention':
			return {
				title: '同步需要处理',
				summary: '同步遇到无法自动处理的问题，需要检查配置、数据状态或冲突信息。',
				statusDescription: '同步需要人工处理。',
				variant: 'danger' as const,
			}
		default:
			return {
				title: '同步概览',
				summary: '当前同步状态已更新。',
				statusDescription: '当前同步状态已更新。',
				variant: 'neutral' as const,
			}
	}
}

function getSyncErrorTitle(
	mode: 'push' | 'pull' | 'sync' | 'restore' | null,
	syncRunning: boolean,
	syncRestoring: boolean,
) {
	if (syncRunning) {
		return '手动同步失败'
	}
	if (syncRestoring) {
		return '恢复失败'
	}

	switch (mode) {
		case 'push':
			return '提交失败'
		case 'pull':
			return '确认失败'
		case 'sync':
			return '手动同步失败'
		case 'restore':
			return '恢复失败'
		default:
			return '同步失败'
	}
}

function formatSyncStatus(status: SyncStatus) {
	switch (status) {
		case 'disabled':
			return '未启用'
		case 'synced':
			return '已同步'
		case 'offline_pending':
			return '待同步'
		case 'syncing':
			return '同步中'
		case 'error':
			return '同步失败'
		case 'needs_attention':
			return '需要处理'
		default:
			return status
	}
}

function formatReplicaState(state: SyncReplicaState) {
	switch (state) {
		case 'ready':
			return '可正常同步'
		case 'restore_required':
			return '需要先恢复'
		case 'diverged':
			return '状态异常'
		case 'uninitialized':
			return '尚未初始化'
		default:
			return state
	}
}

function buildRestoreSuccessToastMessage(summary: {
	spaces: number
	projects: number
	tasks: number
	taskLinks: number
	views: number
	settings: number
	totalItems: number
}) {
	const parts = [
		summary.tasks > 0 ? `${summary.tasks} 个任务` : null,
		summary.projects > 0 ? `${summary.projects} 个项目` : null,
		summary.spaces > 0 ? `${summary.spaces} 个空间` : null,
		summary.views > 0 ? `${summary.views} 个视图` : null,
		summary.taskLinks > 0 ? `${summary.taskLinks} 个链接` : null,
	]
		.filter(Boolean)
		.join('、')

	if (parts.length > 0) {
		return `云端恢复完成：已恢复 ${parts}`
	}

	return `云端恢复完成：已恢复 ${summary.totalItems} 条本地主数据`
}

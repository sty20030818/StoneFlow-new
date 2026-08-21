import {
	Alert,
	Button,
	Disclosure,
	Input,
	Label,
	Radio,
	RadioGroup,
	Surface,
	TextField,
} from '@heroui/react'
import { useEffect, useState } from 'react'
import { listen } from '@tauri-apps/api/event'
import { SettingsIcon } from 'lucide-react'

import {
	configureSync,
	formatReplicaState,
	getSyncDiagnostics,
	getSyncStatus,
	runSync,
	SyncConfigDialog,
	updateSyncPolicy,
	type SyncDiagnosticsPayload,
	type SyncPolicyMode,
	type SyncReplicaState,
	type SyncStatus,
	type SyncStatusPayload,
} from '@/features/sync'
import { normalizeTauriError } from '@/shared/lib/normalize-tauri-error'
import { SettingInfoRow, SettingsSection } from '../settingsShared'
import { ActionTooltip, DisabledActionTooltip } from '@/shared/components/tooltip'

import {
	formatSyncPolicySummary,
	getSyncErrorTitle,
	getSyncStatusCopy,
	SyncCountsSummaryValue,
	SyncCursorValue,
	SyncMetricCard,
	SyncReplicaBadge,
	SyncStatusBadge,
	SyncTimestampValue,
	SyncCloudConfigBadge,
} from './SettingsSyncPanel.presentation'

const SYNC_STATUS_CHANGED_EVENT = 'stoneflow://sync/status-changed'
const SYNC_STATUS_REFRESH_INTERVAL_MS = 60_000
const DEFAULT_INTERVAL_MINUTES = 15
const MIN_INTERVAL_MINUTES = 1
const MAX_INTERVAL_MINUTES = 1440

const SYNC_MODE_OPTIONS: Array<{
	mode: SyncPolicyMode
	label: string
	description: string
}> = [
	{
		mode: 'on_write',
		label: '有更新时',
		description: '本地有修改且约 3 秒无新写入时自动同步。',
	},
	{
		mode: 'interval',
		label: '定时',
		description: '按固定间隔自动同步（含从云端拉取）。',
	},
	{
		mode: 'manual',
		label: '手动',
		description: '仅在点击「立即同步」时同步。',
	},
]

function clampIntervalMinutes(value: number): number {
	if (!Number.isFinite(value)) {
		return DEFAULT_INTERVAL_MINUTES
	}
	return Math.min(MAX_INTERVAL_MINUTES, Math.max(MIN_INTERVAL_MINUTES, Math.round(value)))
}

/**
 * 云同步设置 panel。
 */
export function SettingsSyncPanel() {
	const [syncStatus, setSyncStatus] = useState<SyncStatusPayload | null>(null)
	const [syncStatusMessage, setSyncStatusMessage] = useState<string | null>(null)
	const [syncDiagnostics, setSyncDiagnostics] = useState<SyncDiagnosticsPayload | null>(null)
	const [syncDiagnosticsMessage, setSyncDiagnosticsMessage] = useState<string | null>(null)
	const [syncLoading, setSyncLoading] = useState(true)
	const [syncSaving, setSyncSaving] = useState(false)
	const [syncPolicySaving, setSyncPolicySaving] = useState(false)
	const [syncRunning, setSyncRunning] = useState(false)
	const [syncDiagnosing, setSyncDiagnosing] = useState(false)
	const [databaseUrl, setDatabaseUrl] = useState('')
	const [syncConfigDialogOpen, setSyncConfigDialogOpen] = useState(false)
	const [syncDetailsOpen, setSyncDetailsOpen] = useState(false)
	/** 定时模式下的分钟草稿，失焦/回车时提交 */
	const [intervalMinutesDraft, setIntervalMinutesDraft] = useState(String(DEFAULT_INTERVAL_MINUTES))

	useEffect(() => {
		void refreshSyncStatus({ syncUrlDraft: true })
	}, [])

	useEffect(() => {
		let disposed = false
		let unlisten: (() => void) | null = null

		void listen(SYNC_STATUS_CHANGED_EVENT, () => {
			void refreshSyncStatus({ silent: true, syncUrlDraft: false })
		})
			.then((nextUnlisten) => {
				if (disposed) {
					nextUnlisten()
					return
				}
				unlisten = nextUnlisten
			})
			.catch((error) => {
				console.error('sync status listener failed', { error })
			})

		return () => {
			disposed = true
			unlisten?.()
		}
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
			if (payload.policyMode === 'interval') {
				setIntervalMinutesDraft(String(payload.policyIntervalMinutes))
			}
			if (!payload.hasRemoteConfig) {
				setSyncDiagnostics(null)
				setSyncDiagnosticsMessage(null)
			}
			if (syncUrlDraft) {
				// remoteUrl 为脱敏展示；编辑框默认清空以免误提交旧密码
				setDatabaseUrl('')
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

	async function handleSaveSyncConfig(input: { databaseUrl: string }) {
		// 保存只写本机；后端会再调度一轮后台完整同步（验证连通 + 空云端灌库）。
		// 禁止在此 await 同步，否则弹窗会卡在连库上。
		setSyncSaving(true)
		setSyncStatusMessage(null)
		setSyncDiagnosticsMessage(null)
		try {
			const payload = await configureSync(input)
			setSyncStatus(payload)
			setDatabaseUrl('')
			setSyncStatusMessage(
				'配置已保存。正在后台连接云端并同步；完成后请点「刷新诊断」查看远端工作集。',
			)
			// 后台同步结束后静默刷新状态/诊断（给一点时间让 worker 启动）
			window.setTimeout(() => {
				void refreshSyncStatus({ silent: true, syncUrlDraft: false })
				void refreshSyncDiagnostics({ silent: true })
			}, 2500)
			window.setTimeout(() => {
				void refreshSyncStatus({ silent: true, syncUrlDraft: false })
				void refreshSyncDiagnostics({ silent: true })
			}, 8000)
		} catch (error) {
			const message = normalizeTauriError(error, '同步配置保存失败')
			setSyncStatusMessage(message)
			throw error
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

	async function persistSyncPolicy(mode: SyncPolicyMode, intervalMinutes: number) {
		setSyncPolicySaving(true)
		setSyncStatusMessage(null)
		try {
			const payload = await updateSyncPolicy({
				mode,
				intervalMinutes: clampIntervalMinutes(intervalMinutes),
			})
			setSyncStatus(payload)
			if (payload.policyMode === 'interval') {
				setIntervalMinutesDraft(String(payload.policyIntervalMinutes))
			}
		} catch (error) {
			setSyncStatusMessage(normalizeTauriError(error, '同步频率保存失败'))
			await refreshSyncStatus({ syncUrlDraft: false })
		} finally {
			setSyncPolicySaving(false)
		}
	}

	async function handleSyncModeChange(mode: SyncPolicyMode) {
		if (syncStatus?.policyMode === mode) {
			return
		}
		const minutes = clampIntervalMinutes(
			Number(intervalMinutesDraft) || syncStatus?.policyIntervalMinutes || DEFAULT_INTERVAL_MINUTES,
		)
		await persistSyncPolicy(mode, minutes)
	}

	async function handleIntervalMinutesCommit() {
		const minutes = clampIntervalMinutes(Number(intervalMinutesDraft))
		setIntervalMinutesDraft(String(minutes))
		if (syncStatus?.policyMode === 'interval' && syncStatus.policyIntervalMinutes === minutes) {
			return
		}
		await persistSyncPolicy('interval', minutes)
	}

	const effectiveSyncError =
		syncStatus?.status === 'error' || syncStatus?.status === 'needs_attention'
			? (syncStatus.lastError ?? syncStatusMessage)
			: syncStatusMessage
	const effectiveSyncErrorTitle = getSyncErrorTitle(syncStatus?.lastErrorMode ?? null, syncRunning)
	const syncBusy = syncSaving || syncPolicySaving || syncRunning || syncLoading
	const syncActionBusy = syncBusy || syncDiagnosing

	const replicaState: SyncReplicaState = syncStatus?.replicaState ?? 'uninitialized'
	const policyMode: SyncPolicyMode = syncStatus?.policyMode ?? 'interval'
	const displayedSyncStatus: SyncStatus = syncRunning
		? 'syncing'
		: syncSaving
			? 'syncing'
			: (syncStatus?.status ?? (syncLoading ? 'syncing' : 'disabled'))
	const syncStatusCopy = getSyncStatusCopy({
		dirtySince: syncStatus?.dirtySince ?? null,
		pendingResync: syncStatus?.pendingResync ?? false,
		hasRemoteConfig: syncStatus?.hasRemoteConfig ?? false,
		credentialState: syncStatus?.credentialState ?? 'missing',
		configSource: syncStatus?.configSource ?? 'system_keychain',
		replicaState,
		replicaReason: syncStatus?.replicaReason ?? null,
		status: displayedSyncStatus,
		syncLoading,
		syncRunning,
		syncSaving,
	})
	const syncNowDisabled = syncActionBusy || !syncStatus?.hasRemoteConfig
	const syncNowDisabledReason = syncActionBusy ? '正在处理同步操作，请稍候' : '请先配置同步数据库'
	const diagnosticsDisabled = syncBusy || syncDiagnosing || !syncStatus?.hasRemoteConfig
	const diagnosticsDisabledReason =
		syncBusy || syncDiagnosing ? '正在处理同步操作，请稍候' : '请先配置同步数据库'

	const configureButton = (
		<Button
			aria-label='配置同步数据库'
			isDisabled={syncActionBusy}
			isIconOnly
			onPress={() => setSyncConfigDialogOpen(true)}
			size='sm'
			type='button'
			variant='ghost'
		>
			<SettingsIcon aria-hidden />
		</Button>
	)
	const syncNowButton = (
		<Button
			isDisabled={syncNowDisabled}
			onPress={() => void handleRunSync()}
			type='button'
			variant='secondary'
		>
			{syncRunning
				? '同步中...'
				: replicaState === 'baseline_required'
					? '建立基线并同步'
					: '立即同步'}
		</Button>
	)
	const refreshDiagnosticsButton = (
		<Button
			isDisabled={diagnosticsDisabled}
			onPress={() => void refreshSyncDiagnostics()}
			size='sm'
			type='button'
			variant='secondary'
		>
			{syncDiagnosing ? '诊断中...' : '刷新诊断'}
		</Button>
	)

	return (
		<div className='flex w-full min-w-0 flex-col gap-7'>
			<SettingsSection
				description='所有业务仍然只读写本地数据库；这里仅配置云端 Postgres 副本，并在需要时手动或自动触发同步。'
				title='云同步'
			>
				<Surface className='overflow-hidden' variant='secondary'>
					<div className='p-4'>
						<div className='flex flex-col gap-4 md:flex-row md:items-start md:justify-between'>
							<div className='min-w-0'>
								<div className='flex flex-wrap items-center gap-2'>
									<SyncStatusBadge status={displayedSyncStatus} />
									<SyncReplicaBadge state={replicaState} />
									<SyncCloudConfigBadge
										credentialState={syncStatus?.credentialState ?? 'missing'}
									/>
								</div>
								<h3 className='mt-3 text-base font-semibold tracking-tight text-foreground'>
									{syncStatusCopy.title}
								</h3>
								<p className='mt-1 max-w-2xl text-sm leading-6 text-muted'>
									{syncStatusCopy.statusDescription}
								</p>
							</div>
							<div className='flex shrink-0 items-center gap-2 self-start'>
								{syncActionBusy ? (
									<DisabledActionTooltip label='配置同步数据库' reason='正在处理同步操作，请稍候'>
										{configureButton}
									</DisabledActionTooltip>
								) : (
									<ActionTooltip label='配置同步数据库'>{configureButton}</ActionTooltip>
								)}
								{syncNowDisabled ? (
									<DisabledActionTooltip label='立即同步' reason={syncNowDisabledReason}>
										{syncNowButton}
									</DisabledActionTooltip>
								) : (
									syncNowButton
								)}
							</div>
						</div>

						<div className='mt-4 grid gap-2 md:grid-cols-4'>
							<SyncMetricCard
								label='上次提交'
								value={<SyncTimestampValue timestamp={syncStatus?.lastPushAt ?? null} />}
							/>
							<SyncMetricCard
								label='上次确认'
								value={<SyncTimestampValue timestamp={syncStatus?.lastPullAt ?? null} />}
							/>
							<SyncMetricCard
								label='待同步'
								value={
									<span className='font-medium text-foreground'>
										{syncDiagnostics?.local.pendingMutationCount ?? 0} 条
									</span>
								}
							/>
							<SyncMetricCard label='副本状态' value={formatReplicaState(replicaState)} />
						</div>

						<div className='mt-4 flex min-w-0 flex-col gap-3'>
							<div className='flex flex-col gap-1.5'>
								<span className='text-xs font-medium text-foreground'>同步频率</span>
								<RadioGroup
									aria-label='同步频率'
									className='grid gap-2 sm:grid-cols-3'
									isDisabled={syncActionBusy}
									onChange={(value) => void handleSyncModeChange(value as SyncPolicyMode)}
									value={policyMode}
									variant='secondary'
								>
									{SYNC_MODE_OPTIONS.map((option) => (
										<Radio key={option.mode} value={option.mode}>
											<Radio.Content>
												<span className='min-w-0 flex-1 text-left'>
													<span className='block text-sm font-medium text-foreground'>
														{option.label}
													</span>
													<span className='block text-[11px] leading-4 text-muted'>
														{option.description}
													</span>
												</span>
												<Radio.Control>
													<Radio.Indicator />
												</Radio.Control>
											</Radio.Content>
										</Radio>
									))}
								</RadioGroup>
							</div>

							{policyMode === 'interval' ? (
								<TextField className='max-w-xs' isDisabled={syncActionBusy}>
									<Label>同步间隔（分钟）</Label>
									<div className='flex items-center gap-2'>
										<Input
											aria-label='同步间隔分钟'
											className='w-28'
											data-numeric-field='true'
											inputMode='numeric'
											max={MAX_INTERVAL_MINUTES}
											min={MIN_INTERVAL_MINUTES}
											onBlur={() => void handleIntervalMinutesCommit()}
											onChange={(event) => setIntervalMinutesDraft(event.currentTarget.value)}
											onKeyDown={(event) => {
												if (event.key === 'Enter') {
													event.preventDefault()
													void handleIntervalMinutesCommit()
												}
											}}
											step={1}
											type='number'
											value={intervalMinutesDraft}
										/>
										<span className='text-sm text-muted'>分钟</span>
									</div>
									<p className='mt-1 text-xs leading-5 text-muted'>
										可填 {MIN_INTERVAL_MINUTES}–{MAX_INTERVAL_MINUTES}
										（1 天）；精确到 1 分钟。
									</p>
								</TextField>
							) : null}

							<p className='text-xs leading-5 text-muted'>{formatSyncPolicySummary(syncStatus)}</p>
						</div>
					</div>

					<Disclosure isExpanded={syncDetailsOpen} onExpandedChange={setSyncDetailsOpen}>
						<Disclosure.Heading>
							<Disclosure.Trigger>
								<span className='font-medium'>详情与诊断</span>
								<Disclosure.Indicator />
							</Disclosure.Trigger>
						</Disclosure.Heading>
						<Disclosure.Content>
							<Disclosure.Body>
								<Alert
									aria-busy={syncLoading || syncSaving || syncRunning}
									aria-live='polite'
									status={syncStatusCopy.variant}
								>
									<Alert.Indicator />
									<Alert.Content>
										<Alert.Title>{syncStatusCopy.title}</Alert.Title>
										<Alert.Description>{syncStatusCopy.summary}</Alert.Description>
									</Alert.Content>
								</Alert>

								{replicaState === 'baseline_required' && syncStatus?.replicaReason ? (
									<Alert status='warning'>
										<Alert.Indicator />
										<Alert.Content>
											<Alert.Title>当前设备需要建立同步基线</Alert.Title>
											<Alert.Description>{syncStatus.replicaReason}</Alert.Description>
										</Alert.Content>
									</Alert>
								) : null}

								{effectiveSyncError ? (
									<Alert role='alert' status='danger'>
										<Alert.Indicator />
										<Alert.Content>
											<Alert.Title>{effectiveSyncErrorTitle}</Alert.Title>
											<Alert.Description>{effectiveSyncError}</Alert.Description>
										</Alert.Content>
									</Alert>
								) : null}

								<div className='flex flex-col gap-3'>
									<div className='flex items-center justify-between gap-3'>
										<div className='min-w-0'>
											<h3 className='text-sm font-semibold text-foreground'>同步诊断</h3>
											<p className='mt-1 text-xs leading-5 text-muted'>
												只读查看当前设备与云端副本的同步序号和工作集摘要，用于排查同步问题。
											</p>
										</div>
										{diagnosticsDisabled ? (
											<DisabledActionTooltip label='刷新诊断' reason={diagnosticsDisabledReason}>
												{refreshDiagnosticsButton}
											</DisabledActionTooltip>
										) : (
											refreshDiagnosticsButton
										)}
									</div>

									{syncDiagnostics ? (
										<div className='grid gap-3 md:grid-cols-2 xl:grid-cols-3'>
											<SettingInfoRow
												description='当前保存并正在使用的云端副本地址（已脱敏）。'
												label='云端副本'
												value={
													<span className='break-all font-medium text-foreground'>
														{syncDiagnostics.remoteHost ?? '未读取'}
													</span>
												}
											/>
											<SettingInfoRow
												description='当前设备最后一次成功吸收远端 change log 后落在本地的 server_seq。'
												label='本地 server_seq'
												value={
													<SyncCursorValue value={syncDiagnostics.local.lastPulledServerSeq} />
												}
											/>
											<SettingInfoRow
												description='云端变更日志当前看到的最新同步序号。'
												label='远端同步序号'
												value={<SyncCursorValue value={syncDiagnostics.remote.latestServerSeq} />}
											/>
											<SettingInfoRow
												description='当前设备本地还没提交成功的 mutation 数量。'
												label='待同步 mutation'
												value={
													<span className='font-medium text-foreground'>
														{syncDiagnostics.local.pendingMutationCount} 条
													</span>
												}
											/>
											<SettingInfoRow
												description='本机未进回收站的实体数（含归档；不含永久删除）。'
												label='本地工作集'
												value={<SyncCountsSummaryValue counts={syncDiagnostics.local.counts} />}
											/>
											<SettingInfoRow
												description='云端当前投影：每个实体只计最新 generation，且不含 trashed。不是 change_log 条数。'
												label='远端工作集'
												value={<SyncCountsSummaryValue counts={syncDiagnostics.remote.counts} />}
											/>
										</div>
									) : (
										<Alert>
											<Alert.Indicator />
											<Alert.Content>
												<Alert.Title>尚未读取同步诊断</Alert.Title>
												<Alert.Description>
													{syncStatus?.hasRemoteConfig
														? '点击「刷新诊断」后，会显示本地 cursor、远端 cursor 和工作集计数。'
														: '先保存可用的同步数据库连接，才能读取远端诊断信息。'}
												</Alert.Description>
											</Alert.Content>
										</Alert>
									)}

									{syncDiagnosticsMessage ? (
										<Alert role='alert' status='danger'>
											<Alert.Indicator />
											<Alert.Content>
												<Alert.Title>同步诊断读取失败</Alert.Title>
												<Alert.Description>{syncDiagnosticsMessage}</Alert.Description>
											</Alert.Content>
										</Alert>
									) : null}
								</div>
							</Disclosure.Body>
						</Disclosure.Content>
					</Disclosure>
				</Surface>

				<SyncConfigDialog
					configSource={syncStatus?.configSource ?? 'system_keychain'}
					databaseUrl={databaseUrl}
					onClose={() => setSyncConfigDialogOpen(false)}
					onDatabaseUrlChange={setDatabaseUrl}
					onSave={handleSaveSyncConfig}
					open={syncConfigDialogOpen}
					saving={syncSaving}
				/>
			</SettingsSection>
		</div>
	)
}

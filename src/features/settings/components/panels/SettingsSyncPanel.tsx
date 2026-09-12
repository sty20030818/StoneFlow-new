import { Alert, Button, Card, Description, Disclosure, Label, NumberField } from '@heroui/react'
import { RadioButtonGroup } from '@heroui-pro/react'
import { useEffect, useRef, useState } from 'react'
import { listen } from '@tauri-apps/api/event'
import { SettingsIcon } from 'lucide-react'

import {
	adoptLegacySyncRemote,
	configureSync,
	formatReplicaState,
	getSyncDiagnostics,
	getSyncStatus,
	isSyncReplicaRecoveryRequired,
	rebindSync,
	runSync,
	SyncConfigDialog,
	updateSyncPolicy,
	type SyncDiagnosticsPayload,
	type SyncDatabaseConfigInput,
	type SyncPolicyMode,
	type SyncReplicaState,
	type SyncStatus,
	type SyncStatusPayload,
} from '@/features/sync'
import { normalizeTauriError } from '@/shared/lib/normalize-tauri-error'
import { SettingInfoRow, SettingsSection, SettingsStack } from '../settingsShared'
import { ActionTooltip, DisabledActionTooltip } from '@/shared/components/tooltip'

import {
	formatSyncPolicySummary,
	getSyncErrorTitle,
	getSyncStatusCopy,
	SyncCountsSummaryValue,
	SyncCursorValue,
	SyncMetric,
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
	const [intervalMinutesDraft, setIntervalMinutesDraftState] = useState(DEFAULT_INTERVAL_MINUTES)
	const intervalMinutesDraftRef = useRef(DEFAULT_INTERVAL_MINUTES)
	const delayedRefreshTimersRef = useRef<number[]>([])
	const mountedRef = useRef(true)
	const syncPolicySavingRef = useRef(false)

	function setIntervalMinutesDraft(value: number) {
		if (!Number.isFinite(value)) {
			return
		}
		intervalMinutesDraftRef.current = value
		setIntervalMinutesDraftState(value)
	}

	useEffect(() => {
		void refreshSyncStatus({ syncUrlDraft: true })
	}, [])

	useEffect(() => {
		mountedRef.current = true
		return () => {
			mountedRef.current = false
			for (const timer of delayedRefreshTimersRef.current) {
				window.clearTimeout(timer)
			}
			delayedRefreshTimersRef.current = []
		}
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
			setSyncStatusMessage(null)
			setIntervalMinutesDraft(payload.policyIntervalMinutes)
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

	async function persistSyncConfig(
		action: (input: SyncDatabaseConfigInput) => Promise<SyncStatusPayload>,
		input: SyncDatabaseConfigInput,
	) {
		setSyncSaving(true)
		setSyncStatusMessage(null)
		setSyncDiagnosticsMessage(null)
		try {
			const payload = await action(input)
			if (!mountedRef.current) {
				return
			}
			setSyncStatus(payload)
			setDatabaseUrl('')
			// 后台同步结束后静默刷新状态/诊断（给一点时间让 worker 启动）
			for (const delay of [2500, 8000]) {
				delayedRefreshTimersRef.current.push(
					window.setTimeout(() => {
						void refreshSyncStatus({ silent: true, syncUrlDraft: false })
						void refreshSyncDiagnostics({ silent: true })
					}, delay),
				)
			}
		} finally {
			if (mountedRef.current) {
				setSyncSaving(false)
			}
		}
	}

	function handleSaveSyncConfig(input: SyncDatabaseConfigInput) {
		return persistSyncConfig(configureSync, input)
	}

	function handleRebindSyncConfig(input: SyncDatabaseConfigInput) {
		return persistSyncConfig(rebindSync, input)
	}

	async function handleAdoptLegacyRemote() {
		setSyncSaving(true)
		setSyncStatusMessage(null)
		setSyncDiagnosticsMessage(null)
		try {
			await adoptLegacySyncRemote()
			if (mountedRef.current) {
				await refreshSyncStatus({ silent: true, syncUrlDraft: false })
			}
		} finally {
			if (mountedRef.current) {
				setSyncSaving(false)
			}
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
			await refreshSyncStatus({ silent: true, syncUrlDraft: false })
			setSyncStatusMessage(normalizeTauriError(error, '手动同步失败'))
		} finally {
			setSyncRunning(false)
		}
	}

	async function persistSyncPolicy(mode: SyncPolicyMode, intervalMinutes: number) {
		if (syncPolicySavingRef.current) {
			return
		}
		syncPolicySavingRef.current = true
		setSyncPolicySaving(true)
		setSyncStatusMessage(null)
		try {
			const payload = await updateSyncPolicy({
				mode,
				intervalMinutes,
			})
			setSyncStatus(payload)
			setIntervalMinutesDraft(payload.policyIntervalMinutes)
		} catch (error) {
			await refreshSyncStatus({ silent: true, syncUrlDraft: false })
			setSyncStatusMessage(normalizeTauriError(error, '同步频率保存失败'))
		} finally {
			syncPolicySavingRef.current = false
			setSyncPolicySaving(false)
		}
	}

	async function handleSyncModeChange(mode: SyncPolicyMode) {
		if (syncStatus?.policyMode === mode) {
			return
		}
		await persistSyncPolicy(mode, intervalMinutesDraftRef.current)
	}

	async function handleIntervalMinutesCommit() {
		const minutes = intervalMinutesDraftRef.current
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
	const replicaRecoveryRequired = isSyncReplicaRecoveryRequired(replicaState)
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
	const syncNowDisabled = syncActionBusy || !syncStatus?.hasRemoteConfig || replicaRecoveryRequired
	const syncNowDisabledReason = syncActionBusy
		? '正在处理同步操作，请稍候'
		: replicaRecoveryRequired
			? (syncStatus?.replicaReason ?? formatReplicaState(replicaState))
			: '请先配置同步数据库'
	const diagnosticsDisabled =
		syncBusy || syncDiagnosing || !syncStatus?.hasRemoteConfig || replicaRecoveryRequired
	const diagnosticsDisabledReason =
		syncBusy || syncDiagnosing
			? '正在处理同步操作，请稍候'
			: replicaRecoveryRequired
				? (syncStatus?.replicaReason ?? formatReplicaState(replicaState))
				: '请先配置同步数据库'

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
		<SettingsStack>
			<SettingsSection description='数据始终先保存在本机，再同步到云端副本。' title='云同步'>
				{syncStatus ? (
					<div className='grid gap-4'>
						<div className='flex flex-col gap-4 md:flex-row md:items-start md:justify-between'>
							<div className='min-w-0'>
								<div className='flex flex-wrap items-center gap-2'>
									<SyncStatusBadge status={displayedSyncStatus} />
									<SyncReplicaBadge state={replicaState} />
									<SyncCloudConfigBadge
										credentialState={syncStatus?.credentialState ?? 'missing'}
									/>
								</div>
								<h3
									aria-live='polite'
									className='mt-3 text-base font-semibold tracking-tight text-foreground'
								>
									{syncStatusCopy.title}
								</h3>
								<p className='mt-1 max-w-2xl text-sm leading-6 text-muted'>
									{syncStatusCopy.summary}
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

						<dl className='grid gap-4 sm:grid-cols-3'>
							<SyncMetric
								label='上次提交'
								value={<SyncTimestampValue timestamp={syncStatus?.lastPushAt ?? null} />}
							/>
							<SyncMetric
								label='上次确认'
								value={<SyncTimestampValue timestamp={syncStatus?.lastPullAt ?? null} />}
							/>
							<SyncMetric
								label='待同步'
								value={
									<div className='grid gap-1'>
										<span>
											{syncDiagnostics
												? `${syncDiagnostics.local.pendingMutationCount} 条`
												: '未读取'}
										</span>
										{syncDiagnostics ? <span className='text-xs text-muted'>诊断快照</span> : null}
									</div>
								}
							/>
						</dl>
					</div>
				) : syncLoading ? (
					<p aria-busy='true' className='text-sm text-muted' role='status'>
						正在读取同步状态…
					</p>
				) : (
					<Alert role='alert' status='danger'>
						<Alert.Indicator />
						<Alert.Content>
							<Alert.Title>同步状态读取失败</Alert.Title>
							<Alert.Description>
								{syncStatusMessage ?? '请重试读取同步状态，本地数据不受影响。'}
							</Alert.Description>
						</Alert.Content>
						<Button
							onPress={() => void refreshSyncStatus({ syncUrlDraft: false })}
							variant='outline'
						>
							重试
						</Button>
					</Alert>
				)}
				{syncStatus && effectiveSyncError ? (
					<Alert role='alert' status='danger'>
						<Alert.Indicator />
						<Alert.Content>
							<Alert.Title>{effectiveSyncErrorTitle}</Alert.Title>
							<Alert.Description>{effectiveSyncError}</Alert.Description>
						</Alert.Content>
					</Alert>
				) : null}
			</SettingsSection>

			{syncStatus ? (
				<SettingsSection title='同步方式' description='选择自动同步的时机，或仅在需要时手动同步。'>
					<RadioButtonGroup
						aria-label='同步频率'
						className='grid-cols-1 sm:grid-cols-3'
						layout='grid'
						isDisabled={syncActionBusy}
						onChange={(value) => void handleSyncModeChange(value as SyncPolicyMode)}
						value={policyMode}
						variant='secondary'
					>
						{SYNC_MODE_OPTIONS.map((option) => (
							<RadioButtonGroup.Item key={option.mode} value={option.mode}>
								<RadioButtonGroup.Indicator />
								<RadioButtonGroup.ItemContent>
									<span className='block text-sm font-medium text-foreground'>{option.label}</span>
									<span className='mt-1 block text-xs leading-5 text-muted'>
										{option.description}
									</span>
								</RadioButtonGroup.ItemContent>
							</RadioButtonGroup.Item>
						))}
					</RadioButtonGroup>

					{policyMode === 'interval' ? (
						<div
							className='max-w-xs'
							onBlur={(event) => {
								if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
									void handleIntervalMinutesCommit()
								}
							}}
						>
							<NumberField
								isDisabled={syncActionBusy}
								maxValue={MAX_INTERVAL_MINUTES}
								minValue={MIN_INTERVAL_MINUTES}
								onChange={setIntervalMinutesDraft}
								onKeyDown={(event) => {
									if (event.key === 'Enter') {
										event.preventDefault()
									}
								}}
								onKeyUp={(event) => {
									if (event.key === 'Enter') {
										event.preventDefault()
										void handleIntervalMinutesCommit()
									}
								}}
								step={1}
								value={intervalMinutesDraft}
								variant='secondary'
							>
								<Label>同步间隔（分钟）</Label>
								<div className='flex items-center gap-2'>
									<NumberField.Group className='w-40'>
										<NumberField.DecrementButton aria-label='减少同步间隔' />
										<NumberField.Input />
										<NumberField.IncrementButton aria-label='增加同步间隔' />
									</NumberField.Group>
									<span className='text-sm text-muted'>分钟</span>
								</div>
								<Description>
									可填 {MIN_INTERVAL_MINUTES}–{MAX_INTERVAL_MINUTES}
									（1 天）；精确到 1 分钟。
								</Description>
							</NumberField>
						</div>
					) : null}

					<p className='text-xs leading-5 text-muted'>{formatSyncPolicySummary(syncStatus)}</p>
				</SettingsSection>
			) : null}

			<Card>
				<Card.Content>
					<Disclosure isExpanded={syncDetailsOpen} onExpandedChange={setSyncDetailsOpen}>
						<Disclosure.Heading>
							<Disclosure.Trigger>
								<span className='inline-flex items-center gap-2 font-medium'>
									详情与诊断
									<Disclosure.Indicator />
								</span>
							</Disclosure.Trigger>
						</Disclosure.Heading>
						<Disclosure.Content>
							<Disclosure.Body>
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
										<dl className='grid gap-x-6 sm:grid-cols-2'>
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
										</dl>
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
				</Card.Content>
			</Card>

			<SyncConfigDialog
				configSource={syncStatus?.configSource ?? 'system_keychain'}
				databaseUrl={databaseUrl}
				legacyRemoteAdoptionRequired={replicaState === 'legacy_binding_required'}
				legacyRemoteReason={syncStatus?.replicaReason ?? null}
				redactedRemoteUrl={syncStatus?.remoteUrl ?? null}
				onAdoptLegacyRemote={handleAdoptLegacyRemote}
				onClose={() => setSyncConfigDialogOpen(false)}
				onDatabaseUrlChange={setDatabaseUrl}
				onRebind={handleRebindSyncConfig}
				onSave={handleSaveSyncConfig}
				open={syncConfigDialogOpen}
				saving={syncSaving}
			/>
		</SettingsStack>
	)
}

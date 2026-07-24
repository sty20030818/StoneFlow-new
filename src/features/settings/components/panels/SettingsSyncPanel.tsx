import { useEffect, useState } from 'react'
import { listen } from '@tauri-apps/api/event'

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
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/components/base/button'
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/shared/components/base/select'
import { normalizeTauriError } from '@/shared/lib/normalize-tauri-error'
import {
	formFieldHintClass,
	formFieldLabelVariants,
	formFieldStackClass,
} from '@/shared/components/patterns/form-field'
import { SettingInfoRow, SettingsSection } from '../settingsShared'
import { statusNoticeCompactTextClass } from '@/shared/components/patterns/status-notice'
import { StatusNotice } from '@/shared/components/StatusNotice'
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from '@/shared/components/base/collapsible'
import { ChevronDownIcon, SettingsIcon } from 'lucide-react'

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
const SYNC_POLICY_OPTIONS: Array<{
	value: string
	label: string
	mode: SyncPolicyMode
	intervalMinutes: 5 | 15 | 30
}> = [
	{ value: 'interval:5', label: '每 5 分钟', mode: 'interval', intervalMinutes: 5 },
	{ value: 'interval:15', label: '每 15 分钟', mode: 'interval', intervalMinutes: 15 },
	{ value: 'interval:30', label: '每 30 分钟', mode: 'interval', intervalMinutes: 30 },
	{ value: 'manual:15', label: '仅手动', mode: 'manual', intervalMinutes: 15 },
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
	const [syncRunning, setSyncRunning] = useState(false)
	const [syncDiagnosing, setSyncDiagnosing] = useState(false)
	const [databaseUrl, setDatabaseUrl] = useState('')
	const [syncConfigDialogOpen, setSyncConfigDialogOpen] = useState(false)
	const [syncDetailsOpen, setSyncDetailsOpen] = useState(false)

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

	async function handleSyncPolicyChange(value: string) {
		const option = SYNC_POLICY_OPTIONS.find((item) => item.value === value)
		if (!option) {
			return
		}

		setSyncSaving(true)
		setSyncStatusMessage(null)
		try {
			const payload = await updateSyncPolicy({
				mode: option.mode,
				intervalMinutes: option.intervalMinutes,
			})
			setSyncStatus(payload)
		} catch (error) {
			setSyncStatusMessage(normalizeTauriError(error, '同步频率保存失败'))
			await refreshSyncStatus({ syncUrlDraft: false })
		} finally {
			setSyncSaving(false)
		}
	}

	const effectiveSyncError =
		syncStatus?.status === 'error' ? (syncStatus.lastError ?? syncStatusMessage) : syncStatusMessage
	const effectiveSyncErrorTitle = getSyncErrorTitle(syncStatus?.lastErrorMode ?? null, syncRunning)
	const syncBusy = syncSaving || syncRunning || syncLoading
	const syncActionBusy = syncBusy || syncDiagnosing
	const replicaState: SyncReplicaState = syncStatus?.replicaState ?? 'uninitialized'
	const syncPolicyValue = syncStatus
		? `${syncStatus.policyMode}:${syncStatus.policyIntervalMinutes}`
		: 'interval:15'
	const displayedSyncStatus: SyncStatus = syncRunning
		? 'syncing'
		: syncSaving
			? 'syncing'
			: (syncStatus?.status ?? (syncLoading ? 'syncing' : 'disabled'))
	const syncStatusCopy = getSyncStatusCopy({
		dirtySince: syncStatus?.dirtySince ?? null,
		pendingResync: syncStatus?.pendingResync ?? false,
		hasRemoteConfig: syncStatus?.hasRemoteConfig ?? false,
		replicaState,
		replicaReason: syncStatus?.replicaReason ?? null,
		status: displayedSyncStatus,
		syncLoading,
		syncRunning,
		syncSaving,
	})

	return (
		<div className='flex w-full min-w-0 flex-col gap-4'>
			<SettingsSection
				description='所有业务仍然只读写本地数据库；这里仅配置云端 Postgres 副本，并在需要时手动或自动触发同步。'
				title='云同步'
			>
				<div className='overflow-hidden rounded-xl border border-sf-border-subtle bg-card'>
					<div className='p-4'>
						<div className='flex flex-col gap-4 md:flex-row md:items-start md:justify-between'>
							<div className='min-w-0'>
								<div className='flex flex-wrap items-center gap-2'>
									<SyncStatusBadge status={displayedSyncStatus} />
									<SyncReplicaBadge state={replicaState} />
									<SyncCloudConfigBadge configured={syncStatus?.hasRemoteConfig ?? false} />
								</div>
								<h3 className='mt-3 text-base font-semibold tracking-tight text-foreground'>
									{syncStatusCopy.title}
								</h3>
								<p className='mt-1 max-w-2xl text-sm leading-6 text-muted-foreground'>
									{syncStatusCopy.statusDescription}
								</p>
							</div>
							<div className='flex shrink-0 items-center gap-2 self-start'>
								<Button
									aria-label='配置同步数据库'
									disabled={syncActionBusy}
									onClick={() => setSyncConfigDialogOpen(true)}
									size='icon-sm'
									type='button'
									variant='ghost'
								>
									<SettingsIcon />
								</Button>
								<Button
									disabled={syncActionBusy || !syncStatus?.hasRemoteConfig}
									onClick={() => void handleRunSync()}
									type='button'
									variant='secondary'
								>
									{syncRunning
										? '同步中...'
										: replicaState === 'baseline_required'
											? '建立基线并同步'
											: '立即同步'}
								</Button>
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

						<div className='mt-4 grid gap-3 md:grid-cols-[minmax(0,18rem)_1fr] md:items-end'>
							<label className={formFieldStackClass}>
								<span className={formFieldLabelVariants()}>同步频率</span>
								<Select
									disabled={syncActionBusy}
									onValueChange={handleSyncPolicyChange}
									value={syncPolicyValue}
								>
									<SelectTrigger aria-label='同步频率' className='h-10 w-full'>
										<SelectValue placeholder='选择同步频率' />
									</SelectTrigger>
									<SelectContent position='popper'>
										<SelectGroup>
											{SYNC_POLICY_OPTIONS.map((option) => (
												<SelectItem key={option.value} value={option.value}>
													{option.label}
												</SelectItem>
											))}
										</SelectGroup>
									</SelectContent>
								</Select>
							</label>
							<p className={formFieldHintClass}>{formatSyncPolicySummary(syncStatus)}</p>
						</div>
					</div>

					<Collapsible onOpenChange={setSyncDetailsOpen} open={syncDetailsOpen}>
						<CollapsibleTrigger
							className={cn(
								'flex w-full items-center justify-between border-t border-sf-border-subtle bg-muted/20 px-4 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:bg-muted/35 hover:text-foreground',
								syncDetailsOpen && 'bg-muted/30 text-foreground',
							)}
							type='button'
						>
							<span className='font-medium'>详情与诊断</span>
							<ChevronDownIcon
								className={cn(
									'size-4 shrink-0 transition-transform duration-200',
									syncDetailsOpen && 'rotate-180',
								)}
							/>
						</CollapsibleTrigger>
						<CollapsibleContent className='overflow-hidden border-t border-sf-border-subtle'>
							<div className='flex flex-col gap-4 bg-muted/10 p-4'>
								<StatusNotice
									description={syncStatusCopy.summary}
									title={syncStatusCopy.title}
									variant={syncStatusCopy.variant}
								/>

								{replicaState === 'baseline_required' && syncStatus?.replicaReason ? (
									<StatusNotice
										description={syncStatus.replicaReason}
										title='当前设备需要建立同步基线'
										variant='warning'
									/>
								) : null}

								{effectiveSyncError ? (
									<StatusNotice
										className={statusNoticeCompactTextClass}
										description={effectiveSyncError}
										role='alert'
										size='sm'
										title={effectiveSyncErrorTitle}
										variant='danger'
									/>
								) : null}

								<div className='flex flex-col gap-3'>
									<div className='flex items-center justify-between gap-3'>
										<div className='min-w-0'>
											<h3 className='text-sm font-semibold text-foreground'>同步诊断</h3>
											<p className={formFieldHintClass}>
												只读查看当前设备与云端副本的同步序号和工作集摘要，用于排查同步问题。
											</p>
										</div>
										<Button
											disabled={syncBusy || syncDiagnosing || !syncStatus?.hasRemoteConfig}
											onClick={() => void refreshSyncDiagnostics()}
											size='sm'
											type='button'
											variant='secondary'
										>
											{syncDiagnosing ? '诊断中...' : '刷新诊断'}
										</Button>
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
												description='本机存活实体（未永久删除），口径与云端投影对齐。'
												label='本地工作集'
												value={<SyncCountsSummaryValue counts={syncDiagnostics.local.counts} />}
											/>
											<SettingInfoRow
												description='云端 sync_entity_state 投影行数（同步用精简状态，不是业务整库镜像）。'
												label='远端工作集'
												value={<SyncCountsSummaryValue counts={syncDiagnostics.remote.counts} />}
											/>
										</div>
									) : (
										<StatusNotice
											description={
												syncStatus?.hasRemoteConfig
													? '点击「刷新诊断」后，会显示本地 cursor、远端 cursor 和工作集计数。'
													: '先保存可用的同步数据库连接，才能读取远端诊断信息。'
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
							</div>
						</CollapsibleContent>
					</Collapsible>
				</div>

				<SyncConfigDialog
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

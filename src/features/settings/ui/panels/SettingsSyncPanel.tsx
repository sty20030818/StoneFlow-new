import { useEffect, useState } from 'react'
import { listen } from '@tauri-apps/api/event'

import {
	configureSync,
	getSyncDiagnostics,
	getSyncStatus,
	runSync,
	updateSyncPolicy,
	type SyncDiagnosticsPayload,
	type SyncPolicyMode,
	type SyncReplicaState,
	type SyncStatus,
	type SyncStatusPayload,
} from '@/features/sync/api/sync'
import { SyncConfigDialog } from '@/features/sync/ui/SyncConfigDialog'
import {
	formatReplicaState,
	formatSyncStatus,
	getSyncReplicaTone,
	getSyncStatusTone,
} from '@/features/sync/model/syncStatusPresentation'
import { cn } from '@/shared/lib/utils'
import { Badge } from '@/shared/ui/base/badge'
import { Button } from '@/shared/ui/base/button'
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/shared/ui/base/select'
import { normalizeTauriError } from '@/shared/lib/normalize-tauri-error'
import {
	formFieldHintClass,
	formFieldLabelVariants,
	formFieldStackClass,
} from '@/shared/ui/patterns/form-field'
import { SettingInfoRow, SettingsSection } from '@/features/settings/ui/settingsShared'
import { statusNoticeCompactTextClass } from '@/shared/ui/patterns/status-notice'
import { StatusNotice } from '@/shared/ui/StatusNotice'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shared/ui/base/collapsible'
import { ChevronDownIcon, SettingsIcon } from 'lucide-react'

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
	const [syncUrl, setSyncUrl] = useState('')
	const [syncToken, setSyncToken] = useState('')
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

	async function handleSaveSyncConfig(input: { url: string; token: string }) {
		setSyncSaving(true)
		setSyncStatusMessage(null)
		setSyncDiagnostics(null)
		setSyncDiagnosticsMessage(null)
		try {
			await configureSync(input)
			setSyncToken('')
			await refreshSyncStatus({ syncUrlDraft: true })
			await refreshSyncDiagnostics({ silent: true })
		} catch (error) {
			setSyncStatusMessage(normalizeTauriError(error, '同步配置保存失败'))
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
	const syncRequiresBaseline = syncStatus?.replicaState === 'baseline_required'
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
		replicaState: syncStatus?.replicaState ?? 'uninitialized',
		replicaReason: syncStatus?.replicaReason ?? null,
		status: displayedSyncStatus,
		syncLoading,
		syncRunning,
		syncSaving,
	})

	return (
		<div className='flex w-full min-w-0 flex-col gap-4'>
			<SettingsSection
				description='所有业务仍然只读写本地数据库；这里仅配置 Turso 远端，并在需要时手动或自动触发同步。'
				title='云同步'
			>
				<div className='overflow-hidden rounded-xl border border-sf-border-subtle bg-card'>
					<div className='p-4'>
						<div className='flex flex-col gap-4 md:flex-row md:items-start md:justify-between'>
							<div className='min-w-0'>
								<div className='flex flex-wrap items-center gap-2'>
									<SyncStatusBadge status={displayedSyncStatus} />
									<SyncReplicaBadge state={syncStatus?.replicaState ?? 'uninitialized'} />
									<SyncTursoConfigBadge configured={syncStatus?.hasRemoteConfig ?? false} />
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
									aria-label='配置 Turso 远端'
									disabled={syncActionBusy}
									onClick={() => setSyncConfigDialogOpen(true)}
									size='icon-sm'
									type='button'
									variant='ghost'
								>
									<SettingsIcon />
								</Button>
								<Button
									disabled={syncActionBusy || !syncStatus?.hasRemoteConfig || syncRequiresBaseline}
									onClick={() => void handleRunSync()}
									type='button'
									variant='secondary'
								>
									{syncRunning ? '同步中...' : '立即同步'}
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
							<SyncMetricCard
								label='副本状态'
								value={formatReplicaState(syncStatus?.replicaState ?? 'uninitialized')}
							/>
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

								{syncRequiresBaseline && syncStatus?.replicaReason ? (
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
												只读查看当前设备与 Turso 远端的 server_seq 和工作集摘要，用于排查同步问题。
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
												description='当前保存并正在使用的 Turso 远端 host。'
												label='远端 Host'
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
												description='Turso 远端 remote_change_log 当前看到的最新 server_seq。'
												label='远端 server_seq'
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
												description='当前设备本地工作集的计数摘要。'
												label='本地工作集'
												value={<SyncCountsSummaryValue counts={syncDiagnostics.local.counts} />}
											/>
											<SettingInfoRow
												description='Turso 远端当前镜像表的计数摘要。'
												label='远端工作集'
												value={<SyncCountsSummaryValue counts={syncDiagnostics.remote.counts} />}
											/>
										</div>
									) : (
										<StatusNotice
											description={
												syncStatus?.hasRemoteConfig
													? '点击「刷新诊断」后，会显示本地 cursor、远端 cursor 和工作集计数。'
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
							</div>
						</CollapsibleContent>
					</Collapsible>
				</div>

				<SyncConfigDialog
					onClose={() => setSyncConfigDialogOpen(false)}
					onSave={handleSaveSyncConfig}
					onSyncTokenChange={setSyncToken}
					onSyncUrlChange={setSyncUrl}
					open={syncConfigDialogOpen}
					syncBusy={syncBusy}
					syncToken={syncToken}
					syncUrl={syncUrl}
				/>
			</SettingsSection>
		</div>
	)
}

function SyncMetricCard({ label, value }: { label: string; value: React.ReactNode }) {
	return (
		<div className='rounded-2xl border border-sf-border-subtle bg-muted/25 px-3 py-2'>
			<p className='text-[11px] font-medium text-muted-foreground'>{label}</p>
			<div className='mt-1 text-sm text-foreground'>{value}</div>
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
			<span className='font-medium text-foreground'>{formatSyncCountsSummary(counts)}</span>
			<span className='text-xs text-slate-500'>总计 {counts.totalItems} 条主数据</span>
		</div>
	)
}

function SyncStatusBadge({ status }: { status: SyncStatus }) {
	const tone = getSyncStatusTone(status)

	return (
		<Badge variant={tone.badgeVariant}>
			<span
				className={cn(
					'size-2 shrink-0 rounded-full',
					tone.dotClassName,
					status === 'syncing' && 'animate-pulse',
				)}
			/>
			{formatSyncStatus(status)}
		</Badge>
	)
}

function SyncReplicaBadge({ state }: { state: SyncReplicaState }) {
	const tone = getSyncReplicaTone(state)

	return (
		<Badge variant={tone.badgeVariant}>
			<span className={cn('size-2 shrink-0 rounded-full', tone.dotClassName)} />
			{formatReplicaState(state)}
		</Badge>
	)
}

function SyncTursoConfigBadge({ configured }: { configured: boolean }) {
	return (
		<Badge variant={configured ? 'success' : 'outline'}>
			<span
				className={cn(
					'size-2 shrink-0 rounded-full',
					configured ? 'bg-sf-project-task-status-done' : 'bg-(--sf-neutral-500)',
				)}
			/>
			{configured ? 'Turso 已配置' : 'Turso 未配置'}
		</Badge>
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

function formatSyncPolicySummary(status: SyncStatusPayload | null) {
	if (!status) {
		return '默认每 15 分钟自动同步。'
	}

	if (status.policyMode === 'manual') {
		return '仅手动同步：本地写入会保留为待同步状态，直到点击“立即同步”。'
	}

	const nextSyncText = status.nextSyncAt
		? `下次自动同步：${formatSyncExactTime(status.nextSyncAt)}。`
		: '下次自动同步会在调度器启动后计算。'
	return `每 ${status.policyIntervalMinutes} 分钟自动同步。${nextSyncText}`
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

	if (!hasRemoteConfig || status === 'disabled') {
		return {
			title: '尚未启用云同步',
			summary: '当前还没有保存可用的 Turso 远端。完成配置前，所有数据只会保留在本地数据库。',
			statusDescription: '未配置 Turso 远端，本机只保留本地数据。',
			variant: 'neutral' as const,
		}
	}

	if (replicaState === 'baseline_required') {
		return {
			title: '当前设备需要建立同步基线',
			summary:
				replicaReason ??
				'当前设备已有本地数据，但缺少同步基线。为避免误覆盖本地副本，已暂停自动同步，请先完成基线迁移。',
			statusDescription: '当前设备缺少同步基线，普通同步已暂停。',
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
				summary:
					'上一轮同步失败了。先检查 URL、token、网络和 Turso 远端状态，修正后再触发下一轮同步。',
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

function getSyncErrorTitle(mode: 'push' | 'pull' | 'sync' | null, syncRunning: boolean) {
	if (syncRunning) {
		return '手动同步失败'
	}

	switch (mode) {
		case 'push':
			return '提交失败'
		case 'pull':
			return '确认失败'
		case 'sync':
			return '手动同步失败'
		default:
			return '同步失败'
	}
}

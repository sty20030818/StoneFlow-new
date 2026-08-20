import type { ReactNode } from 'react'
import { Card, Chip } from '@heroui/react'

import {
	formatReplicaState,
	formatSyncStatus,
	getSyncReplicaTone,
	getSyncStatusTone,
	type SyncConfigSource,
	type SyncCredentialState,
	type SyncReplicaState,
	type SyncStatus,
	type SyncStatusPayload,
} from '@/features/sync'
import { cn } from '@/shared/lib/utils'

export function SyncMetricCard({ label, value }: { label: string; value: ReactNode }) {
	return (
		<Card variant='tertiary'>
			<Card.Content>
				<p className='text-[11px] font-medium text-muted'>{label}</p>
				<div className='mt-1 text-sm text-foreground'>{value}</div>
			</Card.Content>
		</Card>
	)
}

export function SyncTimestampValue({
	timestamp,
	emptyLabel = '从未同步',
}: {
	timestamp: string | null
	emptyLabel?: string
}) {
	if (!timestamp) {
		return <span className='text-muted'>{emptyLabel}</span>
	}

	return (
		<div className='flex flex-col gap-1'>
			<span className='font-medium text-foreground'>{formatSyncRelativeTime(timestamp)}</span>
			<span className='text-xs text-muted'>{formatSyncExactTime(timestamp)}</span>
		</div>
	)
}

export function SyncCursorValue({ value }: { value: number | null }) {
	if (value === null) {
		return <span className='text-muted'>未记录</span>
	}

	return <span className='font-medium text-foreground'>{value}</span>
}

export function SyncCountsSummaryValue({
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
			<span className='text-xs text-muted'>总计 {counts.totalItems} 条主数据</span>
		</div>
	)
}

export function SyncStatusBadge({ status }: { status: SyncStatus }) {
	const tone = getSyncStatusTone(status)

	return (
		<Chip color={tone.color} size='sm' variant='soft'>
			<span className={cn('size-2 shrink-0 rounded-full', tone.dotClassName)} />
			<Chip.Label>{formatSyncStatus(status)}</Chip.Label>
		</Chip>
	)
}

export function SyncReplicaBadge({ state }: { state: SyncReplicaState }) {
	const tone = getSyncReplicaTone(state)

	return (
		<Chip color={tone.color} size='sm' variant='soft'>
			<span className={cn('size-2 shrink-0 rounded-full', tone.dotClassName)} />
			<Chip.Label>{formatReplicaState(state)}</Chip.Label>
		</Chip>
	)
}

export function SyncCloudConfigBadge({
	credentialState,
}: {
	credentialState: SyncCredentialState
}) {
	const unavailable = credentialState === 'unavailable'
	const configured = credentialState === 'available'
	const label = unavailable ? '同步凭据不可用' : configured ? '云端副本已配置' : '云端副本未配置'
	return (
		<Chip
			color={unavailable ? 'danger' : configured ? 'success' : 'default'}
			size='sm'
			variant='soft'
		>
			<span
				className={cn(
					'size-2 shrink-0 rounded-full',
					unavailable ? 'bg-danger' : configured ? 'bg-success' : 'bg-default',
				)}
			/>
			<Chip.Label>{label}</Chip.Label>
		</Chip>
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

export function formatSyncPolicySummary(status: SyncStatusPayload | null) {
	if (!status) {
		return '默认每 15 分钟定时同步。'
	}

	if (status.policyMode === 'manual') {
		return '仅手动同步：本地写入会保留为待同步，直到点击「立即同步」。'
	}

	if (status.policyMode === 'on_write') {
		const nextSyncText = status.nextSyncAt
			? `计划同步：${formatSyncExactTime(status.nextSyncAt)}。`
			: '有本地写入后，空闲约 3 秒会自动同步。'
		return `有更新时：停止编辑约 3 秒后自动推送并拉取。${nextSyncText}`
	}

	const nextSyncText = status.nextSyncAt
		? `下次同步：${formatSyncExactTime(status.nextSyncAt)}。`
		: '下次同步会在调度器启动后计算。'
	return `定时：每 ${status.policyIntervalMinutes} 分钟自动同步（到点会 pull）。${nextSyncText}`
}

export function getSyncStatusCopy({
	status,
	dirtySince,
	pendingResync,
	hasRemoteConfig,
	credentialState,
	configSource,
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
	credentialState: SyncCredentialState
	configSource: SyncConfigSource
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
			summary: '正在保存同步数据库连接。保存成功后会立即刷新状态，并清空当前连接串输入。',
			statusDescription: '正在保存新的云端副本配置。',
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

	if (credentialState === 'unavailable') {
		const sourceLabel = configSource === 'system_keychain' ? '系统钥匙串' : '.env.local'
		return {
			title: '同步凭据不可用',
			summary: `无法访问 ${sourceLabel} 中的同步数据库连接。请修复凭据访问后重新打开应用；本地数据不会受影响。`,
			statusDescription: `无法访问 ${sourceLabel} 中的同步凭据。`,
			variant: 'danger' as const,
		}
	}

	if (!hasRemoteConfig || status === 'disabled') {
		if (configSource === 'environment') {
			return {
				title: '尚未配置开发同步',
				summary:
					'在项目根目录 .env.local 设置 STONEFLOW_SYNC_DATABASE_URL 后重启开发应用；连接串不会写入系统钥匙串。',
				statusDescription: '开发构建尚未读取到 .env.local 中的同步连接串。',
				variant: 'default' as const,
			}
		}
		return {
			title: '尚未启用云同步',
			summary: '当前还没有保存可用的同步数据库连接。完成配置前，所有数据只会保留在本地数据库。',
			statusDescription: '未配置云端副本，本机只保留本地数据。',
			variant: 'default' as const,
		}
	}

	if (replicaState === 'baseline_required') {
		return {
			title: '需要首次同步建立基线',
			summary:
				replicaReason ??
				'本机已有数据，但还没有同步序号。点「建立基线并同步」：会把本机数据上传到云端副本，并在不覆盖本机数据的前提下建立同步位置。',
			statusDescription: '首次绑定云端副本后，请点一次「建立基线并同步」。',
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
					'上一轮同步失败了。先检查连接串、网络和云端 Postgres 状态，修正后再触发下一轮同步。',
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
				variant: 'default' as const,
			}
	}
}

export function getSyncErrorTitle(mode: 'push' | 'pull' | 'sync' | null, syncRunning: boolean) {
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

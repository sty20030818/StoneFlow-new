/**
 * Footer 系统状态轨中的更新项（下载进度 / 就绪 / 错误）。
 * idle / checking 时不渲染。
 */

import { useUpdateStore, selectFooterUpdateVisible } from '@/features/update/model/useUpdateStore'
import {
	footerUpdateLabel,
	footerUpdateTitle,
	formatDownloadPercent,
} from '@/features/update/model/updatePresentation'
import { cn } from '@/shared/lib/utils'

export function UpdateStatusFooterItem() {
	const visible = useUpdateStore(selectFooterUpdateVisible)
	const phase = useUpdateStore((s) => s.phase)
	const progress = useUpdateStore((s) => s.progress)
	const updateInfo = useUpdateStore((s) => s.updateInfo)
	const errorMessage = useUpdateStore((s) => s.errorMessage)
	const status = useUpdateStore((s) => s.status)
	const openDialog = useUpdateStore((s) => s.openDialog)

	if (!visible) return null

	const version = status.status === 'downloaded' ? status.version : (updateInfo?.version ?? null)

	const downloaded = progress?.downloaded ?? 0
	const total = progress?.total ?? null
	const label = footerUpdateLabel({
		phase,
		version,
		downloaded,
		total,
		errorMessage,
	})
	const title = footerUpdateTitle({ phase, version, errorMessage })
	const percent = formatDownloadPercent(downloaded, total)
	const ringValue =
		percent !== null ? Math.min(100, Math.round((downloaded / (total ?? 1)) * 100)) : null

	function handleClick() {
		if (
			phase === 'available' ||
			phase === 'ready' ||
			phase === 'error' ||
			phase === 'downloading'
		) {
			openDialog()
		}
	}

	return (
		<button
			type='button'
			title={title}
			aria-label={title}
			onClick={handleClick}
			className={cn(
				'flex min-h-7 items-center gap-1.5 rounded-sm px-0.5',
				'text-[11px] text-sf-shell-text-tertiary transition-colors',
				'hover:text-sf-shell-text-secondary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
			)}
		>
			<span
				className={cn(
					'relative flex size-3.5 shrink-0 items-center justify-center',
					phase === 'ready' && 'text-emerald-600 dark:text-emerald-400',
					phase === 'error' && 'text-red-600 dark:text-red-400',
				)}
				aria-hidden
			>
				<MiniProgressRing phase={phase} value={ringValue} />
			</span>
			<span
				className={cn(
					'max-w-28 truncate tabular-nums',
					phase === 'ready' && 'text-emerald-700 dark:text-emerald-400',
					phase === 'error' && 'text-red-600 dark:text-red-400',
				)}
			>
				{label}
			</span>
		</button>
	)
}

function MiniProgressRing({ phase, value }: { phase: string; value: number | null }) {
	const size = 14
	const stroke = 2
	const r = (size - stroke) / 2
	const c = 2 * Math.PI * r
	const ready = phase === 'ready'
	const error = phase === 'error'
	const downloading = phase === 'downloading'
	const determinate = downloading && value !== null
	const offset = determinate ? c - (value / 100) * c : ready ? 0 : c * 0.75

	return (
		<svg
			width={size}
			height={size}
			viewBox={`0 0 ${size} ${size}`}
			className={cn(downloading && value === null && 'animate-spin')}
			role={downloading ? 'progressbar' : undefined}
			aria-valuenow={determinate ? value : undefined}
			aria-valuemin={downloading ? 0 : undefined}
			aria-valuemax={downloading ? 100 : undefined}
		>
			<circle
				cx={size / 2}
				cy={size / 2}
				r={r}
				fill='none'
				stroke='currentColor'
				strokeWidth={stroke}
				className='opacity-20'
			/>
			<circle
				cx={size / 2}
				cy={size / 2}
				r={r}
				fill='none'
				stroke='currentColor'
				strokeWidth={stroke}
				strokeLinecap='round'
				strokeDasharray={c}
				strokeDashoffset={offset}
				transform={`rotate(-90 ${size / 2} ${size / 2})`}
				className={cn(
					ready && 'opacity-100',
					error && 'opacity-100',
					!ready && !error && 'opacity-70',
					determinate && 'transition-[stroke-dashoffset] duration-200 ease-out',
				)}
			/>
		</svg>
	)
}

/**
 * 更新进度环（Footer / Popover 共用）。
 * 下载中：中性描边进度；无 total 时 indeterminate 慢旋；
 * 就绪：emerald 满环；失败：危险色。
 */

import { cn } from '@/shared/lib/utils'
import type { UpdateUiPhase } from '../model/useUpdateStore'

export type UpdateProgressRingState = Extract<
	UpdateUiPhase,
	'downloading' | 'ready' | 'error' | 'available'
>

type UpdateProgressRingProps = {
	state: UpdateProgressRingState
	/** 0–100；null 表示不确定进度 */
	value: number | null
	size?: number
	strokeWidth?: number
	className?: string
}

export function UpdateProgressRing({
	state,
	value,
	size = 14,
	strokeWidth = 2,
	className,
}: UpdateProgressRingProps) {
	const r = (size - strokeWidth) / 2
	const c = 2 * Math.PI * r
	const ready = state === 'ready'
	const error = state === 'error'
	const downloading = state === 'downloading'
	const available = state === 'available'
	const determinate = downloading && value !== null
	const clamped = determinate ? Math.min(100, Math.max(0, value)) : null

	let offset = c * 0.75
	if (ready) offset = 0
	else if (error) offset = c * 0.35
	else if (available) offset = c * 0.92
	else if (determinate && clamped !== null) offset = c - (clamped / 100) * c

	const indeterminateSpin = downloading && value === null

	return (
		<svg
			width={size}
			height={size}
			viewBox={`0 0 ${size} ${size}`}
			className={cn(indeterminateSpin && 'animate-spin', className)}
			role={downloading ? 'progressbar' : 'img'}
			aria-label={
				ready
					? '更新已就绪'
					: error
						? '更新失败'
						: available
							? '有可用更新'
							: determinate
								? `下载进度 ${clamped}%`
								: '正在下载'
			}
			aria-valuenow={determinate ? (clamped ?? undefined) : undefined}
			aria-valuemin={downloading ? 0 : undefined}
			aria-valuemax={downloading ? 100 : undefined}
		>
			<circle
				cx={size / 2}
				cy={size / 2}
				r={r}
				fill='none'
				stroke='currentColor'
				strokeWidth={strokeWidth}
				className='opacity-20'
			/>
			<circle
				cx={size / 2}
				cy={size / 2}
				r={r}
				fill='none'
				stroke='currentColor'
				strokeWidth={strokeWidth}
				strokeLinecap='round'
				strokeDasharray={c}
				strokeDashoffset={offset}
				transform={`rotate(-90 ${size / 2} ${size / 2})`}
				className={cn(
					ready || error ? 'opacity-100' : 'opacity-70',
					determinate && 'transition-[stroke-dashoffset] duration-200 ease-out',
				)}
			/>
			{ready ? (
				<path
					d={`M ${size * 0.28} ${size * 0.52} L ${size * 0.44} ${size * 0.68} L ${size * 0.74} ${size * 0.34}`}
					fill='none'
					stroke='currentColor'
					strokeWidth={strokeWidth}
					strokeLinecap='round'
					strokeLinejoin='round'
				/>
			) : null}
		</svg>
	)
}

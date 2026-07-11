/**
 * 更新 Footer chip（纯展示）。
 *
 * - available：Badge 提醒感
 * - downloading / ready / error：ShellFooterHit + 进度环
 * 交互统一：整块 → onOpen（开弹窗）
 */

import { DownloadIcon } from 'lucide-react'

import type { UpdateFooterView } from '@/features/update/model/deriveUpdateFooterView'
import { UpdateProgressRing } from '@/features/update/ui/UpdateProgressRing'
import { Badge } from '@/shared/ui/base/badge'
import { ShellFooterHit } from '@/shared/ui/patterns/ShellFooterHit'
import type { ShellFooterHitTone } from '@/shared/ui/patterns/shell-footer'

export type UpdateFooterChipProps = {
	view: UpdateFooterView
	onOpen: () => void
}

function toneForPhase(phase: UpdateFooterView['phase']): ShellFooterHitTone {
	switch (phase) {
		case 'ready':
			return 'success'
		case 'error':
			return 'danger'
		default:
			return 'neutral'
	}
}

export function UpdateFooterChip({ view, onOpen }: UpdateFooterChipProps) {
	// 有更新：Badge 一体提醒
	if (view.phase === 'available') {
		return (
			<Badge
				asChild
				variant='default'
				className='max-w-38 cursor-pointer text-[11px] active:scale-[0.96]'
			>
				<button
					type='button'
					title={view.title}
					aria-label={view.title}
					onClick={onOpen}
				>
					{/* 光学：箭头略偏下 */}
					<DownloadIcon aria-hidden data-icon='inline-start' className='translate-y-px' />
					<span className='min-w-0 truncate'>{view.label}</span>
				</button>
			</Badge>
		)
	}

	const ringState =
		view.phase === 'downloading' || view.phase === 'ready' || view.phase === 'error'
			? view.phase
			: 'downloading'
	const ringValue = view.phase === 'ready' ? 100 : view.ringValue

	return (
		<ShellFooterHit
			label={view.label}
			title={view.title}
			tone={toneForPhase(view.phase)}
			onClick={onOpen}
		>
			<UpdateProgressRing
				state={ringState}
				value={ringValue}
				className={view.phase === 'downloading' ? 'text-foreground/70' : undefined}
			/>
		</ShellFooterHit>
	)
}

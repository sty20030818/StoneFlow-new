/**
 * 更新 Footer chip（纯展示）。
 *
 * - available：Badge 提醒感
 * - downloading / ready：ShellFooterHit + 进度环
 * 交互统一：整块 → onOpen（开弹窗）
 */

import { DownloadIcon } from 'lucide-react'

import type { UpdateFooterView } from '../model/deriveUpdateFooterView'
import { UpdateProgressRing } from './UpdateProgressRing'
import { Badge } from '@/shared/components/base/badge'
import { ShellFooterHit } from '@/shared/components/patterns/ShellFooterHit'
import type { ShellFooterHitTone } from '@/shared/components/patterns/shell-footer'

export type UpdateFooterChipProps = {
	view: UpdateFooterView
	onOpen: () => void
}

function toneForView(view: UpdateFooterView): ShellFooterHitTone {
	if (view.errorMessage) return 'danger'
	return view.phase === 'ready' ? 'success' : 'neutral'
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
				<button type='button' title={view.title} aria-label={view.title} onClick={onOpen}>
					{/* 光学：箭头略偏下 */}
					<DownloadIcon aria-hidden data-icon='inline-start' className='translate-y-px' />
					<span className='min-w-0 truncate'>{view.label}</span>
				</button>
			</Badge>
		)
	}

	const ringState = view.phase === 'ready' ? 'ready' : 'downloading'
	const ringValue = view.phase === 'ready' ? 100 : view.ringValue

	return (
		<ShellFooterHit label={view.label} title={view.title} tone={toneForView(view)} onClick={onOpen}>
			<UpdateProgressRing
				state={ringState}
				value={ringValue}
				className={view.phase === 'downloading' ? 'text-foreground/70' : undefined}
			/>
		</ShellFooterHit>
	)
}

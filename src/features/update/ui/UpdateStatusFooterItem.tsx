/**
 * Footer 右侧更新事务 · explicit phase variants。
 * idle/checking 不渲染（只留版本号）。
 *
 * 统一交互：整块只负责开弹窗（下载 / 重启 / 跳过都在弹窗里完成）。
 * available：Badge；downloading / ready / error：指示 + 文案一体可点。
 */

import { DownloadIcon } from 'lucide-react'

import {
	deriveUpdateFooterView,
	type UpdateFooterView,
} from '@/features/update/model/deriveUpdateFooterView'
import { useUpdateStore } from '@/features/update/model/useUpdateStore'
import { UpdateProgressRing } from '@/features/update/ui/UpdateProgressRing'
import { Badge } from '@/shared/ui/base/badge'
import { cn } from '@/shared/lib/utils'

/** Footer 事务态共用的一体可点样式 */
const footerHitClass = cn(
	'inline-flex min-w-0 max-w-40 items-center gap-1.5 rounded-md',
	'text-[11px] leading-none tabular-nums',
	'transition-[color,background-color,transform]',
	'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
	'active:scale-[0.96]',
)

export function UpdateStatusFooterItem() {
	const phase = useUpdateStore((s) => s.phase)
	const progress = useUpdateStore((s) => s.progress)
	const updateInfo = useUpdateStore((s) => s.updateInfo)
	const errorMessage = useUpdateStore((s) => s.errorMessage)
	const openDialog = useUpdateStore((s) => s.openDialog)

	const view = deriveUpdateFooterView({
		phase,
		version: updateInfo?.version ?? null,
		downloaded: progress?.downloaded ?? 0,
		total: progress?.total ?? null,
		errorMessage,
	})

	if (!view) return null

	switch (view.phase) {
		case 'downloading':
			return <UpdateDownloadingFooter view={view} onOpen={openDialog} />
		case 'ready':
			return <UpdateReadyFooter view={view} onOpen={openDialog} />
		case 'available':
			return <UpdateAvailableFooter view={view} onOpen={openDialog} />
		case 'error':
			return <UpdateErrorFooter view={view} onOpen={openDialog} />
	}
}

/** 下载中：环 + 百分比一体，点开弹窗 */
function UpdateDownloadingFooter({
	view,
	onOpen,
}: {
	view: UpdateFooterView
	onOpen: () => void
}) {
	return (
		<button
			type='button'
			title={view.title}
			aria-label={view.title}
			onClick={onOpen}
			className={cn(
				footerHitClass,
				'text-sf-shell-text-tertiary',
				'hover:bg-muted/50 hover:text-sf-shell-text-secondary',
			)}
		>
			<span
				className='relative flex size-3.5 shrink-0 items-center justify-center text-foreground/70'
				aria-hidden
			>
				<UpdateProgressRing state='downloading' value={view.ringValue} />
			</span>
			<span className='min-w-0 truncate'>{view.label}</span>
		</button>
	)
}

/** 就绪：环 + 文案一体，点开弹窗（重启只在弹窗 / 悬浮栏） */
function UpdateReadyFooter({
	view,
	onOpen,
}: {
	view: UpdateFooterView
	onOpen: () => void
}) {
	return (
		<button
			type='button'
			title={view.title}
			aria-label={view.title}
			onClick={onOpen}
			className={cn(
				footerHitClass,
				'text-emerald-700 dark:text-emerald-400',
				'hover:bg-emerald-500/10',
			)}
		>
			<span
				className='relative flex size-3.5 shrink-0 items-center justify-center'
				aria-hidden
			>
				<UpdateProgressRing state='ready' value={100} />
			</span>
			<span className='min-w-0 truncate'>{view.label}</span>
		</button>
	)
}

/** 有更新：Badge 一体提醒，点开弹窗 */
function UpdateAvailableFooter({
	view,
	onOpen,
}: {
	view: UpdateFooterView
	onOpen: () => void
}) {
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

/** 失败：环 + 文案一体，点开弹窗 */
function UpdateErrorFooter({
	view,
	onOpen,
}: {
	view: UpdateFooterView
	onOpen: () => void
}) {
	return (
		<button
			type='button'
			title={view.title}
			aria-label={view.title}
			onClick={onOpen}
			className={cn(
				footerHitClass,
				'text-red-600 dark:text-red-400',
				'hover:bg-red-500/10 hover:text-red-700 dark:hover:text-red-300',
			)}
		>
			<span
				className='relative flex size-3.5 shrink-0 items-center justify-center'
				aria-hidden
			>
				<UpdateProgressRing state='error' value={null} />
			</span>
			<span className='min-w-0 truncate'>{view.label}</span>
		</button>
	)
}

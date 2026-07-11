/**
 * Footer 右侧更新事务 · explicit phase variants。
 * idle/checking 不渲染（只留版本号）。
 *
 * available：shadcn Badge（↓ 有更新）—— 单纯提醒，点击开弹窗
 * downloading / ready / error：指示 + 文案轨
 */

import { DownloadIcon, RefreshCwIcon } from 'lucide-react'

import {
	deriveUpdateFooterView,
	type UpdateFooterView,
} from '@/features/update/model/deriveUpdateFooterView'
import { useUpdateActions } from '@/features/update/model/useUpdateEvents'
import { useUpdateStore } from '@/features/update/model/useUpdateStore'
import { UpdateProgressRing } from '@/features/update/ui/UpdateProgressRing'
import { Badge } from '@/shared/ui/base/badge'
import { ShellFooterStatus } from '@/shared/ui/patterns/ShellFooterStatus'
import { cn } from '@/shared/lib/utils'

export function UpdateStatusFooterItem() {
	const phase = useUpdateStore((s) => s.phase)
	const progress = useUpdateStore((s) => s.progress)
	const updateInfo = useUpdateStore((s) => s.updateInfo)
	const errorMessage = useUpdateStore((s) => s.errorMessage)
	const openDialog = useUpdateStore((s) => s.openDialog)
	const { restart } = useUpdateActions()

	const view = deriveUpdateFooterView({
		phase,
		version: updateInfo?.version ?? null,
		downloaded: progress?.downloaded ?? 0,
		total: progress?.total ?? null,
		errorMessage,
	})

	if (!view) return null

	const actions: UpdateFooterActions = {
		openDialog,
		restart,
	}

	switch (view.phase) {
		case 'downloading':
			return <UpdateDownloadingFooter view={view} actions={actions} />
		case 'ready':
			return <UpdateReadyFooter view={view} actions={actions} />
		case 'available':
			return <UpdateAvailableFooter view={view} actions={actions} />
		case 'error':
			return <UpdateErrorFooter view={view} actions={actions} />
	}
}

type UpdateFooterActions = {
	openDialog: () => void
	restart: () => Promise<void> | void
}

function ringToneClass(phase: UpdateFooterView['phase']) {
	return cn(
		phase === 'ready' && 'text-emerald-600 dark:text-emerald-400',
		phase === 'error' && 'text-red-600 dark:text-red-400',
		phase === 'downloading' && 'text-foreground/70',
	)
}

function UpdateRing({ view }: { view: UpdateFooterView }) {
	const ringState =
		view.phase === 'available' ? 'downloading' : view.phase

	return (
		<ShellFooterStatus.Indicator className={ringToneClass(view.phase)} aria-hidden>
			<UpdateProgressRing
				state={ringState}
				value={view.phase === 'ready' ? 100 : view.ringValue}
			/>
		</ShellFooterStatus.Indicator>
	)
}

/** 下载中：进度环 + 文案（点开弹窗看进度 / 取消） */
function UpdateDownloadingFooter({
	view,
	actions,
}: {
	view: UpdateFooterView
	actions: UpdateFooterActions
}) {
	return (
		<ShellFooterStatus.Root>
			<UpdateRing view={view} />
			<ShellFooterStatus.InteractiveLabel
				title={view.title}
				aria-label={view.title}
				onClick={() => actions.openDialog()}
			>
				{view.label}
			</ShellFooterStatus.InteractiveLabel>
		</ShellFooterStatus.Root>
	)
}

/** 就绪：环 · 只读文案 · 独立重启 */
function UpdateReadyFooter({
	view,
	actions,
}: {
	view: UpdateFooterView
	actions: UpdateFooterActions
}) {
	return (
		<ShellFooterStatus.Root>
			<UpdateRing view={view} />
			<ShellFooterStatus.StaticLabel
				className='max-w-32 text-emerald-700 dark:text-emerald-400'
				title={view.title}
			>
				{view.label}
			</ShellFooterStatus.StaticLabel>
			<ShellFooterStatus.IconButton
				className='text-emerald-700 dark:text-emerald-400'
				aria-label='立即重启以安装更新'
				title='立即重启'
				onClick={() => void actions.restart()}
			>
				<RefreshCwIcon aria-hidden className='size-3' />
			</ShellFooterStatus.IconButton>
		</ShellFooterStatus.Root>
	)
}

/**
 * 有更新：shadcn Badge 一体提醒，点击开弹窗。
 * asChild → button，保证可键盘聚焦与语义正确。
 */
function UpdateAvailableFooter({
	view,
	actions,
}: {
	view: UpdateFooterView
	actions: UpdateFooterActions
}) {
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
				onClick={() => actions.openDialog()}
			>
				{/* 光学：箭头略偏下 */}
				<DownloadIcon aria-hidden data-icon='inline-start' className='translate-y-px' />
				<span className='min-w-0 truncate'>{view.label}</span>
			</button>
		</Badge>
	)
}

/** 失败：环 + 可点文案打开对话框 */
function UpdateErrorFooter({
	view,
	actions,
}: {
	view: UpdateFooterView
	actions: UpdateFooterActions
}) {
	return (
		<ShellFooterStatus.Root>
			<UpdateRing view={view} />
			<ShellFooterStatus.InteractiveLabel
				className='text-red-600 hover:text-red-700 dark:text-red-400'
				title={view.title}
				aria-label={view.title}
				onClick={() => actions.openDialog()}
			>
				{view.label}
			</ShellFooterStatus.InteractiveLabel>
		</ShellFooterStatus.Root>
	)
}

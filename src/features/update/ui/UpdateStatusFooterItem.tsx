/**
 * Footer 右侧更新事务 · explicit phase variants。
 * idle/checking 不渲染（只留版本号）。
 *
 * 布局零件：ShellFooterStatus（环 / 文案 / 动作分离）
 * 数据：deriveUpdateFooterView + store / actions
 */

import { useState } from 'react'
import { RefreshCwIcon } from 'lucide-react'

import { skipVersion } from '@/features/update/api/updates'
import {
	deriveUpdateFooterView,
	type UpdateFooterView,
} from '@/features/update/model/deriveUpdateFooterView'
import { formatDownloadBytesLine } from '@/features/update/model/updatePresentation'
import { useUpdateActions } from '@/features/update/model/useUpdateEvents'
import { useUpdateStore } from '@/features/update/model/useUpdateStore'
import { UpdateProgressRing } from '@/features/update/ui/UpdateProgressRing'
import { Button } from '@/shared/ui/base/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/base/popover'
import { ShellFooterStatus } from '@/shared/ui/patterns/ShellFooterStatus'
import { cn } from '@/shared/lib/utils'

export function UpdateStatusFooterItem() {
	const phase = useUpdateStore((s) => s.phase)
	const progress = useUpdateStore((s) => s.progress)
	const updateInfo = useUpdateStore((s) => s.updateInfo)
	const errorMessage = useUpdateStore((s) => s.errorMessage)
	const openDialog = useUpdateStore((s) => s.openDialog)
	const skipAndClose = useUpdateStore((s) => s.skipAndClose)
	const { restart, cancelDownloadUi } = useUpdateActions()

	const view = deriveUpdateFooterView({
		phase,
		version: updateInfo?.version ?? null,
		downloaded: progress?.downloaded ?? 0,
		total: progress?.total ?? null,
		errorMessage,
	})

	if (!view) return null

	const actions: UpdateFooterActions = {
		version: updateInfo?.version ?? null,
		openDialog,
		skipAndClose,
		restart,
		cancelDownloadUi,
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
	version: string | null
	openDialog: () => void
	skipAndClose: () => void
	restart: () => Promise<void> | void
	cancelDownloadUi: () => Promise<void> | void
}

function ringToneClass(phase: UpdateFooterView['phase']) {
	return cn(
		phase === 'ready' && 'text-emerald-600 dark:text-emerald-400',
		phase === 'error' && 'text-red-600 dark:text-red-400',
		phase === 'downloading' && 'text-foreground/70',
		phase === 'available' && 'text-foreground/55',
	)
}

function UpdateRing({ view }: { view: UpdateFooterView }) {
	return (
		<ShellFooterStatus.Indicator className={ringToneClass(view.phase)} aria-hidden>
			<UpdateProgressRing
				state={view.ringState}
				value={view.phase === 'ready' ? 100 : view.ringValue}
			/>
		</ShellFooterStatus.Indicator>
	)
}

/** 下载中：环 + 可点文案（popover 取消） */
function UpdateDownloadingFooter({
	view,
	actions,
}: {
	view: UpdateFooterView
	actions: UpdateFooterActions
}) {
	const [open, setOpen] = useState(false)
	const ringValue = view.ringValue

	return (
		<ShellFooterStatus.Root>
			<UpdateRing view={view} />
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<ShellFooterStatus.InteractiveLabel title={view.title} aria-label={view.title}>
						{view.label}
					</ShellFooterStatus.InteractiveLabel>
				</PopoverTrigger>
				<PopoverContent align='end' side='top' sideOffset={8} className='w-72 space-y-3 p-3'>
					<div className='space-y-1'>
						<p className='text-[13px] font-medium text-foreground'>
							{view.version ? `正在下载 ${view.version}` : '正在下载更新'}
						</p>
						<p className='text-[12px] tabular-nums text-muted-foreground'>
							{formatDownloadBytesLine(view.downloaded, view.total)}
						</p>
					</div>
					<div className='h-1.5 w-full overflow-hidden rounded-full bg-muted'>
						<div
							className='h-full rounded-full bg-primary transition-[width] duration-200 ease-out'
							style={{
								width:
									view.total !== null && view.total > 0 ? `${ringValue ?? 0}%` : undefined,
							}}
						/>
					</div>
					<p className='text-[11px] text-muted-foreground'>
						取消将中断下载并断开网络；可稍后重新下载。
					</p>
					<div className='flex justify-end gap-2'>
						<Button
							type='button'
							size='sm'
							variant='ghost'
							onClick={() => {
								void actions.cancelDownloadUi()
								setOpen(false)
							}}
						>
							取消下载
						</Button>
						<Button type='button' size='sm' variant='secondary' onClick={() => setOpen(false)}>
							后台继续
						</Button>
					</div>
				</PopoverContent>
			</Popover>
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

/** 有更新：环 + 可点文案（popover 跳过/查看） */
function UpdateAvailableFooter({
	view,
	actions,
}: {
	view: UpdateFooterView
	actions: UpdateFooterActions
}) {
	const [open, setOpen] = useState(false)

	async function handleSkip() {
		if (actions.version) {
			try {
				await skipVersion(actions.version)
			} catch (err) {
				console.error('Failed to skip version:', err)
			}
		}
		actions.skipAndClose()
		setOpen(false)
	}

	return (
		<ShellFooterStatus.Root>
			<UpdateRing view={view} />
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<ShellFooterStatus.InteractiveLabel title={view.title} aria-label={view.title}>
						{view.label}
					</ShellFooterStatus.InteractiveLabel>
				</PopoverTrigger>
				<PopoverContent align='end' side='top' sideOffset={8} className='w-64 space-y-3 p-3'>
					<p className='text-[13px] font-medium text-foreground'>
						{view.version ? `发现新版本 ${view.version}` : '发现新版本'}
					</p>
					<div className='flex justify-end gap-2'>
						<Button type='button' size='sm' variant='ghost' onClick={() => void handleSkip()}>
							跳过
						</Button>
						<Button
							type='button'
							size='sm'
							onClick={() => {
								setOpen(false)
								actions.openDialog()
							}}
						>
							查看
						</Button>
					</div>
				</PopoverContent>
			</Popover>
		</ShellFooterStatus.Root>
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


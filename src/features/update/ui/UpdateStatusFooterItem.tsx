/**
 * Footer 系统状态轨中的更新项（下载进度 / 就绪 / 错误）。
 * idle / checking 时不渲染。
 * 下载中：Popover 详情 + 取消 UI；就绪/发现：可打开 Dialog 或点就绪操作。
 */

import { useState } from 'react'

import { skipVersion } from '@/features/update/api/updates'
import {
	formatDownloadBytesLine,
	footerUpdateLabel,
	footerUpdateTitle,
	formatDownloadPercent,
} from '@/features/update/model/updatePresentation'
import { useUpdateActions } from '@/features/update/model/useUpdateEvents'
import {
	selectFooterUpdateVisible,
	useUpdateStore,
} from '@/features/update/model/useUpdateStore'
import { UpdateProgressRing } from '@/features/update/ui/UpdateProgressRing'
import { Button } from '@/shared/ui/base/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/base/popover'
import { cn } from '@/shared/lib/utils'

export function UpdateStatusFooterItem() {
	const visible = useUpdateStore(selectFooterUpdateVisible)
	const phase = useUpdateStore((s) => s.phase)
	const progress = useUpdateStore((s) => s.progress)
	const updateInfo = useUpdateStore((s) => s.updateInfo)
	const errorMessage = useUpdateStore((s) => s.errorMessage)
	const openDialog = useUpdateStore((s) => s.openDialog)
	const skipAndClose = useUpdateStore((s) => s.skipAndClose)
	const { restart, cancelDownloadUi } = useUpdateActions()
	const [popoverOpen, setPopoverOpen] = useState(false)

	if (!visible) return null

	const version = updateInfo?.version ?? null

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

	const ringState =
		phase === 'downloading' || phase === 'ready' || phase === 'error' || phase === 'available'
			? phase
			: 'available'

	async function handleSkip() {
		if (updateInfo) {
			try {
				await skipVersion(updateInfo.version)
			} catch (err) {
				console.error('Failed to skip version:', err)
			}
		}
		skipAndClose()
		setPopoverOpen(false)
	}

	const triggerClass = cn(
		'flex min-h-7 items-center gap-1.5 rounded-sm px-0.5',
		'text-[11px] text-sf-shell-text-tertiary transition-colors',
		'hover:text-sf-shell-text-secondary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
	)

	const ringClass = cn(
		'relative flex size-3.5 shrink-0 items-center justify-center',
		phase === 'ready' && 'text-emerald-600 dark:text-emerald-400',
		phase === 'error' && 'text-red-600 dark:text-red-400',
		phase === 'downloading' && 'text-foreground/70',
		phase === 'available' && 'text-foreground/55',
	)

	const labelClass = cn(
		'max-w-28 truncate tabular-nums',
		phase === 'ready' && 'text-emerald-700 dark:text-emerald-400',
		phase === 'error' && 'text-red-600 dark:text-red-400',
	)

	const ringAndLabel = (
		<>
			<span className={ringClass} aria-hidden={phase === 'downloading' ? undefined : true}>
				<UpdateProgressRing state={ringState} value={ringValue} />
			</span>
			<span className={labelClass}>{label}</span>
		</>
	)

	// 下载中：Popover 详情
	if (phase === 'downloading') {
		return (
			<Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
				<PopoverTrigger asChild>
					<button type='button' title={title} aria-label={title} className={triggerClass}>
						{ringAndLabel}
					</button>
				</PopoverTrigger>
				<PopoverContent
					align='start'
					side='top'
					sideOffset={8}
					className='w-72 space-y-3 p-3'
				>
					<div className='space-y-1'>
						<p className='text-[13px] font-medium text-foreground'>
							{version ? `正在下载 ${version}` : '正在下载更新'}
						</p>
						<p className='text-[12px] tabular-nums text-muted-foreground'>
							{formatDownloadBytesLine(downloaded, total)}
						</p>
					</div>
					<div className='h-1.5 w-full overflow-hidden rounded-full bg-muted'>
						<div
							className='h-full rounded-full bg-primary transition-[width] duration-200 ease-out'
							style={{
								width: total !== null && total > 0 ? `${ringValue ?? 0}%` : undefined,
							}}
						/>
					</div>
					{updateInfo?.body ? (
						<p className='line-clamp-3 text-[12px] leading-5 text-muted-foreground'>
							{updateInfo.body}
						</p>
					) : null}
					<p className='text-[11px] text-muted-foreground'>
						取消将中断下载并断开网络；可稍后重新下载。
					</p>
					<div className='flex justify-end gap-2'>
						<Button
							type='button'
							size='sm'
							variant='ghost'
							onClick={() => {
								void cancelDownloadUi()
								setPopoverOpen(false)
							}}
						>
							取消下载
						</Button>
						<Button
							type='button'
							size='sm'
							variant='secondary'
							onClick={() => setPopoverOpen(false)}
						>
							后台继续
						</Button>
					</div>
				</PopoverContent>
			</Popover>
		)
	}

	// 就绪：Popover 快速重启
	if (phase === 'ready') {
		return (
			<Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
				<PopoverTrigger asChild>
					<button type='button' title={title} aria-label={title} className={triggerClass}>
						{ringAndLabel}
					</button>
				</PopoverTrigger>
				<PopoverContent align='start' side='top' sideOffset={8} className='w-64 space-y-3 p-3'>
					<p className='text-[13px] font-medium text-foreground'>
						{version ? `v${version} 已就绪` : '更新已就绪'}
					</p>
					<p className='text-[12px] text-muted-foreground'>重启后生效。未保存的工作请先保存。</p>
					<div className='flex justify-end gap-2'>
						<Button
							type='button'
							size='sm'
							variant='ghost'
							onClick={() => setPopoverOpen(false)}
						>
							稍后
						</Button>
						<Button
							type='button'
							size='sm'
							onClick={() => {
								setPopoverOpen(false)
								void restart()
							}}
						>
							立即重启
						</Button>
					</div>
				</PopoverContent>
			</Popover>
		)
	}

	// 有更新 / 错误：打开 Dialog 或跳过
	if (phase === 'available') {
		return (
			<Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
				<PopoverTrigger asChild>
					<button type='button' title={title} aria-label={title} className={triggerClass}>
						{ringAndLabel}
					</button>
				</PopoverTrigger>
				<PopoverContent align='start' side='top' sideOffset={8} className='w-64 space-y-3 p-3'>
					<p className='text-[13px] font-medium text-foreground'>
						{version ? `发现新版本 ${version}` : '发现新版本'}
					</p>
					<div className='flex justify-end gap-2'>
						<Button type='button' size='sm' variant='ghost' onClick={() => void handleSkip()}>
							跳过
						</Button>
						<Button
							type='button'
							size='sm'
							onClick={() => {
								setPopoverOpen(false)
								openDialog()
							}}
						>
							查看
						</Button>
					</div>
				</PopoverContent>
			</Popover>
		)
	}

	// error
	return (
		<button
			type='button'
			title={title}
			aria-label={title}
			onClick={() => openDialog()}
			className={triggerClass}
		>
			{ringAndLabel}
		</button>
	)
}

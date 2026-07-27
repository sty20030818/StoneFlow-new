/**
 * UpdateDialog 容器：store / 动作接线与相位编排。
 * 壳层复用 create-dialog compact；changelog 见 UpdateDialog.presentation。
 */

import { DownloadIcon, RefreshCwIcon, XIcon } from 'lucide-react'

import { Button } from '@/shared/components/base/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from '@/shared/components/base/dialog'
import {
	createDialogCompactShellClass,
	createDialogFooterClass,
	createDialogHeaderClass,
} from '@/shared/components/patterns/create-dialog'
import {
	dialogShellDescriptionClass,
	dialogShellTitleClass,
} from '@/shared/components/patterns/dialog-shell'
import { StatusNotice } from '@/shared/components/StatusNotice'
import { cn } from '@/shared/lib/utils'
import { skipVersion } from '../api/updates'
import { useUpdateStore } from '../model/useUpdateStore'
import { useUpdateActions } from '../model/useUpdateEvents'
import { downloadProgressBarValue, formatDownloadBytesLine } from '../model/updatePresentation'
import { UpdateNotesMarkdown } from './UpdateDialog.presentation'

export function UpdateDialog() {
	const dialogVisible = useUpdateStore((s) => s.dialogVisible)
	const updateInfo = useUpdateStore((s) => s.updateInfo)
	const phase = useUpdateStore((s) => s.phase)
	const progress = useUpdateStore((s) => s.progress)
	const errorMessage = useUpdateStore((s) => s.errorMessage)
	const closeDialog = useUpdateStore((s) => s.closeDialog)
	const skipAndClose = useUpdateStore((s) => s.skipAndClose)
	const { startDownload, restart, cancelDownloadUi } = useUpdateActions()

	function handleOpenChange(nextOpen: boolean) {
		if (!nextOpen) closeDialog()
	}

	async function handleSkip() {
		if (updateInfo) {
			try {
				await skipVersion(updateInfo.version)
			} catch (err) {
				console.error('Failed to skip version:', err)
			}
		}
		skipAndClose()
	}

	const isDownloading = phase === 'downloading'
	const isReady = phase === 'ready'
	const isError = phase === 'error'
	const isChecking = phase === 'checking'
	const canDownload = phase === 'available' || phase === 'idle' || phase === 'upToDate' || isError

	const downloaded = progress?.downloaded ?? 0
	const total = progress?.total ?? null
	// 无 total 时必须给 0，禁止 width:undefined（块级条会撑满成「100%」）
	const progressPercent = isDownloading ? downloadProgressBarValue(downloaded, total) : 0

	const displayVersion = updateInfo?.version ?? ''
	const showNotes = !isDownloading && !isReady && Boolean(updateInfo?.body)
	const showBody = showNotes || isDownloading || isReady || isError

	const titleText = isReady
		? '更新已下载，等待安装'
		: isDownloading
			? '正在下载更新'
			: isError
				? '更新失败'
				: isChecking
					? '正在检查更新'
					: `发现新版本 ${displayVersion}`

	const descText = isReady
		? `版本 ${displayVersion} 已下载完成。点击「立即重启」才会安装；关闭应用或稍后再说都不会自动安装。`
		: isDownloading
			? '正在下载更新文件。整段进度可点回此窗口；取消后可重新下载。'
			: isError
				? (errorMessage ?? '更新失败')
				: isChecking
					? '正在检查更新...'
					: '建议及时更新以获得最新功能和问题修复。'

	return (
		<Dialog onOpenChange={handleOpenChange} open={dialogVisible}>
			{/*
			 * 对齐创建任务/项目弹窗（CreateDialogShell）：
			 * - 外壳 p-0，分区自管 padding
			 * - 关闭钮在 header 行内 size-7（不是 absolute top-2 贴边）
			 * - 底栏复用 createDialogFooterClass
			 */}
			<DialogContent
				className={createDialogCompactShellClass}
				showCloseButton={false}
				disableAnimation
			>
				<DialogTitle className='sr-only'>{titleText}</DialogTitle>
				<DialogDescription className='sr-only'>{descText}</DialogDescription>

				<div className={cn(createDialogHeaderClass, 'items-start gap-2')}>
					<div className='min-w-0 flex-1 space-y-1'>
						<h2 className={dialogShellTitleClass}>{titleText}</h2>
						<p className={dialogShellDescriptionClass}>{descText}</p>
					</div>
					<Button
						type='button'
						variant='ghost'
						size='icon-sm'
						className='size-7 shrink-0 text-sf-icon-secondary'
						aria-label='关闭'
						onClick={closeDialog}
					>
						<XIcon className='size-3.5' aria-hidden />
					</Button>
				</div>

				{showBody ? (
					<div className='min-h-0 space-y-3 px-3'>
						{showNotes && updateInfo?.body ? (
							<div className='rounded-xl bg-muted p-3'>
								<UpdateNotesMarkdown content={updateInfo.body} />
							</div>
						) : null}

						{isDownloading ? (
							<div className='space-y-2'>
								<div className='h-1.5 w-full overflow-hidden rounded-full bg-muted'>
									<div
										className='h-full rounded-full bg-primary transition-[width] duration-200 ease-out'
										style={{ width: `${progressPercent}%` }}
									/>
								</div>
								<p className='text-[12px] leading-none text-sf-shell-text-tertiary tabular-nums'>
									{formatDownloadBytesLine(downloaded, total)}
								</p>
							</div>
						) : null}

						{isReady ? (
							<StatusNotice
								size='sm'
								variant='success'
								description='安装包已就绪。只有点击「立即重启」才会开始安装并退出当前进程。'
							/>
						) : null}

						{isError ? (
							<StatusNotice size='sm' variant='danger' description={errorMessage} />
						) : null}
					</div>
				) : null}

				<div className={cn(createDialogFooterClass, 'justify-end')}>
					{isReady ? (
						<>
							<Button onClick={closeDialog} size='sm' type='button' variant='ghost'>
								稍后重启
							</Button>
							<Button onClick={restart} size='sm' type='button'>
								<RefreshCwIcon aria-hidden className='-ml-0.5 mr-1 size-3.5' />
								立即重启
							</Button>
						</>
					) : isDownloading ? (
						<>
							{/* 取消下载单独靠左，远离右侧主操作，降低误触 */}
							<Button
								onClick={() => void cancelDownloadUi()}
								size='sm'
								type='button'
								variant='ghost'
								className='mr-auto text-muted-foreground'
							>
								取消下载
							</Button>
							<Button onClick={closeDialog} size='sm' type='button' variant='ghost'>
								后台继续
							</Button>
							<Button disabled size='sm' type='button'>
								<span
									aria-hidden
									className='-ml-0.5 mr-2 size-3 animate-spin rounded-full border-2 border-current border-t-transparent'
								/>
								下载中
							</Button>
						</>
					) : (
						<>
							<Button
								disabled={isChecking}
								onClick={handleSkip}
								size='sm'
								type='button'
								variant='ghost'
							>
								跳过此版本
							</Button>
							<Button
								disabled={!canDownload || isChecking}
								onClick={() => void startDownload()}
								size='sm'
								type='button'
							>
								<DownloadIcon aria-hidden className='-ml-0.5 mr-1 size-3.5' />
								{isChecking ? '检查中...' : '立即更新'}
							</Button>
						</>
					)}
				</div>
			</DialogContent>
		</Dialog>
	)
}

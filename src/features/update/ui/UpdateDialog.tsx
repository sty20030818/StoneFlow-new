/**
 * 更新弹窗：仅提醒 / 手动路径的决策与进度。
 * 状态只读 phase 单轨（无 UpdateStatus）。
 */

import type { ReactNode } from 'react'
import { DownloadIcon, RefreshCwIcon, XIcon } from 'lucide-react'

import { Button } from '@/shared/ui/base/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/shared/ui/base/dialog'
import { cn } from '@/shared/lib/utils'
import { skipVersion } from '@/features/update/api/updates'
import { useUpdateStore } from '@/features/update/model/useUpdateStore'
import { useUpdateActions } from '@/features/update/model/useUpdateEvents'
import {
	downloadProgressBarValue,
	formatDownloadBytesLine,
} from '@/features/update/model/updatePresentation'

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
			 * - 底栏 px-3 pb-3 pt-2（createDialogFooterClass）
			 */}
			<DialogContent className={dialogContentClass} showCloseButton={false} disableAnimation>
				<DialogTitle className='sr-only'>{titleText}</DialogTitle>
				<DialogDescription className='sr-only'>{descText}</DialogDescription>

				{/* Header：p-3，关闭与标题同一行 — 对齐 createDialogHeaderClass */}
				<div className={headerClass}>
					<div className='min-w-0 flex-1 space-y-1'>
						<h2 className={titleClass}>{titleText}</h2>
						<p className={descClass}>{descText}</p>
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
					<div className={bodyClass}>
						{showNotes && updateInfo?.body ? (
							<div className={notesCardClass}>
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
								<p className='text-[12px] leading-none text-sf-shell-tertiary tabular-nums'>
									{formatDownloadBytesLine(downloaded, total)}
								</p>
							</div>
						) : null}

						{isReady ? (
							<div className={successCardClass}>
								<p className='text-[13px] leading-5 text-green-700 dark:text-green-300'>
									安装包已就绪。只有点击「立即重启」才会开始安装并退出当前进程。
								</p>
							</div>
						) : null}

						{isError ? (
							<div className={errorCardClass}>
								<p className='text-[13px] leading-5 text-red-700 dark:text-red-300'>
									{errorMessage}
								</p>
							</div>
						) : null}
					</div>
				) : null}

				{/* Footer：对齐 createDialogFooterClass = px-3 pb-3 pt-2 */}
				<div className={footerClass}>
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

/** 外壳 p-0，分区自管边距（对齐 CreateDialogShell） */
const dialogContentClass = cn(
	'flex flex-col gap-0 overflow-hidden rounded-3xl border border-border p-0',
	'shadow-(--sf-shadow-float) top-[15dvh] translate-y-0',
	'max-w-[calc(100%-1.5rem)] sm:max-w-md',
)

/** 对齐 createDialogHeaderClass：p-3 + 右侧关闭 */
const headerClass = 'flex shrink-0 items-start justify-between gap-2 p-3'
const titleClass = 'text-[15px] font-semibold leading-tight text-foreground'
const descClass = 'text-[13px] leading-5 text-sf-shell-tertiary'
/** 内容区左右与 header/footer 对齐 px-3 */
const bodyClass = 'min-h-0 space-y-3 px-3'
/** 对齐 createDialogFooterClass */
const footerClass = 'flex shrink-0 items-center justify-end gap-2 px-3 pb-3 pt-2'
const notesCardClass = 'rounded-xl bg-muted p-3'
const successCardClass =
	'rounded-xl border border-green-200/60 bg-green-50/60 p-3 dark:border-green-900/30 dark:bg-green-950/20'
const errorCardClass =
	'rounded-xl border border-red-200/60 bg-red-50/60 p-3 dark:border-red-900/30 dark:bg-red-950/20'

function UpdateNotesMarkdown({ content }: { content: string }) {
	const blocks = parseSimpleMarkdown(content)
	return (
		<div className='text-[13px] leading-6 text-foreground space-y-2.5'>
			{blocks.map((block, i) => {
				if (block.type === 'h2') {
					return (
						<h3 key={i} className='text-[14px] font-semibold text-foreground m-0'>
							{renderInline(block.text)}
						</h3>
					)
				}
				if (block.type === 'h3') {
					return (
						<h4 key={i} className='text-[13px] font-semibold text-foreground m-0'>
							{renderInline(block.text)}
						</h4>
					)
				}
				if (block.type === 'list') {
					return (
						<ul key={i} className='list-none m-0 p-0 space-y-1'>
							{block.items.map((item, j) => (
								<li key={j} className='flex items-start gap-2'>
									<span className='mt-2.25 size-1 shrink-0 rounded-full bg-foreground/40' />
									<span className='text-sf-shell-tertiary'>{renderInline(item)}</span>
								</li>
							))}
						</ul>
					)
				}
				return (
					<p key={i} className='m-0 text-sf-shell-tertiary'>
						{renderInline(block.text)}
					</p>
				)
			})}
		</div>
	)
}

function parseSimpleMarkdown(content: string): MarkdownBlock[] {
	const lines = content.split('\n')
	const blocks: MarkdownBlock[] = []
	let listItems: string[] = []
	let paragraph: string[] = []

	function flushParagraph() {
		if (paragraph.length > 0) {
			blocks.push({ type: 'p', text: paragraph.join(' ').trim() })
			paragraph = []
		}
	}
	function flushList() {
		if (listItems.length > 0) {
			blocks.push({ type: 'list', items: listItems })
			listItems = []
		}
	}

	for (const rawLine of lines) {
		const line = rawLine.trimEnd()
		if (line.startsWith('## ')) {
			flushParagraph()
			flushList()
			blocks.push({ type: 'h2', text: line.slice(3).trim() })
			continue
		}
		if (line.startsWith('### ')) {
			flushParagraph()
			flushList()
			blocks.push({ type: 'h3', text: line.slice(4).trim() })
			continue
		}
		if (line.startsWith('- ') || line.startsWith('* ')) {
			flushParagraph()
			listItems.push(line.slice(2).trim())
			continue
		}
		if (line.trim() === '') {
			flushParagraph()
			flushList()
			continue
		}
		flushList()
		paragraph.push(line.trim())
	}
	flushParagraph()
	flushList()
	return blocks
}

function renderInline(text: string): ReactNode {
	const parts: ReactNode[] = []
	const regex = /\*\*(.+?)\*\*/g
	let lastIndex = 0
	let match: RegExpExecArray | null
	let key = 0
	while ((match = regex.exec(text)) !== null) {
		if (match.index > lastIndex) {
			parts.push(text.slice(lastIndex, match.index))
		}
		parts.push(<strong key={key++}>{match[1]}</strong>)
		lastIndex = regex.lastIndex
	}
	if (lastIndex < text.length) {
		parts.push(text.slice(lastIndex))
	}
	return parts
}

type MarkdownBlock =
	| { type: 'h2'; text: string }
	| { type: 'h3'; text: string }
	| { type: 'list'; items: string[] }
	| { type: 'p'; text: string }

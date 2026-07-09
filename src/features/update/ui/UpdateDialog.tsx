/**
 * 更新弹窗组件。
 *
 * 职责：仅提醒 / 手动检查路径下的「是否下载」决策，以及可选的进度/重启展示。
 * 自动下载路径默认不开本弹窗；下载进度与就绪态以 Footer / Ready Chip 为主。
 * 下载中可关闭弹窗（状态落到 Footer，不中断下载）。
 */

import type { ReactNode } from 'react'
import { DownloadIcon, RefreshCwIcon } from 'lucide-react'

import { Button } from '@/shared/ui/base/button'
import { Dialog, DialogContent } from '@/shared/ui/base/dialog'
import { cn } from '@/shared/lib/utils'
import { skipVersion } from '@/features/update/api/updates'
import { useUpdateStore } from '@/features/update/model/useUpdateStore'
import { useUpdateActions } from '@/features/update/model/useUpdateEvents'

export function UpdateDialog() {
	const dialogVisible = useUpdateStore((s) => s.dialogVisible)
	const updateInfo = useUpdateStore((s) => s.updateInfo)
	const status = useUpdateStore((s) => s.status)
	const closeDialog = useUpdateStore((s) => s.closeDialog)
	const skipAndClose = useUpdateStore((s) => s.skipAndClose)
	const { startDownload, restart, cancelDownloadUi } = useUpdateActions()

	function handleOpenChange(nextOpen: boolean) {
		if (!nextOpen) {
			// 关闭不等于取消下载 / 跳过版本；进度继续由 Footer / Chip 承载
			closeDialog()
		}
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

	const isDownloading = status.status === 'downloading'
	const isDownloaded = status.status === 'downloaded'
	const isError = status.status === 'error'
	const isChecking = status.status === 'checking'
	const canDownload =
		status.status === 'updateAvailable' ||
		status.status === 'idle' ||
		status.status === 'upToDate' ||
		isError

	const progressPercent =
		status.status === 'downloading' && status.total !== null
			? Math.min(100, Math.round((status.downloaded / status.total) * 100))
			: 0

	const displayVersion =
		status.status === 'downloaded' ? status.version : (updateInfo?.version ?? '')

	// 根据状态决定标题和描述
	const titleText = isDownloaded
		? '更新已准备就绪'
		: isDownloading
			? '正在下载更新'
			: isError
				? '更新失败'
				: `发现新版本 ${displayVersion}`

	const descText = isDownloaded
		? `版本 ${displayVersion} 已下载完成，重启 StoneFlow 即可完成安装。`
		: isDownloading
			? '正在下载更新文件。可关闭此窗口，进度会显示在底部状态栏。'
			: isError
				? status.message
				: isChecking
					? '正在检查更新...'
					: '建议及时更新以获得最新功能和问题修复。'

	return (
		<Dialog onOpenChange={handleOpenChange} open={dialogVisible}>
			<DialogContent
				className={dialogContentClass}
				showCloseButton
				disableAnimation
			>
				{/* 头部：标题 + 描述，无 border 分割，padding 对齐创建弹窗 */}
				<div className={headerClass}>
					<h2 className={titleClass}>{titleText}</h2>
					<p className={descClass}>{descText}</p>
				</div>

				{/* 内容区 */}
				<div className={bodyClass}>
					{/* 更新说明 */}
					{!isDownloading && !isDownloaded && updateInfo?.body ? (
						<div className={notesCardClass}>
							<UpdateNotesMarkdown content={updateInfo.body} />
						</div>
					) : null}

					{/* 下载进度条 */}
					{isDownloading ? (
						<div className='space-y-2'>
							<div className='h-1.5 w-full overflow-hidden rounded-full bg-muted'>
								<div
									className='h-full rounded-full bg-primary transition-[width] duration-200 ease-out'
									style={{
										width: status.total !== null ? `${progressPercent}%` : undefined,
									}}
								/>
							</div>
							<p className='text-[12px] leading-none text-sf-shell-tertiary tabular-nums'>
								{status.total !== null
									? `${formatBytes(status.downloaded)} / ${formatBytes(status.total)} (${progressPercent}%)`
									: `${formatBytes(status.downloaded)} 已下载`}
							</p>
						</div>
					) : null}

					{/* 下载完成提示 */}
					{isDownloaded ? (
						<div className={successCardClass}>
							<p className='text-[13px] leading-5 text-green-700 dark:text-green-300'>
								重启 StoneFlow 后将自动安装更新。
							</p>
						</div>
					) : null}

					{/* 错误提示 */}
					{isError ? (
						<div className={errorCardClass}>
							<p className='text-[13px] leading-5 text-red-700 dark:text-red-300'>
								{status.message}
							</p>
						</div>
					) : null}
				</div>

				{/* 底部操作栏：无 border、无灰底，justify-end 右对齐按钮 */}
				<div className={footerClass}>
					{isDownloaded ? (
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
							<Button
								onClick={() => {
									cancelDownloadUi()
								}}
								size='sm'
								type='button'
								variant='ghost'
							>
								取消
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

// ─── 样式常量（对齐创建弹窗的设计语言）─────────────────────────

/** 弹窗内容容器：rounded-3xl、p-0、top 偏移、宽度 */
const dialogContentClass = cn(
	'flex flex-col gap-0 overflow-hidden rounded-3xl border border-border p-0',
	'shadow-(--sf-shadow-float) top-[15dvh] translate-y-0',
	'max-w-[calc(100%-1.5rem)] sm:max-w-md',
)

/** 头部：标题区，px-5 py-4，无 border-bottom */
const headerClass = 'shrink-0 px-5 pt-5 pb-3'

/** 标题文字 */
const titleClass = 'text-[15px] font-semibold leading-tight text-foreground'

/** 描述文字 */
const descClass = 'mt-1 text-[13px] leading-5 text-sf-shell-tertiary'

/** 内容区：px-5，子元素间距 */
const bodyClass = 'min-h-0 px-5 py-3 space-y-3'

/** 底部操作栏：px-5 pb-4 pt-2，右对齐，无 border-top、无灰底 */
const footerClass = 'shrink-0 flex items-center justify-end gap-2 px-5 pb-4 pt-2'

/** 更新说明卡片：圆角、浅色背景、内边距 */
const notesCardClass = 'rounded-xl bg-muted p-4'

/** 下载完成提示卡片 */
const successCardClass =
	'rounded-xl border border-green-200/60 bg-green-50/60 p-4 dark:border-green-900/30 dark:bg-green-950/20'

/** 错误提示卡片 */
const errorCardClass =
	'rounded-xl border border-red-200/60 bg-red-50/60 p-4 dark:border-red-900/30 dark:bg-red-950/20'

// ─── 工具函数 ─────────────────────────────────────────────

/** 格式化字节数为人类可读格式（tabular-nums 防止数字跳动） */
function formatBytes(bytes: number): string {
	if (bytes === 0) return '0 B'
	const units = ['B', 'KB', 'MB', 'GB']
	const i = Math.floor(Math.log(bytes) / Math.log(1024))
	const value = bytes / Math.pow(1024, i)
	return `${i === 0 ? value : value.toFixed(1)} ${units[i]}`
}

// ─── 轻量 Markdown 渲染 ────────────────────────────────────

/**
 * 轻量 Markdown 渲染组件（仅用于更新说明）。
 *
 * 支持：## / ### 标题、- 无序列表、**粗体**、空行分段、普通段落。
 * 不引入第三方依赖，足够渲染发布脚本生成的更新说明。
 */
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

/** 解析简单 Markdown 为块级结构 */
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

/** 渲染行内格式（粗体） */
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

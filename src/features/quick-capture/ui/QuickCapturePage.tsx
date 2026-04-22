import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { listen } from '@tauri-apps/api/event'
import {
	AlertTriangleIcon,
	CheckCircle2Icon,
	LoaderCircleIcon,
	SendHorizontalIcon,
} from 'lucide-react'

import {
	createCaptureTask,
	normalizeCaptureTaskError,
	type CreatedCaptureTaskPayload,
} from '@/features/quick-capture/api/createCaptureTask'
import { Button } from '@/shared/ui/base/button'
import { Kbd } from '@/shared/ui/base/kbd'
import { cn } from '@/shared/lib/utils'

type QuickCaptureStatus = 'idle' | 'submitting' | 'success' | 'error'

type QuickCaptureSurfaceProps = {
	createTask?: typeof createCaptureTask
	closeWindow?: () => Promise<void> | void
	closeDelayMs?: number
}

const DEFAULT_CLOSE_DELAY_MS = 900

const ERROR_MESSAGES: Record<string, string> = {
	Validation: '请输入一个可以捕获的任务标题。',
	CaptureSpaceUnavailable: '当前 Space 不可用，暂时无法捕获。',
	DefaultSpaceUnavailable: '默认 Space 不可用，任务没有写入。',
	CapturePersistence: '写入任务失败，请稍后重试。',
}

function closeCurrentWindow() {
	// 隐藏而非销毁：面板实例常驻内存，保证 toggle（Option+Space）能复用。
	return getCurrentWindow().hide()
}

function getErrorMessage(error: unknown) {
	const normalized = normalizeCaptureTaskError(error)

	if ('type' in normalized && typeof normalized.type === 'string') {
		return ERROR_MESSAGES[normalized.type] ?? normalized.message
	}

	return normalized.message || '捕获失败，请稍后重试。'
}

function getSuccessMessage(payload: CreatedCaptureTaskPayload) {
	if (payload.spaceFallback) {
		return '已写入默认 Space 的 Inbox'
	}

	return '已写入当前 Space 的 Inbox'
}

export function QuickCapturePage() {
	// 挂载/卸载时在 body 上打标，使全局 body[data-quick-capture] 透明样式生效。
	// 避免 body 的 bg-background 盖掉 Tauri 窗口 transparent(true)，造成卡片外出现灰白一圈。
	useEffect(() => {
		document.body.dataset.quickCapture = 'true'
		return () => {
			delete document.body.dataset.quickCapture
		}
	}, [])

	return (
		// 已去阴影，外层只需极小 padding 防 ring 被窗口边缘裁切；背景透明。
		// 不使用 overflow-hidden 以防未来再加阴影/动画时出现裁切。
		<div className='flex h-full min-h-0 items-stretch bg-transparent p-1'>
			<QuickCaptureSurface />
		</div>
	)
}

export function QuickCaptureSurface({
	createTask = createCaptureTask,
	closeWindow = closeCurrentWindow,
	closeDelayMs = DEFAULT_CLOSE_DELAY_MS,
}: QuickCaptureSurfaceProps) {
	const inputRef = useRef<HTMLInputElement>(null)
	const closeTimerRef = useRef<number | null>(null)
	const [title, setTitle] = useState('')
	const [status, setStatus] = useState<QuickCaptureStatus>('idle')
	const [message, setMessage] = useState('写入当前 Space 的 Inbox')

	const isSubmitting = status === 'submitting'
	const trimmedTitle = title.trim()

	const focusInput = useCallback(() => {
		window.setTimeout(() => {
			inputRef.current?.focus()
			inputRef.current?.select()
		}, 0)
	}, [])

	const requestClose = useCallback(() => {
		if (closeTimerRef.current !== null) {
			window.clearTimeout(closeTimerRef.current)
			closeTimerRef.current = null
		}

		void closeWindow()
	}, [closeWindow])

	// 每次面板被呼出时重置为初始状态，确保每次打开都是空白干净的输入框。
	const handlePanelShown = useCallback(() => {
		setTitle('')
		setStatus('idle')
		setMessage('写入当前 Space 的 Inbox')
		focusInput()
	}, [focusInput])

	useEffect(() => {
		// 首次挂载时立即重置并聚焦。
		handlePanelShown()

		// macOS：监听 Rust 侧发出的 `quick-capture:shown` 自定义事件。
		// show_and_make_key() 不保证 WKWebView 的 window.focus 一定触发（尤其在全屏 Space），
		// 用 Tauri 事件作为可靠的驱动源。
		let unlistenTauri: (() => void) | undefined
		listen<void>('quick-capture:shown', handlePanelShown).then((fn) => {
			unlistenTauri = fn
		})

		// 非 macOS 或 Tauri 事件未触发时的兜底：监听 DOM window.focus 事件。
		window.addEventListener('focus', handlePanelShown)

		return () => {
			unlistenTauri?.()
			window.removeEventListener('focus', handlePanelShown)
			if (closeTimerRef.current !== null) {
				window.clearTimeout(closeTimerRef.current)
			}
		}
	}, [handlePanelShown])

	const submit = useCallback(async () => {
		if (isSubmitting) {
			return
		}

		if (!trimmedTitle) {
			setStatus('error')
			setMessage('请输入任务标题')
			focusInput()
			return
		}

		setStatus('submitting')
		setMessage('正在写入 Inbox...')

		try {
			const payload = await createTask({
				title: trimmedTitle,
				note: null,
				priority: null,
			})

			setTitle('')
			setStatus('success')
			setMessage(getSuccessMessage(payload))

			if (payload.spaceFallback) {
				closeTimerRef.current = window.setTimeout(requestClose, closeDelayMs)
				return
			}

			requestClose()
		} catch (error) {
			setStatus('error')
			setMessage(getErrorMessage(error))
			focusInput()
		}
	}, [closeDelayMs, createTask, focusInput, isSubmitting, requestClose, trimmedTitle])

	const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
		// 关闭面板仅通过：Option+Space 再次切换 / 点击面板外失焦。
		// 不再处理 Esc：panel 未被设为 key window，键盘事件链不稳定，
		// 保留 Esc 会导致行为时好时坏，索性统一入口。
		if (event.key === 'Enter') {
			event.preventDefault()
			void submit()
		}
	}

	return (
		<section
			aria-label='Quick Capture'
			// 无阴影方案：单层 1px 极淡边框勾勒卡片轮廓，不叠 ring。
			className='flex min-h-0 w-full flex-col overflow-hidden rounded-[13px] border border-black/10 bg-[#fcfcfd]'
		>
			<div
				className='flex items-center justify-between border-b border-[#eaecf0] px-3 py-2'
				data-tauri-drag-region
			>
				<div className='flex min-w-0 items-center gap-2' data-tauri-drag-region>
					<span className='size-2 rounded-full bg-primary ring-3 ring-primary/15' />
					<div className='min-w-0' data-tauri-drag-region>
						<h1 className='truncate text-[12px] font-semibold text-foreground'>Quick Capture</h1>
						<p className='truncate text-[11px] text-(--sf-color-text-tertiary)'>一句话写入 Inbox</p>
					</div>
				</div>
				<div className='flex items-center gap-1.5 text-[11px] text-(--sf-color-text-tertiary)'>
					<Kbd>Enter</Kbd>
					<span>创建</span>
					<Kbd>Esc</Kbd>
				</div>
			</div>

			<div className='flex min-h-0 flex-1 flex-col gap-3 px-3 py-3'>
				<div className='flex h-11 items-center gap-2 rounded-[10px] border border-[#d0d4dc] bg-white px-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] focus-within:border-primary focus-within:ring-3 focus-within:ring-primary/12'>
					<input
						ref={inputRef}
						aria-label='任务标题'
						className='min-w-0 flex-1 bg-transparent text-[14px] text-foreground outline-none placeholder:text-(--sf-color-text-tertiary)'
						disabled={isSubmitting}
						onChange={(event) => {
							setTitle(event.target.value)
							if (status === 'error') {
								setStatus('idle')
								setMessage('写入当前 Space 的 Inbox')
							}
						}}
						onKeyDown={handleKeyDown}
						placeholder='输入任务标题'
						spellCheck={false}
						value={title}
					/>
					<Button
						aria-label='创建捕获任务'
						className='h-8 min-w-18 gap-1.5 rounded-[8px] px-2.5 text-[12px]'
						disabled={isSubmitting}
						onClick={() => void submit()}
						size='sm'
					>
						{isSubmitting ? (
							<LoaderCircleIcon className='size-3.5 animate-spin' />
						) : (
							<SendHorizontalIcon className='size-3.5' />
						)}
						<span>{isSubmitting ? '写入中' : '创建'}</span>
					</Button>
				</div>

				<div
					aria-live='polite'
					className={cn(
						'flex min-h-6 items-center gap-1.5 text-[12px]',
						status === 'error'
							? 'text-destructive'
							: status === 'success'
								? 'text-success-foreground'
								: 'text-(--sf-color-text-secondary)',
					)}
				>
					{status === 'error' ? <AlertTriangleIcon className='size-3.5' /> : null}
					{status === 'success' ? <CheckCircle2Icon className='size-3.5' /> : null}
					{status === 'submitting' ? <LoaderCircleIcon className='size-3.5 animate-spin' /> : null}
					<span>{message}</span>
				</div>
			</div>
		</section>
	)
}

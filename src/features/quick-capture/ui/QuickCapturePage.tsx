import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { getCurrentWindow } from '@tauri-apps/api/window'
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
	return (
		<div className='flex h-full min-h-0 items-stretch overflow-hidden bg-[#eceef2] p-2'>
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

	// 每次窗口重新获得焦点（Option+Space 呼出）时重置为初始状态，
	// 确保即使上次提交成功/失败，再次打开也是空白干净的输入框。
	const handleWindowFocus = useCallback(() => {
		setTitle('')
		setStatus('idle')
		setMessage('写入当前 Space 的 Inbox')
		focusInput()
	}, [focusInput])

	useEffect(() => {
		handleWindowFocus()
		window.addEventListener('focus', handleWindowFocus)

		return () => {
			window.removeEventListener('focus', handleWindowFocus)
			if (closeTimerRef.current !== null) {
				window.clearTimeout(closeTimerRef.current)
			}
		}
	}, [handleWindowFocus])

	// 兜底：焦点不在 input 时（如拖拽标题栏后）document 级 Esc 仍可关窗。
	useEffect(() => {
		const handleDocumentKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				event.preventDefault()
				requestClose()
			}
		}

		document.addEventListener('keydown', handleDocumentKeyDown)
		return () => {
			document.removeEventListener('keydown', handleDocumentKeyDown)
		}
	}, [requestClose])

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
		if (event.key === 'Escape') {
			event.preventDefault()
			// 阻止冒泡，避免 document 级兜底监听器重复触发关闭。
			event.stopPropagation()
			requestClose()
			return
		}

		if (event.key === 'Enter') {
			event.preventDefault()
			void submit()
		}
	}

	return (
		<section
			aria-label='Quick Capture'
			className='flex min-h-0 w-full flex-col overflow-hidden rounded-[13px] border border-[#d6d9e0] bg-[#fcfcfd] shadow-[0_16px_40px_rgba(10,15,40,0.12),0_2px_8px_rgba(10,15,40,0.06)]'
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

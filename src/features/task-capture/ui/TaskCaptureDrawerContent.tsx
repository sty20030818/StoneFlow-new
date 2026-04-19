import { useEffect } from 'react'

import { getSpaceLabel } from '@/app/layouts/shell/config'
import { useTaskCapture } from '@/features/task-capture/model/useTaskCapture'
import { Button } from '@/shared/ui/base/button'
import { Input } from '@/shared/ui/base/input'
import { Textarea } from '@/shared/ui/base/textarea'

type TaskCaptureDrawerContentProps = {
	currentSpaceId: string
	onClose: () => void
}

/**
 * Header -> New task 的最小创建表单。
 */
export function TaskCaptureDrawerContent({
	currentSpaceId,
	onClose,
}: TaskCaptureDrawerContentProps) {
	const { title, note, status, errorMessage, createdTask, setTitle, setNote, reset, submit } =
		useTaskCapture({
			currentSpaceId,
		})

	useEffect(() => {
		if (status !== 'success') {
			return undefined
		}

		const timer = window.setTimeout(() => {
			reset()
			onClose()
		}, 800)

		return () => {
			window.clearTimeout(timer)
		}
	}, [onClose, reset, status])

	return (
		<div className='space-y-4'>
			<div className='space-y-1.5'>
				<p className='text-[12px] font-medium text-foreground'>快速捕获</p>
				<p className='text-[12px] leading-5 text-(--sf-color-shell-tertiary)'>
					新任务会默认进入 {getSpaceLabel(currentSpaceId)} · Inbox，后续再去 Inbox
					补齐项目和优先级。
				</p>
			</div>

			<div className='space-y-2'>
				<label className='space-y-1.5' htmlFor='task-capture-title'>
					<span className='text-[11px] font-medium tracking-[0.03em] text-(--sf-color-shell-tertiary)'>
						任务标题
					</span>
					<Input
						autoFocus
						className='h-9 rounded-xl border-black/8 bg-black/2'
						disabled={status === 'submitting' || status === 'success'}
						id='task-capture-title'
						onChange={(event) => setTitle(event.currentTarget.value)}
						placeholder='例如：整理今天的任务捕获链路'
						value={title}
					/>
				</label>

				<label className='space-y-1.5' htmlFor='task-capture-note'>
					<span className='text-[11px] font-medium tracking-[0.03em] text-(--sf-color-shell-tertiary)'>
						备注
					</span>
					<Textarea
						className='min-h-24 rounded-xl border-black/8 bg-black/2'
						disabled={status === 'submitting' || status === 'success'}
						id='task-capture-note'
						onChange={(event) => setNote(event.currentTarget.value)}
						placeholder='可选，先写下你此刻已经知道的上下文。'
						value={note}
					/>
				</label>
			</div>

			{status === 'error' && errorMessage ? (
				<div
					className='rounded-xl border border-destructive/20 bg-destructive/8 px-3 py-2 text-[12px] leading-5 text-destructive'
					role='alert'
				>
					{errorMessage}
				</div>
			) : null}

			{status === 'success' && createdTask ? (
				<div
					className='rounded-xl border border-emerald-500/20 bg-emerald-500/8 px-3 py-2 text-[12px] leading-5 text-emerald-700'
					role='status'
				>
					已创建“{createdTask.title}”，正在收起到 {getSpaceLabel(currentSpaceId)} · Inbox。
				</div>
			) : null}

			<div className='rounded-xl border border-black/6 bg-black/3 px-3 py-2'>
				<p className='text-[11px] text-(--sf-color-shell-tertiary)'>创建约定</p>
				<p className='mt-1 text-[12px] leading-5 text-foreground'>
					`status = todo`、`project = 未归类`、`source = in_app_capture`
				</p>
			</div>

			<div className='flex items-center justify-end gap-2'>
				<Button
					className='rounded-xl'
					disabled={status === 'submitting'}
					onClick={() => {
						reset()
						onClose()
					}}
					variant='ghost'
				>
					取消
				</Button>
				<Button
					className='rounded-xl'
					disabled={status === 'submitting' || status === 'success'}
					onClick={() => {
						void submit()
					}}
				>
					{status === 'submitting' ? '创建中...' : status === 'success' ? '已创建' : '创建任务'}
				</Button>
			</div>
		</div>
	)
}

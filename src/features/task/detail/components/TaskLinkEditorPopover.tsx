import { useEffect, useState } from 'react'

import { Button } from '@/shared/components/base/button'
import { Dialog, DialogContent, DialogTitle } from '@/shared/components/base/dialog'
import { Input } from '@/shared/components/base/input'

export type TaskLinkEditorValue = {
	title: string
	url: string
}

type TaskLinkEditorPopoverProps = {
	open: boolean
	onOpenChange: (open: boolean) => void
	mode: 'create' | 'edit'
	anchor: React.ReactElement
	contentDrawerOwnedOverlay?: boolean
	initialValue?: Partial<TaskLinkEditorValue>
	onSubmit: (value: TaskLinkEditorValue) => Promise<void>
}

export function TaskLinkEditorPopover({
	open,
	onOpenChange,
	mode,
	anchor,
	contentDrawerOwnedOverlay = false,
	initialValue,
	onSubmit,
}: TaskLinkEditorPopoverProps) {
	const [title, setTitle] = useState(initialValue?.title ?? '')
	const [url, setUrl] = useState(initialValue?.url ?? '')
	const [error, setError] = useState<string | null>(null)
	const [isSubmitting, setSubmitting] = useState(false)

	useEffect(() => {
		if (!open) {
			return
		}

		setTitle(initialValue?.title ?? '')
		setUrl(initialValue?.url ?? '')
		setError(null)
		setSubmitting(false)
	}, [initialValue?.title, initialValue?.url, open])

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault()
		setSubmitting(true)
		setError(null)
		try {
			await onSubmit({
				title,
				url,
			})
			onOpenChange(false)
		} catch (nextError) {
			setError(nextError instanceof Error ? nextError.message : '链接保存失败')
		} finally {
			setSubmitting(false)
		}
	}

	const submitLabel = mode === 'create' ? '创建链接' : '保存链接'
	const titleLabel = mode === 'create' ? '添加链接' : '编辑链接'

	return (
		<>
			{anchor}
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent
					className='max-w-[26rem] rounded-xl border-sf-border-secondary bg-popover/98 p-4 shadow-(--sf-shadow-float)'
					data-drawer-owned-overlay={contentDrawerOwnedOverlay ? 'true' : undefined}
					showCloseButton={false}
				>
					<DialogTitle className='sr-only'>{titleLabel}</DialogTitle>
					<form className='space-y-3' onSubmit={(event) => void handleSubmit(event)}>
						<div className='space-y-1'>
							<h4 className='text-[13px] font-medium text-foreground'>{titleLabel}</h4>
							<p className='text-[12px] leading-5 text-sf-shell-text-tertiary'>
								当前阶段只支持 `http` / `https` URL。
							</p>
						</div>

						<label className='block space-y-1'>
							<span className='text-[12px] font-medium text-sf-shell-text-secondary'>标题</span>
							<Input
								autoFocus
								placeholder='例如：技术方案文档'
								value={title}
								onChange={(event) => setTitle(event.target.value)}
							/>
						</label>

						<label className='block space-y-1'>
							<span className='text-[12px] font-medium text-sf-shell-text-secondary'>URL</span>
							<Input
								inputMode='url'
								placeholder='https://example.com/spec'
								value={url}
								onChange={(event) => setUrl(event.target.value)}
							/>
						</label>

						{error ? <p className='text-[12px] text-destructive'>{error}</p> : null}

						<div className='flex items-center justify-end gap-2 pt-1'>
							<Button onClick={() => onOpenChange(false)} size='sm' type='button' variant='ghost'>
								取消
							</Button>
							<Button disabled={isSubmitting} size='sm' type='submit' variant='outline'>
								{submitLabel}
							</Button>
						</div>
					</form>
				</DialogContent>
			</Dialog>
		</>
	)
}

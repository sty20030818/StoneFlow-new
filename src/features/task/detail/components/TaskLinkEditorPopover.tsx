import { useEffect, useState, type ReactElement } from 'react'

import { Button, Form, Input, Popover, TextField } from '@heroui/react'

export type TaskLinkEditorValue = {
	title: string
	url: string
}

type TaskLinkEditorPopoverProps = {
	mode: 'create' | 'edit'
	trigger: ReactElement
	contentDrawerOwnedOverlay?: boolean
	initialValue?: Partial<TaskLinkEditorValue>
	onSubmit: (value: TaskLinkEditorValue) => Promise<void>
}

export function TaskLinkEditorPopover({
	mode,
	trigger,
	contentDrawerOwnedOverlay = false,
	initialValue,
	onSubmit,
}: TaskLinkEditorPopoverProps) {
	const [isOpen, setOpen] = useState(false)
	const [title, setTitle] = useState(initialValue?.title ?? '')
	const [url, setUrl] = useState(initialValue?.url ?? '')
	const [error, setError] = useState<string | null>(null)
	const [isSubmitting, setSubmitting] = useState(false)

	useEffect(() => {
		if (!isOpen) {
			return
		}

		setTitle(initialValue?.title ?? '')
		setUrl(initialValue?.url ?? '')
		setError(null)
		setSubmitting(false)
	}, [initialValue?.title, initialValue?.url, isOpen])

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault()
		setSubmitting(true)
		setError(null)
		try {
			await onSubmit({ title, url })
			setOpen(false)
		} catch (nextError) {
			setError(nextError instanceof Error ? nextError.message : '链接保存失败')
		} finally {
			setSubmitting(false)
		}
	}

	const submitLabel = mode === 'create' ? '创建链接' : '保存链接'
	const heading = mode === 'create' ? '添加链接' : '编辑链接'

	return (
		<Popover isOpen={isOpen} onOpenChange={setOpen}>
			{trigger}
			<Popover.Content
				className='w-[min(26rem,calc(100vw-2rem))]'
				data-drawer-owned-overlay={contentDrawerOwnedOverlay ? 'true' : undefined}
				offset={8}
				placement='bottom end'
			>
				<Popover.Dialog>
					<Popover.Heading>{heading}</Popover.Heading>
					<p className='mt-1 text-xs text-muted'>仅支持 http / https URL。</p>
					<Form
						className='mt-4 flex flex-col gap-3'
						validationBehavior='native'
						onSubmit={(event) => void handleSubmit(event)}
					>
						<TextField
							aria-label='链接标题'
							fullWidth
							isRequired
							name='title'
							value={title}
							onChange={setTitle}
						>
							<Input
								autoFocus
								aria-label='链接标题'
								placeholder='例如：技术方案文档'
								variant='secondary'
							/>
						</TextField>
						<TextField
							aria-label='链接 URL'
							fullWidth
							isRequired
							name='url'
							value={url}
							onChange={setUrl}
						>
							<Input
								aria-label='链接 URL'
								inputMode='url'
								placeholder='https://example.com/spec'
								variant='secondary'
							/>
						</TextField>
						{error ? (
							<p className='text-xs text-danger' role='alert'>
								{error}
							</p>
						) : null}
						<div className='flex items-center justify-end gap-2'>
							<Button onPress={() => setOpen(false)} size='sm' type='button' variant='ghost'>
								取消
							</Button>
							<Button
								isDisabled={!title.trim() || !url.trim()}
								isPending={isSubmitting}
								size='sm'
								type='submit'
							>
								{submitLabel}
							</Button>
						</div>
					</Form>
				</Popover.Dialog>
			</Popover.Content>
		</Popover>
	)
}

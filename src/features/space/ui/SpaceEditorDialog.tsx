import { useEffect, useState } from 'react'

import {
	getSpaceColorOption,
	getSpaceIconOption,
	getSpaceVisual,
	SPACE_COLOR_OPTIONS,
	SPACE_ICON_OPTIONS,
} from '@/features/space/model/spaceVisuals'
import type { Space } from '@/shared/types'
import { cn } from '@/shared/lib/utils'
import { StatusNotice } from '@/shared/ui/StatusNotice'
import { Button } from '@/shared/ui/base/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/shared/ui/base/dialog'
import { Input } from '@/shared/ui/base/input'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/shared/ui/base/select'

type SpaceEditorDialogProps = {
	open: boolean
	mode: 'create' | 'edit'
	space?: Space | null
	onClose: () => void
	onSubmit: (input: { name: string; iconKey: string; colorKey: string }) => Promise<void>
}

/**
 * Space 创建 / 编辑弹窗，只承载最小字段输入。
 */
export function SpaceEditorDialog({
	open,
	mode,
	space = null,
	onClose,
	onSubmit,
}: SpaceEditorDialogProps) {
	const [name, setName] = useState('')
	const [iconKey, setIconKey] = useState('user')
	const [colorKey, setColorKey] = useState('blue')
	const [submitting, setSubmitting] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const selectedIconOption = getSpaceIconOption(iconKey)
	const selectedColorOption = getSpaceColorOption(colorKey)
	const previewVisual = getSpaceVisual({ iconKey, colorKey })
	const PreviewIcon = previewVisual.icon
	const SelectedIcon = selectedIconOption.icon

	useEffect(() => {
		setName(space?.name ?? '')
		setIconKey(space?.iconKey ?? 'user')
		setColorKey(space?.colorKey ?? 'blue')
		setSubmitting(false)
		setError(null)
	}, [open, space])

	async function handleSubmit() {
		setSubmitting(true)
		setError(null)
		try {
			await onSubmit({
				name,
				iconKey,
				colorKey,
			})
			onClose()
		} catch (error) {
			setError(error instanceof Error ? error.message : 'Space 保存失败')
		} finally {
			setSubmitting(false)
		}
	}

	return (
		<Dialog onOpenChange={(nextOpen) => !nextOpen && onClose()} open={open}>
			<DialogContent className='max-w-[calc(100%-1.5rem)] gap-0 border-(--sf-color-border-secondary) bg-popover p-0 shadow-(--sf-shadow-float) sm:max-w-lg'>
				<DialogHeader className='gap-1.5 border-b border-(--sf-color-divider) px-6 py-4 pr-14'>
					<DialogTitle className='text-[1.0625rem] font-semibold tracking-[-0.02em] text-foreground'>
						{mode === 'create' ? '新建 Space' : '编辑 Space'}
					</DialogTitle>
					<DialogDescription className='text-[13px] leading-5 text-muted-foreground'>
						Space 只承载顶级上下文。先收口名称、图标和颜色，后续再承接更多真实业务。
					</DialogDescription>
				</DialogHeader>

				<div className='flex flex-col gap-4 px-6 py-5'>
					<div className='flex items-center gap-3 rounded-xl border border-(--sf-color-divider) bg-card/70 px-4 py-3'>
						<span
							className={cn(
								'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-(--sf-shadow-panel)',
								previewVisual.iconBadgeClassName,
							)}
						>
							<PreviewIcon className='size-5 text-white' />
						</span>
						<div className='min-w-0'>
							<p className='truncate text-[13px] font-medium text-foreground'>
								{name.trim() || 'Space 预览'}
							</p>
							<p className='text-[12px] text-muted-foreground'>
								{selectedIconOption.label} · {selectedColorOption.label}
							</p>
						</div>
					</div>

					<label className='flex flex-col gap-1.5' htmlFor='space-editor-name'>
						<span className='text-[12px] font-medium text-foreground'>名称</span>
						<Input
							autoFocus
							className='h-11 rounded-md border-input bg-card'
							disabled={submitting}
							id='space-editor-name'
							onChange={(event) => setName(event.currentTarget.value)}
							placeholder='例如：个人 / 工作 / 学习'
							value={name}
						/>
					</label>

					<div className='grid gap-4 sm:grid-cols-2'>
						<label className='flex flex-col gap-1.5'>
							<span className='text-[12px] font-medium text-foreground'>图标</span>
							<Select disabled={submitting} onValueChange={setIconKey} value={iconKey}>
								<SelectTrigger className='h-11 rounded-md border-input bg-card'>
									<div className='flex min-w-0 items-center gap-2'>
										<SelectedIcon className={cn('size-4 shrink-0', previewVisual.iconClassName)} />
										<span className='truncate'>{selectedIconOption.label}</span>
									</div>
								</SelectTrigger>
								<SelectContent position='popper'>
									{SPACE_ICON_OPTIONS.map((option) => (
										<SelectItem key={option.value} value={option.value}>
											<div className='flex items-center gap-2'>
												<option.icon
													className={cn('size-4 shrink-0', previewVisual.iconClassName)}
												/>
												<span>{option.label}</span>
											</div>
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</label>

						<label className='flex flex-col gap-1.5'>
							<span className='text-[12px] font-medium text-foreground'>颜色</span>
							<Select disabled={submitting} onValueChange={setColorKey} value={colorKey}>
								<SelectTrigger className='h-11 rounded-md border-input bg-card'>
									<div className='flex min-w-0 items-center gap-2'>
										<span
											className={cn(
												'size-3 shrink-0 rounded-full border border-black/8',
												selectedColorOption.swatchClassName,
											)}
										/>
										<span className='truncate'>{selectedColorOption.label}</span>
									</div>
								</SelectTrigger>
								<SelectContent position='popper'>
									{SPACE_COLOR_OPTIONS.map((option) => (
										<SelectItem key={option.value} value={option.value}>
											<div className='flex items-center gap-2'>
												<span
													className={cn(
														'size-3 shrink-0 rounded-full border border-black/8',
														option.swatchClassName,
													)}
												/>
												<span>{option.label}</span>
											</div>
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</label>
					</div>

					{error ? (
						<StatusNotice role='alert' size='sm' variant='danger'>
							{error}
						</StatusNotice>
					) : null}

					<div className='flex items-center justify-end gap-2 border-t border-(--sf-color-divider) pt-3'>
						<Button disabled={submitting} onClick={onClose} variant='ghost'>
							取消
						</Button>
						<Button
							disabled={submitting || name.trim().length === 0}
							onClick={() => void handleSubmit()}
						>
							{mode === 'create' ? '创建 Space' : '保存变更'}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}

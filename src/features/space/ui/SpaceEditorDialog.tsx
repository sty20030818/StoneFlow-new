import { useCallback, useEffect, useMemo, useState } from 'react'

import {
	getSpaceColorOption,
	getSpaceIconOption,
	getSpaceVisual,
	SPACE_COLOR_OPTIONS,
	SPACE_ICON_OPTIONS,
} from '@/features/space/model/spaceVisuals'
import { useRegisterSubmitTarget } from '@/features/submit/model'
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
import {
	dialogShellBodyClass,
	dialogShellContentVariants,
	dialogShellDescriptionClass,
	dialogShellFooterClass,
	dialogShellHeaderClass,
	dialogShellTitleClass,
} from '@/shared/ui/patterns/dialog-shell'
import { formFieldLabelVariants, formFieldStackClass } from '@/shared/ui/patterns/form-field'

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

	const handleSubmit = useCallback(async () => {
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
	}, [colorKey, iconKey, name, onClose, onSubmit])
	const submitTarget = useMemo(
		() =>
			open
				? {
						id: mode === 'create' ? 'space-editor:create' : `space-editor:${space?.id ?? 'edit'}`,
						title: mode === 'create' ? '创建 Space' : '保存 Space',
						priority: 100,
						canSubmit: !submitting && name.trim().length > 0,
						submit: handleSubmit,
						context: { source: 'space-editor' as const },
					}
				: null,
		[handleSubmit, mode, name, open, space?.id, submitting],
	)
	useRegisterSubmitTarget(submitTarget)

	return (
		<Dialog onOpenChange={(nextOpen) => !nextOpen && onClose()} open={open}>
			<DialogContent className={dialogShellContentVariants({ size: 'lg' })}>
				<DialogHeader className={dialogShellHeaderClass}>
					<DialogTitle className={dialogShellTitleClass}>
						{mode === 'create' ? '新建 Space' : '编辑 Space'}
					</DialogTitle>
					<DialogDescription className={dialogShellDescriptionClass}>
						Space 只承载顶级上下文。先收口名称、图标和颜色，后续再承接更多真实业务。
					</DialogDescription>
				</DialogHeader>

				<div className={cn('flex flex-col gap-4', dialogShellBodyClass)}>
					<div className='flex items-center gap-3 rounded-xl border border-sf-divider bg-card/70 px-4 py-3'>
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

					<label className={formFieldStackClass} htmlFor='space-editor-name'>
						<span className={formFieldLabelVariants()}>名称</span>
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
						<label className={formFieldStackClass}>
							<span className={formFieldLabelVariants()}>图标</span>
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

						<label className={formFieldStackClass}>
							<span className={formFieldLabelVariants()}>颜色</span>
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

					<div className={dialogShellFooterClass}>
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

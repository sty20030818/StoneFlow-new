import { Alert, Button, Input, Label, ListBox, Modal, Select } from '@heroui/react'
import { useCallback, useEffect, useEffectEvent, useId, useState } from 'react'
import { FormProvider, useController } from 'react-hook-form'

import {
	getSpaceColorOption,
	getSpaceIconOption,
	getSpaceVisual,
	SPACE_COLOR_OPTIONS,
	SPACE_ICON_OPTIONS,
} from '../model/spaceVisuals'
import type { Space } from '@/shared/types'
import { normalizeSubmitError, useZodForm } from '@/shared/form'
import { useSubmitTargetFromForm } from '@/features/submit'
import { cn } from '@/shared/lib/utils'
import { buildSpaceEditorDefaultValues, spaceEditorSchema } from './SpaceEditorDialog.form'

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
	const form = useZodForm({
		schema: spaceEditorSchema,
		defaultValues: buildSpaceEditorDefaultValues(space ?? {}),
	})
	const { field: nameField } = useController({ control: form.control, name: 'name' })
	const { field: iconKeyField } = useController({ control: form.control, name: 'iconKey' })
	const { field: colorKeyField } = useController({ control: form.control, name: 'colorKey' })
	const [submitting, setSubmitting] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const name = nameField.value
	const iconKey = iconKeyField.value
	const colorKey = colorKeyField.value
	const selectedIconOption = getSpaceIconOption(iconKey)
	const selectedColorOption = getSpaceColorOption(colorKey)
	const previewVisual = getSpaceVisual({ iconKey, colorKey })
	const PreviewIcon = previewVisual.icon
	const SelectedIcon = selectedIconOption.icon
	const descriptionId = useId()
	const submitSpace = useEffectEvent(onSubmit)
	const closeDialog = useEffectEvent(onClose)

	useEffect(() => {
		form.reset(buildSpaceEditorDefaultValues(space ?? {}))
		setSubmitting(false)
		setError(null)
	}, [form, open, space])

	const handleSubmit = useCallback(async () => {
		const isValid = await form.trigger()
		if (!isValid) {
			return
		}

		const values = form.getValues()
		setSubmitting(true)
		setError(null)
		try {
			// useEffectEvent：同组件事件回调中读取最新 props，避免 handleSubmit 依赖抖动
			// react-doctor-disable-next-line react-doctor/rules-of-hooks
			await submitSpace({
				name: values.name.trim(),
				iconKey: values.iconKey,
				colorKey: values.colorKey,
			})
			// react-doctor-disable-next-line react-doctor/rules-of-hooks
			closeDialog()
		} catch (error) {
			setError(normalizeSubmitError(error, 'Space 保存失败'))
		} finally {
			setSubmitting(false)
		}
	}, [form])

	useSubmitTargetFromForm({
		id: open
			? mode === 'create'
				? 'space-editor:create'
				: `space-editor:${space?.id ?? 'edit'}`
			: null,
		title: mode === 'create' ? '创建 Space' : '保存 Space',
		priority: 100,
		context: { source: 'space-editor' as const },
		form,
		canSubmit:
			nameField.value.trim().length > 0 &&
			iconKeyField.value.trim().length > 0 &&
			colorKeyField.value.trim().length > 0,
		isSubmitting: submitting,
		submit: handleSubmit,
	})

	return (
		<Modal.Backdrop isOpen={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
			<Modal.Container placement='center' size='lg'>
				<Modal.Dialog
					aria-describedby={descriptionId}
					className='overflow-hidden'
					render={(dialogProps) => (
						<section
							{...dialogProps}
							onKeyDown={(event) => {
								if (event.key !== 'Escape' || event.defaultPrevented) event.stopPropagation()
							}}
						/>
					)}
				>
					<FormProvider {...form}>
						<form
							onSubmit={(event) => {
								event.preventDefault()
								void handleSubmit()
							}}
						>
							<Modal.Header>
								<Modal.Heading>{mode === 'create' ? '新建 Space' : '编辑 Space'}</Modal.Heading>
								<p className='text-sm text-muted' id={descriptionId}>
									Space 只承载顶级上下文。设置名称、图标和颜色即可。
								</p>
							</Modal.Header>

							<Modal.Body>
								<div className='flex items-center gap-3 rounded-xl border border-separator bg-surface-secondary px-4 py-3'>
									<span
										className={cn(
											'flex size-10 shrink-0 items-center justify-center rounded-xl text-white',
											previewVisual.iconBadgeClassName,
										)}
									>
										<PreviewIcon className='size-5 text-white' />
									</span>
									<div className='min-w-0'>
										<p className='truncate text-sm font-medium text-foreground'>
											{name.trim() || 'Space 预览'}
										</p>
										<p className='text-xs text-muted'>
											{selectedIconOption.label} · {selectedColorOption.label}
										</p>
									</div>
								</div>

								<div className='grid gap-1.5'>
									<Label htmlFor='space-editor-name'>名称</Label>
									<Input
										autoFocus
										disabled={submitting}
										fullWidth
										id='space-editor-name'
										onBlur={nameField.onBlur}
										onChange={nameField.onChange}
										placeholder='例如：个人 / 工作 / 学习'
										value={nameField.value}
									/>
								</div>

								<div className='grid gap-4 sm:grid-cols-2'>
									<Select
										isDisabled={submitting}
										onChange={(key) => typeof key === 'string' && iconKeyField.onChange(key)}
										value={iconKey}
									>
										<Label>图标</Label>
										<Select.Trigger>
											<Select.Value>
												<div className='flex min-w-0 items-center gap-2'>
													<SelectedIcon
														className={cn('size-4 shrink-0', previewVisual.iconClassName)}
													/>
													<span className='truncate'>{selectedIconOption.label}</span>
												</div>
											</Select.Value>
											<Select.Indicator />
										</Select.Trigger>
										<Select.Popover>
											<ListBox>
												{SPACE_ICON_OPTIONS.map((option) => (
													<ListBox.Item
														id={option.value}
														key={option.value}
														textValue={option.label}
													>
														<div className='flex items-center gap-2'>
															<option.icon className='size-4 shrink-0 text-muted' />
															<span>{option.label}</span>
														</div>
														<ListBox.ItemIndicator />
													</ListBox.Item>
												))}
											</ListBox>
										</Select.Popover>
									</Select>

									<Select
										isDisabled={submitting}
										onChange={(key) => typeof key === 'string' && colorKeyField.onChange(key)}
										value={colorKey}
									>
										<Label>颜色</Label>
										<Select.Trigger>
											<Select.Value>
												<div className='flex min-w-0 items-center gap-2'>
													<span
														className={cn(
															'size-3 shrink-0 rounded-full border border-separator',
															selectedColorOption.swatchClassName,
														)}
													/>
													<span className='truncate'>{selectedColorOption.label}</span>
												</div>
											</Select.Value>
											<Select.Indicator />
										</Select.Trigger>
										<Select.Popover>
											<ListBox>
												{SPACE_COLOR_OPTIONS.map((option) => (
													<ListBox.Item
														id={option.value}
														key={option.value}
														textValue={option.label}
													>
														<div className='flex items-center gap-2'>
															<span
																className={cn(
																	'size-3 shrink-0 rounded-full border border-separator',
																	option.swatchClassName,
																)}
															/>
															<span>{option.label}</span>
														</div>
														<ListBox.ItemIndicator />
													</ListBox.Item>
												))}
											</ListBox>
										</Select.Popover>
									</Select>
								</div>

								{error ? (
									<Alert role='alert' status='danger'>
										<Alert.Indicator />
										<Alert.Content>
											<Alert.Title>保存失败</Alert.Title>
											<Alert.Description>{error}</Alert.Description>
										</Alert.Content>
									</Alert>
								) : null}
							</Modal.Body>

							<Modal.Footer>
								<Button isDisabled={submitting} onPress={onClose} type='button' variant='ghost'>
									取消
								</Button>
								<Button
									isDisabled={
										submitting ||
										nameField.value.trim().length === 0 ||
										iconKeyField.value.trim().length === 0 ||
										colorKeyField.value.trim().length === 0
									}
									type='submit'
								>
									{mode === 'create' ? '创建 Space' : '保存变更'}
								</Button>
							</Modal.Footer>
						</form>
					</FormProvider>
				</Modal.Dialog>
			</Modal.Container>
		</Modal.Backdrop>
	)
}

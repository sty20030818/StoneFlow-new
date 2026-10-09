import {
	Alert,
	Button,
	ColorSwatchPicker,
	Input,
	Label,
	ListBox,
	Modal,
	Select,
} from '@heroui/react'
import { useCallback, useLayoutEffect, useState } from 'react'
import { FormProvider, useController } from 'react-hook-form'

import {
	getSpaceColorOption,
	getSpaceColorKeyByValue,
	getSpaceIconOption,
	getSpaceVisual,
	isSpaceColorKey,
	SPACE_COLOR_OPTIONS,
	SPACE_ICON_OPTIONS,
} from '../model/spaceVisuals'
import { normalizeSubmitError, useZodForm } from '@/shared/form'
import { useSubmitTargetFromForm } from '@/features/submit'
import { cn } from '@/shared/lib/utils'
import { buildSpaceEditorDefaultValues, spaceEditorSchema } from './SpaceEditorDialog.form'

import type { SpaceEditorDialogProps } from './SpaceEditorDialog'

export function SpaceEditorForm({
	open,
	mode,
	space = null,
	onClose,
	onSubmit,
	submitting,
	onSubmittingChange,
	onSubmitReady,
}: SpaceEditorDialogProps & {
	submitting: boolean
	onSubmittingChange: (submitting: boolean) => void
	onSubmitReady: (submit: () => Promise<void>) => () => void
}) {
	const form = useZodForm({
		schema: spaceEditorSchema,
		defaultValues: buildSpaceEditorDefaultValues(space ?? {}),
	})
	const { field: nameField } = useController({ control: form.control, name: 'name' })
	const { field: iconKeyField } = useController({ control: form.control, name: 'iconKey' })
	const { field: colorKeyField } = useController({ control: form.control, name: 'colorKey' })
	const [error, setError] = useState<string | null>(null)
	const name = nameField.value
	const iconKey = iconKeyField.value
	const colorKey = colorKeyField.value
	const selectedIconOption = getSpaceIconOption(iconKey)
	const selectedColorOption = getSpaceColorOption(colorKey)
	const previewVisual = getSpaceVisual({ iconKey, colorKey })
	const PreviewIcon = previewVisual.icon
	const SelectedIcon = selectedIconOption.icon

	const handleSubmit = useCallback(async () => {
		const isValid = await form.trigger()
		if (!isValid) {
			return
		}

		const values = form.getValues()
		onSubmittingChange(true)
		setError(null)
		try {
			await onSubmit({
				name: values.name.trim(),
				iconKey: values.iconKey,
				colorKey: values.colorKey,
			})
			onClose()
		} catch (error) {
			setError(normalizeSubmitError(error, 'Space 保存失败'))
		} finally {
			onSubmittingChange(false)
		}
	}, [form, onClose, onSubmit, onSubmittingChange])
	useLayoutEffect(() => onSubmitReady(handleSubmit), [handleSubmit, onSubmitReady])

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
			isSpaceColorKey(colorKeyField.value),
		isSubmitting: submitting,
		submit: handleSubmit,
	})
	return (
		<FormProvider {...form}>
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

				<div className='mt-4 grid gap-1.5'>
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

				<div className='mt-4 grid gap-4 sm:grid-cols-2'>
					<Select
						isDisabled={submitting}
						onChange={(key) => typeof key === 'string' && iconKeyField.onChange(key)}
						value={iconKey}
					>
						<Label>图标</Label>
						<Select.Trigger>
							<Select.Value>
								<div className='flex min-w-0 items-center gap-2'>
									<SelectedIcon className={cn('size-4 shrink-0', previewVisual.iconClassName)} />
									<span className='truncate'>{selectedIconOption.label}</span>
								</div>
							</Select.Value>
							<Select.Indicator />
						</Select.Trigger>
						<Select.Popover>
							<ListBox>
								{SPACE_ICON_OPTIONS.map((option) => (
									<ListBox.Item id={option.value} key={option.value} textValue={option.label}>
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

					<div className='grid content-start gap-1.5'>
						<Label>颜色</Label>
						<ColorSwatchPicker
							aria-label='颜色'
							onChange={(value) => {
								const nextColorKey = getSpaceColorKeyByValue(value.toString('hex'))
								if (nextColorKey) colorKeyField.onChange(nextColorKey)
							}}
							value={selectedColorOption.colorValue}
						>
							{SPACE_COLOR_OPTIONS.map((option) => (
								<ColorSwatchPicker.Item
									aria-label={option.label}
									color={option.colorValue}
									isDisabled={submitting}
									key={option.value}
								>
									<ColorSwatchPicker.Swatch />
									<ColorSwatchPicker.Indicator />
								</ColorSwatchPicker.Item>
							))}
						</ColorSwatchPicker>
					</div>
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
						!isSpaceColorKey(colorKeyField.value)
					}
					type='submit'
				>
					{mode === 'create' ? '创建 Space' : '保存变更'}
				</Button>
			</Modal.Footer>
		</FormProvider>
	)
}

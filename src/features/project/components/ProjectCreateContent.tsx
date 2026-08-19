import { useCallback, useRef, useState } from 'react'
import { FormProvider, useController } from 'react-hook-form'
import { Alert, Button, FieldError, Form, Input, Switch, TextArea, TextField } from '@heroui/react'

import { useCreateProjectMutation } from '../hooks/project.mutations'
import type { ProjectDetail } from '../model/types'
import { COMMAND_IDS, CommandActionTooltip, DisabledCommandActionTooltip } from '@/features/command'
import { useSubmitTargetFromForm, type SubmitIntent } from '@/features/submit'
import { normalizeSubmitError, useZodForm } from '@/shared/form'
import { CreateModalContent } from '@/shared/components/create-modal-content'
import {
	buildProjectCreateDefaultValues,
	projectCreateSchema,
	toProjectCreateInput,
} from './ProjectCreateContent.form'

type ProjectCreateContentProps = {
	selectedSpaceId: string | null
	onClose: () => void
	onCreated: (project: ProjectDetail) => void
}

/**
 * 项目创建表单 — 使用 CreateModalContent 组合 layout。
 * 壳层（Dialog + Header）由 CreateDialogShell 统一提供。
 */
export function ProjectCreateContent({
	selectedSpaceId,
	onClose,
	onCreated,
}: ProjectCreateContentProps) {
	const createProject = useCreateProjectMutation()
	const form = useZodForm({
		schema: projectCreateSchema,
		defaultValues: buildProjectCreateDefaultValues(),
	})
	const { field: nameField, fieldState: nameFieldState } = useController({
		control: form.control,
		name: 'name',
	})
	const { field: descriptionField, fieldState: descriptionFieldState } = useController({
		control: form.control,
		name: 'description',
	})
	const { field: createMoreField } = useController({
		control: form.control,
		name: 'createMore',
	})
	const [submitState, setSubmitState] = useState<'idle' | 'submitting' | 'error'>('idle')
	const [errorMessage, setErrorMessage] = useState<string | null>(null)
	const [createdCount, setCreatedCount] = useState(0)
	const titleInputRef = useRef<HTMLInputElement>(null)
	const isSubmitting = submitState === 'submitting'

	const resetFieldsOnly = useCallback(() => {
		form.reset(buildProjectCreateDefaultValues())
		setSubmitState('idle')
		setErrorMessage(null)
	}, [form])

	const canSubmit = !isSubmitting && Boolean(selectedSpaceId) && nameField.value.trim().length > 0

	const submitProject = useCallback(
		async (intent: SubmitIntent = 'default') => {
			const isValid = await form.trigger()
			if (!selectedSpaceId || !isValid) {
				return
			}

			const values = form.getValues()
			const effectiveIntent = intent === 'default' && values.createMore ? 'continue' : intent

			setSubmitState('submitting')
			setErrorMessage(null)
			try {
				const project = await createProject.mutateAsync(
					toProjectCreateInput(values, selectedSpaceId),
				)

				if (effectiveIntent === 'continue') {
					resetFieldsOnly()
					setCreatedCount((count) => count + 1)
					requestAnimationFrame(() => titleInputRef.current?.focus())
					return
				}

				resetFieldsOnly()
				onClose()
				onCreated(project)
			} catch (error) {
				setSubmitState('error')
				setErrorMessage(normalizeSubmitError(error, '项目创建失败'))
			}
		},
		[createProject, form, onClose, onCreated, resetFieldsOnly, selectedSpaceId],
	)

	useSubmitTargetFromForm({
		id: 'project-create',
		title: '创建项目',
		priority: 110,
		context: { source: 'project-create' as const },
		form,
		canSubmit,
		isSubmitting,
		supportedIntents: ['continue'],
		getIntentDisabledReason: (intent) => {
			if (intent === 'open') {
				return '当前表单不支持创建并打开'
			}
			return undefined
		},
		submit: submitProject,
	})

	const submitButton = (
		<Button isDisabled={!canSubmit} isPending={isSubmitting} size='sm' type='submit'>
			{submitState === 'submitting' ? '创建中…' : '创建项目'}
		</Button>
	)

	return (
		<FormProvider {...form}>
			<Form
				aria-label='创建项目'
				className='flex min-h-0 flex-1 flex-col'
				validationBehavior='aria'
				onSubmit={(event) => {
					event.preventDefault()
					void submitProject('default')
				}}
			>
				<CreateModalContent>
					<CreateModalContent.Title>
						<TextField
							aria-label='项目名称'
							fullWidth
							isInvalid={nameFieldState.invalid}
							isRequired
							name={nameField.name}
							value={nameField.value}
							onChange={nameField.onChange}
						>
							<Input
								ref={titleInputRef}
								autoFocus
								aria-label='项目名称'
								className='h-auto text-lg font-semibold'
								onBlur={nameField.onBlur}
								placeholder='项目名称'
								variant='secondary'
							/>
							<FieldError>{nameFieldState.error?.message}</FieldError>
						</TextField>
					</CreateModalContent.Title>

					<CreateModalContent.Body>
						<TextField
							aria-label='项目说明'
							fullWidth
							isInvalid={descriptionFieldState.invalid}
							name={descriptionField.name}
							value={descriptionField.value}
							onChange={descriptionField.onChange}
						>
							<TextArea
								aria-label='项目说明'
								className='min-h-20 resize-none text-[13px] leading-5'
								onBlur={descriptionField.onBlur}
								placeholder='添加项目说明…'
								variant='secondary'
							/>
							<FieldError>{descriptionFieldState.error?.message}</FieldError>
						</TextField>
						{submitState === 'error' ? (
							<Alert role='alert' status='danger'>
								<Alert.Indicator />
								<Alert.Content>
									<Alert.Title>项目创建失败</Alert.Title>
									<Alert.Description>{errorMessage}</Alert.Description>
								</Alert.Content>
							</Alert>
						) : null}
					</CreateModalContent.Body>

					<CreateModalContent.Footer>
						<span aria-hidden />

						<div className='flex items-center gap-3'>
							<p
								aria-live='polite'
								className='min-w-30 text-right text-[11px] font-medium tabular-nums text-muted'
							>
								{createdCount > 0 ? `已创建 ${createdCount} 个项目` : '\u00A0'}
							</p>
							<Switch
								isDisabled={isSubmitting}
								isSelected={createMoreField.value}
								size='sm'
								onChange={createMoreField.onChange}
							>
								<Switch.Content>
									<Switch.Control>
										<Switch.Thumb />
									</Switch.Control>
									创建更多
								</Switch.Content>
							</Switch>
							{canSubmit ? (
								<CommandActionTooltip commandId={COMMAND_IDS.saveOrSubmit} label='创建项目'>
									{submitButton}
								</CommandActionTooltip>
							) : (
								<DisabledCommandActionTooltip commandId={COMMAND_IDS.saveOrSubmit} label='创建项目'>
									{submitButton}
								</DisabledCommandActionTooltip>
							)}
						</div>
					</CreateModalContent.Footer>
				</CreateModalContent>
			</Form>
		</FormProvider>
	)
}

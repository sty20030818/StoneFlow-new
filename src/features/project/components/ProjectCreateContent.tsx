import { useCallback, useRef, useState } from 'react'
import { FormProvider, useController } from 'react-hook-form'
import { Button, FieldError, Form, Input, Switch, TextArea, TextField } from '@heroui/react'

import { useCreateProjectMutation } from '../hooks/project.mutations'
import type { ProjectDetail } from '../model/types'
import { COMMAND_IDS, CommandActionTooltip, DisabledCommandActionTooltip } from '@/features/command'
import { useSubmitTargetFromForm, type SubmitIntent } from '@/features/submit'
import { normalizeSubmitError, useZodForm } from '@/shared/form'
import type { Space } from '@/shared/types'
import {
	CreateModalContent,
	useCreateDescriptionSize,
	useCreateSessionActive,
	type CreateModalHeaderProps,
} from '@/shared/components/create-modal-content'
import {
	buildProjectCreateDefaultValues,
	projectCreateSchema,
	toProjectCreateInput,
} from './ProjectCreateContent.form'

type ProjectCreateContentProps = {
	initialSpaceId: string | null
	spaces: Space[]
	renderHeader: (props: CreateModalHeaderProps) => React.ReactNode
	onClose: () => void
	onCreated: (project: ProjectDetail) => void
}

/**
 * 项目创建表单 — 使用 CreateModalContent 组合 layout。
 * 壳层（Dialog + Header）由 CreateDialogShell 统一提供。
 */
export function ProjectCreateContent({
	initialSpaceId,
	spaces,
	renderHeader,
	onClose,
	onCreated,
}: ProjectCreateContentProps) {
	const createProject = useCreateProjectMutation()
	const form = useZodForm({
		schema: projectCreateSchema,
		defaultValues: buildProjectCreateDefaultValues(initialSpaceId),
	})
	const { field: spaceIdField } = useController({ control: form.control, name: 'spaceId' })
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
	const descriptionRef = useCreateDescriptionSize(descriptionField.value)
	const [submitState, setSubmitState] = useState<'idle' | 'submitting' | 'error'>('idle')
	const [errorMessage, setErrorMessage] = useState<string | null>(null)
	const [createdCount, setCreatedCount] = useState(0)
	const titleInputRef = useRef<HTMLInputElement>(null)
	const submittingRef = useRef(false)
	const sessionActive = useCreateSessionActive()
	const isSubmitting = submitState === 'submitting'

	const resetFieldsOnly = useCallback(() => {
		form.reset(buildProjectCreateDefaultValues(form.getValues('spaceId')))
		setSubmitState('idle')
		setErrorMessage(null)
	}, [form])

	const hasSpace = spaces.some((space) => space.id === spaceIdField.value)
	const canSubmit = !isSubmitting && hasSpace && nameField.value.trim().length > 0

	const submitProject = useCallback(
		async (intent: SubmitIntent = 'default') => {
			if (submittingRef.current) return
			submittingRef.current = true
			try {
				if (!(await form.trigger()) || !sessionActive.current) return
				if (!hasSpace) {
					form.setError('spaceId', { message: '创建空间已不可用，请重新选择。' })
					return
				}
				const values = form.getValues()
				const effectiveIntent = intent === 'default' && values.createMore ? 'continue' : intent
				setSubmitState('submitting')
				setErrorMessage(null)
				const project = await createProject.mutateAsync(toProjectCreateInput(values))
				if (!sessionActive.current) return

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
				if (!sessionActive.current) return
				setSubmitState('error')
				setErrorMessage(normalizeSubmitError(error, '项目创建失败'))
			} finally {
				submittingRef.current = false
			}
		},
		[createProject, form, hasSpace, onClose, onCreated, resetFieldsOnly, sessionActive],
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
			{renderHeader({
				selectedSpaceId: spaceIdField.value,
				onSelectSpace: spaceIdField.onChange,
				disabled: isSubmitting,
			})}
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
							isReadOnly={isSubmitting}
							name={nameField.name}
							value={nameField.value}
							onChange={nameField.onChange}
						>
							<Input
								ref={titleInputRef}
								autoFocus
								aria-label='项目名称'
								data-field-role='create-title'
								onBlur={nameField.onBlur}
								placeholder='项目名称'
							/>
							<FieldError>{nameFieldState.error?.message}</FieldError>
						</TextField>
					</CreateModalContent.Title>

					<CreateModalContent.Body>
						<TextField
							aria-label='项目说明'
							fullWidth
							isInvalid={descriptionFieldState.invalid}
							isReadOnly={isSubmitting}
							name={descriptionField.name}
							value={descriptionField.value}
							onChange={descriptionField.onChange}
						>
							<TextArea
								ref={descriptionRef}
								aria-label='项目说明'
								data-field-role='create-description'
								onBlur={descriptionField.onBlur}
								placeholder='添加项目说明…'
							/>
							<FieldError>{descriptionFieldState.error?.message}</FieldError>
						</TextField>
					</CreateModalContent.Body>

					<CreateModalContent.Footer>
						<CreateModalContent.Feedback
							error={errorMessage ?? form.formState.errors.spaceId?.message}
						>
							{createdCount > 0 ? `已创建 ${createdCount} 个项目` : null}
						</CreateModalContent.Feedback>

						<div className='flex items-center gap-3'>
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
								<DisabledCommandActionTooltip
									commandId={COMMAND_IDS.saveOrSubmit}
									label='创建项目'
									tabIndex={-1}
								>
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

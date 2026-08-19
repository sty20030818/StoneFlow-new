import { useCallback, useRef, useState } from 'react'
import { FormProvider, useController } from 'react-hook-form'

import { Button, FieldError, Form, Input, Switch, TextArea, TextField } from '@heroui/react'

import { useEntityDetailController } from '@/features/entity-detail'
import { COMMAND_IDS, CommandActionTooltip, DisabledCommandActionTooltip } from '@/features/command'
import { MetadataDateDropdown, taskDateMetadataIcons } from '@/features/metadata-fields'
import type { ProjectOption } from '@/features/project'
import type { TaskPriorityValue } from '@/features/task/model/taskPriority'
import { useCreateTaskMutation } from '@/features/task/hooks'
import {
	PriorityMetaAction,
	PlacementMetaAction,
	StatusMetaAction,
} from '@/features/task/components/TaskCreateMetaActions'
import { useSubmitTargetFromForm, type SubmitIntent } from '@/features/submit'
import { normalizeSubmitError, useZodForm } from '@/shared/form'
import type { Scope, Space, TaskPlacement, TaskStatus } from '@/shared/types'
import { CreateModalContent } from '@/shared/components/create-modal-content'
import {
	buildTaskCreateDefaultValues,
	taskCreateSchema,
	toTaskCreateInput,
} from '@/features/task/create/taskCreateForm'

type TaskCreateContentProps = {
	currentScope: Scope
	spaces: Space[]
	initialPlacement: TaskPlacement | null
	initialProjectId: string | null
	selectedSpaceId: string | null
	initialStatus: TaskStatus
	onClose: () => void
	projects: ProjectOption[]
	projectsLoading: boolean
}

/**
 * 任务创建表单 — 使用 CreateModalContent 组合 layout。
 * 壳层（Dialog + Header）由 CreateDialogShell 统一提供。
 */
export function TaskCreateContent({
	currentScope,
	spaces,
	initialPlacement,
	initialProjectId,
	selectedSpaceId,
	initialStatus,
	onClose,
	projects,
	projectsLoading,
}: TaskCreateContentProps) {
	const createTask = useCreateTaskMutation()
	const openTaskPage = useEntityDetailController().openPage
	const form = useZodForm({
		schema: taskCreateSchema,
		defaultValues: buildTaskCreateDefaultValues({
			currentScope,
			spaces,
			initialPlacement,
			initialProjectId,
			selectedSpaceId,
			initialStatus,
			projects,
		}),
	})
	const { field: titleField, fieldState: titleFieldState } = useController({
		control: form.control,
		name: 'title',
	})
	const { field: noteField, fieldState: noteFieldState } = useController({
		control: form.control,
		name: 'note',
	})
	const { field: priorityField } = useController({
		control: form.control,
		name: 'priority',
	})
	const { field: spaceIdField } = useController({ control: form.control, name: 'spaceId' })
	const { field: placementField } = useController({
		control: form.control,
		name: 'placement',
	})
	const { field: projectIdField } = useController({
		control: form.control,
		name: 'projectId',
	})
	const { field: statusField } = useController({ control: form.control, name: 'status' })
	const { field: dueAtField } = useController({ control: form.control, name: 'dueAt' })
	const { field: plannedAtField } = useController({
		control: form.control,
		name: 'plannedAt',
	})
	const { field: remindAtField } = useController({
		control: form.control,
		name: 'remindAt',
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

	const priority = priorityField.value as TaskPriorityValue
	const spaceId = spaceIdField.value
	const placement = placementField.value as TaskPlacement
	const projectId = projectIdField.value
	const status = statusField.value as TaskStatus
	const dueAt = dueAtField.value
	const plannedAt = plannedAtField.value
	const remindAt = remindAtField.value
	const hasPlacementTarget =
		placement === 'project' ? projectId.trim().length > 0 : spaceId.trim().length > 0
	const canSubmit = !isSubmitting && titleField.value.trim().length > 0 && hasPlacementTarget
	const placementError =
		form.formState.errors.projectId?.message ?? form.formState.errors.spaceId?.message ?? null
	const metadataError = submitState === 'error' ? errorMessage : placementError

	const resetFieldsOnly = useCallback(() => {
		const currentValues = form.getValues()
		form.reset({
			...currentValues,
			title: '',
			note: '',
			createMore: false,
		})
		setSubmitState('idle')
		setErrorMessage(null)
	}, [form])

	const submitTask = useCallback(
		async (intent: SubmitIntent = 'default') => {
			const isValid = await form.trigger()
			if (!isValid) {
				return
			}

			const values = form.getValues()
			const effectiveIntent = intent === 'default' && values.createMore ? 'continue' : intent

			setSubmitState('submitting')
			setErrorMessage(null)

			try {
				const createdTask = await createTask.mutateAsync(toTaskCreateInput(values))

				if (effectiveIntent === 'continue') {
					resetFieldsOnly()
					setCreatedCount((count) => count + 1)
					requestAnimationFrame(() => titleInputRef.current?.focus())
					return
				}

				resetFieldsOnly()
				onClose()
				if (effectiveIntent === 'open') {
					openTaskPage({ kind: 'task', id: createdTask.id })
				}
			} catch (error) {
				setSubmitState('error')
				setErrorMessage(normalizeSubmitError(error, '创建任务失败'))
			}
		},
		[createTask, form, onClose, openTaskPage, resetFieldsOnly],
	)

	useSubmitTargetFromForm({
		id: 'task-create',
		title: '创建任务',
		priority: 120,
		context: { source: 'task-create' as const },
		form,
		canSubmit,
		isSubmitting,
		supportedIntents: ['continue', 'open'],
		submit: submitTask,
	})

	const submitButton = (
		<Button isDisabled={!canSubmit} isPending={isSubmitting} size='sm' type='submit'>
			{submitState === 'submitting' ? '创建中…' : '创建任务'}
		</Button>
	)

	return (
		<FormProvider {...form}>
			<Form
				aria-label='创建任务'
				className='flex min-h-0 flex-1 flex-col'
				validationBehavior='aria'
				onSubmit={(event) => {
					event.preventDefault()
					void submitTask('default')
				}}
			>
				<CreateModalContent>
					<CreateModalContent.Title>
						<TextField
							aria-label='任务标题'
							fullWidth
							isInvalid={titleFieldState.invalid}
							isRequired
							name={titleField.name}
							value={titleField.value}
							onChange={titleField.onChange}
						>
							<Input
								ref={titleInputRef}
								autoFocus
								aria-label='任务标题'
								className='h-auto text-lg font-semibold'
								onBlur={titleField.onBlur}
								placeholder='任务标题'
								variant='secondary'
							/>
							<FieldError>{titleFieldState.error?.message}</FieldError>
						</TextField>
					</CreateModalContent.Title>

					<CreateModalContent.Body>
						<TextField
							aria-label='任务描述'
							fullWidth
							isInvalid={noteFieldState.invalid}
							name={noteField.name}
							value={noteField.value}
							onChange={noteField.onChange}
						>
							<TextArea
								aria-label='任务描述'
								className='min-h-20 resize-none text-[13px] leading-5'
								onBlur={noteField.onBlur}
								placeholder='添加描述...'
								variant='secondary'
							/>
							<FieldError>{noteFieldState.error?.message}</FieldError>
						</TextField>
					</CreateModalContent.Body>

					<CreateModalContent.Metadata error={metadataError}>
						<StatusMetaAction
							disabled={false}
							status={status}
							onStatusChange={statusField.onChange}
						/>
						<PriorityMetaAction
							disabled={false}
							priority={priority}
							onPriorityChange={priorityField.onChange}
						/>
						<PlacementMetaAction
							disabled={projectsLoading}
							placement={placement}
							spaceId={spaceId}
							projectId={projectId}
							projects={projects}
							spaces={spaces.map((space) => ({ id: space.id, name: space.name }))}
							onPlacementChange={(newPlacement, newProjectId) => {
								placementField.onChange(newPlacement)
								projectIdField.onChange(newProjectId ?? '')
								if (newPlacement === 'project' && newProjectId) {
									const targetProject = projects.find((project) => project.id === newProjectId)
									if (targetProject) {
										spaceIdField.onChange(targetProject.spaceId)
									}
									return
								}

								form.setValue('spaceId', spaceId, {
									shouldDirty: true,
									shouldValidate: true,
								})
							}}
						/>
						<MetadataDateDropdown
							icon={taskDateMetadataIcons.due}
							label='截止时间'
							value={dueAt}
							onChange={dueAtField.onChange}
						/>
						<MetadataDateDropdown
							icon={taskDateMetadataIcons.scheduled}
							label='计划时间'
							value={plannedAt}
							onChange={plannedAtField.onChange}
						/>
						<MetadataDateDropdown
							icon={taskDateMetadataIcons.reminder}
							label='提醒时间'
							value={remindAt}
							onChange={remindAtField.onChange}
						/>
					</CreateModalContent.Metadata>

					<CreateModalContent.Footer>
						<span aria-hidden />

						<div className='flex items-center gap-3'>
							<p
								aria-live='polite'
								className='min-w-30 text-right text-[11px] font-medium tabular-nums text-muted'
							>
								{createdCount > 0 ? `已创建 ${createdCount} 条任务` : '\u00A0'}
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
								<CommandActionTooltip commandId={COMMAND_IDS.saveOrSubmit} label='创建任务'>
									{submitButton}
								</CommandActionTooltip>
							) : (
								<DisabledCommandActionTooltip commandId={COMMAND_IDS.saveOrSubmit} label='创建任务'>
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

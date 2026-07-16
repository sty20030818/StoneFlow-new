import { useCallback, useRef, useState } from 'react'
import { FormProvider, useController } from 'react-hook-form'
import { toast } from 'sonner'

import { useEntityDetailController } from '@/features/entity-detail'
import { MetadataDateDropdown, taskDateMetadataIcons } from '@/features/metadata-fields'
import type { ProjectOption } from '@/features/project/model/types'
import type { TaskPriorityValue } from '@/features/task/model/taskPriority'
import { useCreateTaskMutation } from '@/features/task/hooks'
import {
	PriorityMetaAction,
	PlacementMetaAction,
	StatusMetaAction,
} from '@/features/task/components/TaskCreateMetaActions'
import { useSubmitTargetFromForm, type SubmitIntent } from '@/features/submit/model'
import { normalizeSubmitError, useZodForm } from '@/shared/form'
import type { Scope, Space, TaskPlacement, TaskStatus } from '@/shared/types'
import { Button } from '@/shared/components/base/button'
import { Input } from '@/shared/components/base/input'
import { Switch } from '@/shared/components/base/switch'
import { Textarea } from '@/shared/components/base/textarea'
import { CreateModalContent } from '@/shared/components/create-modal-content'
import { MoreHorizontalIcon, PaperclipIcon, TagIcon } from 'lucide-react'
import {
	buildTaskCreateDefaultValues,
	taskCreateSchema,
	toTaskCreateInput,
} from './TaskCreateContent.form'

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
	const { field: titleField } = useController({ control: form.control, name: 'title' })
	const { field: noteField } = useController({ control: form.control, name: 'note' })
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
	const { field: scheduledAtField } = useController({
		control: form.control,
		name: 'scheduledAt',
	})
	const { field: reminderAtField } = useController({
		control: form.control,
		name: 'reminderAt',
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
	const scheduledAt = scheduledAtField.value
	const reminderAt = reminderAtField.value
	const hasPlacementTarget =
		placement === 'project' ? projectId.trim().length > 0 : spaceId.trim().length > 0
	const canSubmit = !isSubmitting && titleField.value.trim().length > 0 && hasPlacementTarget

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

	return (
		<FormProvider {...form}>
			<CreateModalContent>
				<CreateModalContent.Title>
					<Input
						ref={titleInputRef}
						autoFocus
						className='h-auto border-none bg-transparent px-0 text-lg font-black shadow-none focus-visible:ring-0 md:text-lg md:font-black'
						onBlur={titleField.onBlur}
						onChange={titleField.onChange}
						placeholder='任务标题'
						value={titleField.value}
					/>
				</CreateModalContent.Title>

				<CreateModalContent.Body>
					<Textarea
						className='min-h-20 resize-none border-none bg-transparent px-0 text-[13px] leading-5 shadow-none placeholder:text-sf-text-quaternary focus-visible:ring-0'
						onBlur={noteField.onBlur}
						onChange={noteField.onChange}
						placeholder='添加描述...'
						value={noteField.value}
					/>
				</CreateModalContent.Body>

				<CreateModalContent.Metadata error={submitState === 'error' ? errorMessage : null}>
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
						value={scheduledAt}
						onChange={scheduledAtField.onChange}
					/>
					<MetadataDateDropdown
						icon={taskDateMetadataIcons.reminder}
						label='提醒时间'
						value={reminderAt}
						onChange={reminderAtField.onChange}
					/>
					<Button onClick={() => toast.info('标签功能即将支持')} size='sm' variant='outline'>
						<TagIcon />
						标签
					</Button>
					<Button onClick={() => toast.info('更多属性即将支持')} size='icon-sm' variant='outline'>
						<MoreHorizontalIcon />
					</Button>
				</CreateModalContent.Metadata>

				<CreateModalContent.Footer>
					<Button
						onClick={() => toast.info('附件上传功能即将支持')}
						size='icon-sm'
						variant='outline'
					>
						<PaperclipIcon />
					</Button>

					<div className='flex items-center gap-3'>
						<p
							aria-live='polite'
							className='min-w-30 text-right text-[11px] font-medium tabular-nums text-sf-text-tertiary'
						>
							{createdCount > 0 ? `已创建 ${createdCount} 条任务` : '\u00A0'}
						</p>
						<div className='flex items-center gap-1.5 text-[12px] text-sf-text-secondary select-none'>
							<Switch
								checked={createMoreField.value}
								onCheckedChange={(checked) => createMoreField.onChange(checked === true)}
								disabled={isSubmitting}
								size='sm'
							/>
							创建更多
						</div>
						<Button disabled={!canSubmit} onClick={() => void submitTask('default')} size='sm'>
							{submitState === 'submitting' ? '创建中…' : '创建任务'}
						</Button>
					</div>
				</CreateModalContent.Footer>
			</CreateModalContent>
		</FormProvider>
	)
}

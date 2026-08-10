import { useCallback, useRef, useState } from 'react'
import { FormProvider, useController } from 'react-hook-form'

import { useCreateProjectMutation } from '../hooks/project.mutations'
import type { ProjectDetail } from '../model/types'
import { COMMAND_IDS, CommandActionTooltip } from '@/features/command'
import { useSubmitTargetFromForm, type SubmitIntent } from '@/features/submit'
import { normalizeSubmitError, useZodForm } from '@/shared/form'
import { Button } from '@/shared/components/base/button'
import { Input } from '@/shared/components/base/input'
import { Switch } from '@/shared/components/base/switch'
import { Textarea } from '@/shared/components/base/textarea'
import { CreateModalContent } from '@/shared/components/create-modal-content'
import { DisabledActionTooltip } from '@/shared/components/tooltip'
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
	const { field: nameField } = useController({ control: form.control, name: 'name' })
	const { field: descriptionField } = useController({
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
	const submitDisabledReason = isSubmitting
		? '正在创建项目'
		: nameField.value.trim().length === 0
			? '请先填写项目名称'
			: !selectedSpaceId
				? '请先选择所属 Space'
				: null

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
		<Button disabled={!canSubmit} onClick={() => void submitProject('default')} size='sm'>
			{submitState === 'submitting' ? '创建中…' : '创建项目'}
		</Button>
	)

	return (
		<FormProvider {...form}>
			<CreateModalContent>
				<CreateModalContent.Title>
					<Input
						ref={titleInputRef}
						autoFocus
						className='h-auto border-none bg-transparent px-0 text-lg font-black shadow-none focus-visible:ring-0 md:text-lg md:font-black'
						onBlur={nameField.onBlur}
						onChange={nameField.onChange}
						placeholder='项目名称'
						value={nameField.value}
					/>
				</CreateModalContent.Title>

				<CreateModalContent.Body>
					<Textarea
						className='min-h-20 resize-none border-none bg-transparent px-0 text-[13px] leading-5 shadow-none placeholder:text-sf-text-quaternary focus-visible:ring-0'
						onBlur={descriptionField.onBlur}
						onChange={descriptionField.onChange}
						placeholder='添加项目说明…'
						value={descriptionField.value}
					/>
				</CreateModalContent.Body>

				{submitState === 'error' ? (
					<CreateModalContent.Metadata error={errorMessage}>{null}</CreateModalContent.Metadata>
				) : null}

				<CreateModalContent.Footer>
					<span aria-hidden />

					<div className='flex items-center gap-3'>
						<p
							aria-live='polite'
							className='min-w-30 text-right text-[11px] font-medium tabular-nums text-sf-text-tertiary'
						>
							{createdCount > 0 ? `已创建 ${createdCount} 个项目` : '\u00A0'}
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
						{submitDisabledReason ? (
							<DisabledActionTooltip label='创建项目' reason={submitDisabledReason}>
								{submitButton}
							</DisabledActionTooltip>
						) : (
							<CommandActionTooltip commandId={COMMAND_IDS.saveOrSubmit} label='创建项目'>
								{submitButton}
							</CommandActionTooltip>
						)}
					</div>
				</CreateModalContent.Footer>
			</CreateModalContent>
		</FormProvider>
	)
}

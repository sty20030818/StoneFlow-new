import {
	Alert,
	Button,
	Input,
	Label,
	ListBox,
	Modal,
	Select,
	ToggleButton,
	ToggleButtonGroup,
} from '@heroui/react'
import { useCallback, useEffect, useLayoutEffect, useMemo } from 'react'
import { FormProvider, useController } from 'react-hook-form'

import { useZodForm } from '@/shared/form'
import { useSubmitTargetFromForm } from '@/features/submit'
import type { TaskStatus } from '@/shared/types'
import type { ViewEditorDialogProps } from './ViewEditorDialog'
import {
	buildViewEditorDefaultValues,
	type PriorityMode,
	toCreateViewDraft,
	toUpdateViewInput,
	viewEditorSchema,
} from './ViewEditorDialog.form'

const STATUS_OPTIONS: Array<{ key: TaskStatus; label: string }> = [
	{ key: 'todo', label: '待办' },
	{ key: 'doing', label: '进行中' },
	{ key: 'waiting', label: '等待中' },
	{ key: 'done', label: '已完成' },
	{ key: 'canceled', label: '已取消' },
]

export function ViewEditorDialogContent({
	flow,
	view,
	projects,
	onCreate,
	onUpdate,
	onSubmitReady,
}: ViewEditorDialogProps & {
	onSubmitReady: (submit: () => Promise<void>) => () => void
}) {
	const { open, sessionKey, pending, error, savedView, close, retryOpen } = flow
	const form = useZodForm({
		schema: viewEditorSchema,
		defaultValues: buildViewEditorDefaultValues(view),
	})
	const { field: nameField } = useController({ control: form.control, name: 'name' })
	const { field: statusListField } = useController({
		control: form.control,
		name: 'statusList',
	})
	const { field: priorityModeField } = useController({
		control: form.control,
		name: 'priorityMode',
	})
	const { field: projectModeField } = useController({
		control: form.control,
		name: 'projectMode',
	})
	const { field: specificProjectIdField } = useController({
		control: form.control,
		name: 'specificProjectId',
	})
	const { field: dueModeField } = useController({ control: form.control, name: 'dueMode' })
	const { field: plannedModeField } = useController({
		control: form.control,
		name: 'plannedMode',
	})

	useEffect(() => {
		if (!open) {
			return
		}

		form.reset(buildViewEditorDefaultValues(view))
	}, [form, open, sessionKey, view])

	const submitLabel = view ? '保存视图' : '创建保存视图'
	const activeProjectOptions = useMemo(
		() => projects.slice().sort((left, right) => left.name.localeCompare(right.name, 'zh-CN')),
		[projects],
	)

	const statusList = statusListField.value
	const priorityMode = priorityModeField.value as PriorityMode
	const projectMode = projectModeField.value
	const specificProjectId = specificProjectIdField.value
	const dueMode = dueModeField.value
	const plannedMode = plannedModeField.value
	const hasSpecificProject = projectMode !== 'specific' || specificProjectId !== 'none'
	const canSubmit =
		nameField.value.trim().length > 0 && (view ? true : statusList.length > 0 && hasSpecificProject)
	const submitting = pending !== null
	const readOnly = submitting || Boolean(savedView)

	const handleSubmit = useCallback(async () => {
		if (submitting) return
		if (savedView) {
			await retryOpen()
			return
		}
		const values = form.getValues()
		if (!viewEditorSchema.safeParse(values).success) {
			await form.trigger()
			return
		}
		if (view) await onUpdate(toUpdateViewInput(values, view.id))
		else await onCreate(toCreateViewDraft(values))
	}, [form, onCreate, onUpdate, retryOpen, savedView, submitting, view])
	useLayoutEffect(() => onSubmitReady(handleSubmit), [handleSubmit, onSubmitReady])

	useSubmitTargetFromForm({
		id: open ? (view ? `view-editor:${view.id}` : 'view-editor:create') : null,
		title: savedView ? '打开已保存视图' : submitLabel,
		priority: 100,
		context: { source: 'view-editor' as const },
		form,
		canSubmit: Boolean(savedView) || canSubmit,
		isSubmitting: submitting,
		submit: handleSubmit,
	})

	return (
		<FormProvider {...form}>
			<Modal.Body>
				<div className='grid gap-1.5'>
					<Label htmlFor='view-editor-name'>名称</Label>
					<Input
						fullWidth
						id='view-editor-name'
						onBlur={nameField.onBlur}
						onChange={nameField.onChange}
						readOnly={readOnly}
						value={nameField.value}
					/>
				</div>
				{error ? (
					<Alert className='mt-3' role='alert' status='danger'>
						<Alert.Indicator />
						<Alert.Content className='min-w-0'>
							<Alert.Title>
								{error.kind === 'open' ? '已保存，但未能打开' : view ? '重命名失败' : '创建失败'}
							</Alert.Title>
							<Alert.Description className='wrap-anywhere'>{error.message}</Alert.Description>
						</Alert.Content>
					</Alert>
				) : null}

				{view ? null : (
					<section className='grid gap-2'>
						<Label>状态筛选</Label>
						<ToggleButtonGroup
							aria-label='状态筛选'
							isDetached
							isDisabled={readOnly}
							selectedKeys={statusList}
							selectionMode='multiple'
							onSelectionChange={(keys) =>
								statusListField.onChange(Array.from(keys, String) as TaskStatus[])
							}
						>
							{STATUS_OPTIONS.map((status) => (
								<ToggleButton id={status.key} key={status.key} variant='ghost'>
									{status.label}
								</ToggleButton>
							))}
						</ToggleButtonGroup>
					</section>
				)}

				{view ? null : (
					<section className='grid gap-3 md:grid-cols-2'>
						<DialogSelect
							disabled={readOnly}
							label='优先级'
							onValueChange={(value) => priorityModeField.onChange(value as PriorityMode)}
							options={[
								{ value: 'any', label: '不限' },
								{ value: 'p4', label: '仅 P4' },
								{ value: 'p3+', label: 'P3 及以上' },
								{ value: 'p2+', label: 'P2 及以上' },
								{ value: 'p1+', label: 'P1 及以上' },
							]}
							value={priorityMode}
						/>
						<DialogSelect
							disabled={readOnly}
							label='查询范围'
							onValueChange={(value) =>
								projectModeField.onChange(value as 'any' | 'none' | 'specific')
							}
							options={[
								{ value: 'any', label: '全部任务' },
								{ value: 'none', label: '仅独立事项' },
								{ value: 'specific', label: '指定项目' },
							]}
							value={projectMode}
						/>
						<DialogSelect
							disabled={readOnly || projectMode !== 'specific'}
							label='指定项目'
							onValueChange={specificProjectIdField.onChange}
							options={[
								{ value: 'none', label: '请选择项目' },
								...activeProjectOptions.map((project) => ({
									value: project.id,
									label: project.name,
								})),
							]}
							value={specificProjectId}
						/>
						<DialogSelect
							disabled={readOnly}
							label='截止时间'
							onValueChange={dueModeField.onChange}
							options={[
								{ value: 'none', label: '不限' },
								{ value: 'today', label: '今天' },
								{ value: 'overdue', label: '已逾期' },
								{ value: 'future', label: '未来' },
								{ value: 'hasDate', label: '有日期' },
							]}
							value={dueMode}
						/>
						<DialogSelect
							disabled={readOnly}
							label='计划时间'
							onValueChange={plannedModeField.onChange}
							options={[
								{ value: 'none', label: '不限' },
								{ value: 'today', label: '今天' },
								{ value: 'future', label: '未来' },
								{ value: 'overdue', label: '已逾期' },
								{ value: 'hasDate', label: '有日期' },
							]}
							value={plannedMode}
						/>
					</section>
				)}
			</Modal.Body>

			<Modal.Footer>
				<Button onPress={close} type='button' variant='ghost'>
					{savedView ? '关闭' : '取消'}
				</Button>
				<Button isDisabled={!savedView && !canSubmit} isPending={submitting} type='submit'>
					{savedView ? '打开已保存视图' : error?.kind === 'write' ? '重试保存' : submitLabel}
				</Button>
			</Modal.Footer>
		</FormProvider>
	)
}

function DialogSelect({
	label,
	value,
	options,
	onValueChange,
	disabled = false,
}: {
	label: string
	value: string
	options: Array<{ value: string; label: string }>
	onValueChange: (value: string) => void
	disabled?: boolean
}) {
	return (
		<Select
			fullWidth
			isDisabled={disabled}
			onChange={(key) => typeof key === 'string' && onValueChange(key)}
			value={value}
		>
			<Label>{label}</Label>
			<Select.Trigger>
				<Select.Value />
				<Select.Indicator />
			</Select.Trigger>
			<Select.Popover>
				<ListBox>
					{options.map((option) => (
						<ListBox.Item id={option.value} key={option.value} textValue={option.label}>
							{option.label}
							<ListBox.ItemIndicator />
						</ListBox.Item>
					))}
				</ListBox>
			</Select.Popover>
		</Select>
	)
}

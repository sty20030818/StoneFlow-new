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
import { ListFilterIcon, XIcon } from 'lucide-react'
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { FormProvider, useController } from 'react-hook-form'

import type { ProjectOption } from '@/features/project'
import { normalizeSubmitError, useZodForm } from '@/shared/form'
import { useSubmitTargetFromForm } from '@/features/submit'
import { ActionTooltip } from '@/shared/components/tooltip'
import type { TaskStatus, UpdateViewInput, View } from '@/shared/types'
import {
	buildViewEditorDefaultValues,
	type CreateViewDraft,
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

type ViewEditorDialogProps = {
	open: boolean
	view: View | null
	projects: ProjectOption[]
	isSubmitting: boolean
	onClose: () => void
	onCreate: (input: CreateViewDraft) => Promise<void>
	onUpdate: (input: UpdateViewInput) => Promise<void>
}

export function ViewEditorDialog({
	open,
	view,
	projects,
	isSubmitting,
	onClose,
	onCreate,
	onUpdate,
}: ViewEditorDialogProps) {
	const renameRequest = useRef<symbol | null>(null)
	const [renaming, setRenaming] = useState(false)
	const [renameError, setRenameError] = useState<string | null>(null)
	const [session, setSession] = useState({ open, view })
	if (session.open !== open || session.view !== view) {
		setSession({ open, view })
		setRenaming(false)
		setRenameError(null)
	}
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
		renameRequest.current = null
		if (!open) {
			return
		}

		form.reset(buildViewEditorDefaultValues(view))
		return () => {
			renameRequest.current = null
		}
	}, [form, open, view])
	const closeEditor = useCallback(() => {
		renameRequest.current = null
		onClose()
	}, [onClose])

	const submitLabel = view ? '保存视图' : '创建保存视图'
	const title = view ? '编辑保存视图' : '新建保存视图'
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
	const descriptionId = useId()
	const hasSpecificProject = projectMode !== 'specific' || specificProjectId !== 'none'
	const canSubmit =
		nameField.value.trim().length > 0 && (view ? true : statusList.length > 0 && hasSpecificProject)
	const submitting = view ? renaming : isSubmitting

	const handleSubmit = useCallback(async () => {
		if (view) {
			if (renameRequest.current) return
			const request = Symbol('rename-view')
			renameRequest.current = request
			const input = toUpdateViewInput(form.getValues(), view.id)
			setRenaming(true)
			setRenameError(null)
			try {
				if (!(await form.trigger()) || renameRequest.current !== request) return
				await onUpdate(input)
				if (renameRequest.current === request) closeEditor()
			} catch (error) {
				if (renameRequest.current === request) {
					setRenameError(normalizeSubmitError(error, '重命名失败，请重试。'))
				}
			} finally {
				if (renameRequest.current === request) {
					renameRequest.current = null
					setRenaming(false)
				}
			}
			return
		}
		const isValid = await form.trigger()
		if (!isValid) {
			return
		}

		const values = form.getValues()

		await onCreate(toCreateViewDraft(values))

		onClose()
	}, [closeEditor, form, onClose, onCreate, onUpdate, view])

	useSubmitTargetFromForm({
		id: open ? (view ? `view-editor:${view.id}` : 'view-editor:create') : null,
		title: view ? '保存视图' : '创建保存视图',
		priority: 100,
		context: { source: 'view-editor' as const },
		form,
		canSubmit,
		isSubmitting: submitting,
		submit: handleSubmit,
	})

	return (
		<Modal.Backdrop isOpen={open} onOpenChange={(nextOpen) => !nextOpen && closeEditor()}>
			<Modal.Container placement='center' scroll='inside' size='lg'>
				<Modal.Dialog
					aria-describedby={descriptionId}
					className='max-w-3xl overflow-hidden'
					render={(dialogProps) => (
						<section
							{...dialogProps}
							onKeyDown={(event) => {
								if (event.key === 'Tab') return
								if (event.key !== 'Escape' || event.defaultPrevented) event.stopPropagation()
							}}
						/>
					)}
				>
					<ActionTooltip label='关闭'>
						<Button
							aria-label='关闭保存视图编辑窗口'
							className='absolute end-3 top-3'
							isIconOnly
							size='sm'
							slot='close'
							type='button'
							variant='ghost'
						>
							<XIcon aria-hidden className='size-3.5' />
						</Button>
					</ActionTooltip>
					<FormProvider {...form}>
						<form
							className='flex min-h-0 flex-col'
							onSubmit={(event) => {
								event.preventDefault()
								void handleSubmit()
							}}
						>
							<Modal.Header>
								<div className='flex flex-col gap-3 ps-2 pe-10'>
									<div className='flex items-center gap-2'>
										<ListFilterIcon aria-hidden className='size-4 shrink-0 text-muted' />
										<Modal.Heading>{title}</Modal.Heading>
									</div>
									<p className='max-w-140 text-sm text-muted' id={descriptionId}>
										{view
											? '这里仅修改名称；查询条件请在保存视图详情中修改并覆盖。'
											: '保存视图固定查询边界与筛选；分组和排序仍由「显示」独立管理。'}
									</p>
								</div>
							</Modal.Header>

							<Modal.Body>
								<div className='grid gap-1.5'>
									<Label htmlFor='view-editor-name'>名称</Label>
									<Input
										fullWidth
										id='view-editor-name'
										onBlur={nameField.onBlur}
										onChange={nameField.onChange}
										readOnly={Boolean(view) && renaming}
										value={nameField.value}
									/>
								</div>
								{view && renameError ? (
									<Alert className='mt-3' role='alert' status='danger'>
										<Alert.Indicator />
										<Alert.Content className='min-w-0'>
											<Alert.Title>重命名失败</Alert.Title>
											<Alert.Description className='wrap-anywhere'>{renameError}</Alert.Description>
										</Alert.Content>
									</Alert>
								) : null}

								{view ? null : (
									<section className='grid gap-2'>
										<Label>状态筛选</Label>
										<ToggleButtonGroup
											aria-label='状态筛选'
											isDetached
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
											disabled={projectMode !== 'specific'}
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
								<Button onPress={closeEditor} type='button' variant='ghost'>
									取消
								</Button>
								<Button
									isDisabled={!canSubmit || (!view && isSubmitting)}
									isPending={Boolean(view) && renaming}
									type='submit'
								>
									{view && renameError ? '重试保存' : submitLabel}
								</Button>
							</Modal.Footer>
						</form>
					</FormProvider>
				</Modal.Dialog>
			</Modal.Container>
		</Modal.Backdrop>
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

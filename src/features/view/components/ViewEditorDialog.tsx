import { useCallback, useEffect, useMemo } from 'react'
import { FormProvider, useController } from 'react-hook-form'

import type { ProjectOption } from '@/features/project'
import { useZodForm } from '@/shared/form'
import { useSubmitTargetFromForm } from '@/features/submit'
import { cn } from '@/shared/lib/utils'
import type {
	CreateViewInput,
	TaskGroupBy,
	TaskStatus,
	TaskViewFilters,
	UpdateViewInput,
	View,
	ViewSortField,
	ViewSortRule,
} from '@/shared/types'
import { Button } from '@/shared/components/base/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/shared/components/base/dialog'
import { Input } from '@/shared/components/base/input'
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/shared/components/base/select'
import {
	dialogShellContentVariants,
	dialogShellDescriptionClass,
	dialogShellPanelFooterClass,
	dialogShellHeaderClass,
	dialogShellTitleClass,
} from '@/shared/components/patterns/dialog-shell'
import { formFieldGridClass, formFieldLabelVariants } from '@/shared/components/patterns/form-field'
import {
	buildViewEditorDefaultValues,
	type PriorityMode,
	toCreateViewInput,
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

const GROUP_BY_OPTIONS: Array<{ value: TaskGroupBy; label: string }> = [
	{ value: 'none', label: '不分组' },
	{ value: 'status', label: '按状态' },
	{ value: 'priority', label: '按优先级' },
	{ value: 'project', label: '按项目' },
	{ value: 'due', label: '按截止时间' },
	{ value: 'planned', label: '按计划时间' },
]

const SORT_FIELD_OPTIONS: Array<{ value: ViewSortField; label: string }> = [
	{ value: 'priority', label: '优先级' },
	{ value: 'dueAt', label: '截止时间' },
	{ value: 'plannedAt', label: '计划时间' },
	{ value: 'createdAt', label: '创建时间' },
	{ value: 'updatedAt', label: '更新时间' },
	{ value: 'completedAt', label: '完成时间' },
	{ value: 'position', label: '原始排序' },
]

type ViewEditorDialogProps = {
	open: boolean
	view: View | null
	projects: ProjectOption[]
	isSubmitting: boolean
	onClose: () => void
	onCreate: (input: CreateViewInput) => Promise<void>
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
	const { field: groupByField } = useController({ control: form.control, name: 'groupBy' })
	const { field: sortFieldField } = useController({
		control: form.control,
		name: 'sortField',
	})
	const { field: sortDirectionField } = useController({
		control: form.control,
		name: 'sortDirection',
	})

	useEffect(() => {
		if (!open) {
			return
		}

		form.reset(buildViewEditorDefaultValues(view))
	}, [form, open, view])

	const submitLabel = view ? '保存视图' : '创建视图'
	const title = view ? '编辑视图' : '新建自定义视图'
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
	const groupBy = groupByField.value as TaskGroupBy
	const sortField = sortFieldField.value as ViewSortField
	const sortDirection = sortDirectionField.value as ViewSortRule['direction']
	const hasSpecificProject = projectMode !== 'specific' || specificProjectId !== 'none'
	const canSubmit = nameField.value.trim().length > 0 && statusList.length > 0 && hasSpecificProject

	function toggleStatus(status: TaskStatus) {
		statusListField.onChange(
			statusList.includes(status)
				? statusList.filter((item) => item !== status)
				: [...statusList, status],
		)
	}

	const handleSubmit = useCallback(async () => {
		const isValid = await form.trigger()
		if (!isValid) {
			return
		}

		const values = form.getValues()

		if (view) {
			await onUpdate(toUpdateViewInput(values, view.id))
		} else {
			await onCreate(toCreateViewInput(values))
		}

		onClose()
	}, [form, onClose, onCreate, onUpdate, view])

	useSubmitTargetFromForm({
		id: open ? (view ? `view-editor:${view.id}` : 'view-editor:create') : null,
		title: view ? '保存视图' : '创建视图',
		priority: 100,
		context: { source: 'view-editor' as const },
		form,
		canSubmit,
		isSubmitting,
		submit: handleSubmit,
	})

	return (
		<Dialog onOpenChange={(nextOpen) => !nextOpen && onClose()} open={open}>
			<DialogContent className={dialogShellContentVariants({ size: 'wide' })}>
				<FormProvider {...form}>
					<DialogHeader className={dialogShellHeaderClass}>
						<DialogTitle className={dialogShellTitleClass}>{title}</DialogTitle>
						<DialogDescription className={`max-w-140 ${dialogShellDescriptionClass}`}>
							自定义视图只保存筛选、排序与分组规则，不会拥有任务本身。
						</DialogDescription>
					</DialogHeader>

					<div className='grid gap-5 px-6 py-5'>
						<div className={formFieldGridClass}>
							<label
								className={formFieldLabelVariants({ tone: 'muted' })}
								htmlFor='view-editor-name'
							>
								名称
							</label>
							<Input
								id='view-editor-name'
								onBlur={nameField.onBlur}
								onChange={nameField.onChange}
								value={nameField.value}
							/>
						</div>

						<section className='grid gap-2'>
							<div className={formFieldLabelVariants({ tone: 'muted' })}>状态筛选</div>
							<div className='flex flex-wrap gap-2'>
								{STATUS_OPTIONS.map((status) => (
									<Button
										className={cn(
											'rounded-full',
											statusList.includes(status.key)
												? 'border-primary bg-primary text-primary-foreground'
												: undefined,
										)}
										key={status.key}
										onClick={() => toggleStatus(status.key)}
										type='button'
										variant={statusList.includes(status.key) ? 'default' : 'outline'}
									>
										{status.label}
									</Button>
								))}
							</div>
						</section>

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
								label='项目归属'
								onValueChange={(value) =>
									projectModeField.onChange(value as 'any' | 'none' | 'specific')
								}
								options={[
									{ value: 'any', label: '不限' },
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
								onValueChange={(value) =>
									dueModeField.onChange(value as NonNullable<TaskViewFilters['due']>['mode'])
								}
								options={[
									{ value: 'none', label: '不限' },
									{ value: 'today', label: '今天' },
									{ value: 'overdue', label: '已逾期' },
									{ value: 'future', label: '未来' },
								]}
								value={dueMode}
							/>
							<DialogSelect
								label='计划时间'
								onValueChange={(value) =>
									plannedModeField.onChange(
										value as NonNullable<TaskViewFilters['planned']>['mode'],
									)
								}
								options={[
									{ value: 'none', label: '不限' },
									{ value: 'today', label: '今天' },
									{ value: 'future', label: '未来' },
									{ value: 'past', label: '过去' },
								]}
								value={plannedMode}
							/>
						</section>

						<section className='grid gap-3 md:grid-cols-3'>
							<DialogSelect
								label='分组方式'
								onValueChange={(value) => groupByField.onChange(value as TaskGroupBy)}
								options={GROUP_BY_OPTIONS}
								value={groupBy}
							/>
							<DialogSelect
								label='主排序字段'
								onValueChange={(value) => sortFieldField.onChange(value as ViewSortField)}
								options={SORT_FIELD_OPTIONS}
								value={sortField}
							/>
							<DialogSelect
								label='排序方向'
								onValueChange={(value) =>
									sortDirectionField.onChange(value as ViewSortRule['direction'])
								}
								options={[
									{ value: 'asc', label: '升序' },
									{ value: 'desc', label: '降序' },
								]}
								value={sortDirection}
							/>
						</section>
					</div>

					<DialogFooter className={dialogShellPanelFooterClass}>
						<Button onClick={onClose} type='button' variant='outline'>
							取消
						</Button>
						<Button
							disabled={!canSubmit || isSubmitting}
							onClick={() => void handleSubmit()}
							type='button'
						>
							{submitLabel}
						</Button>
					</DialogFooter>
				</FormProvider>
			</DialogContent>
		</Dialog>
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
		<div className={formFieldGridClass}>
			<label className={formFieldLabelVariants({ tone: 'muted' })}>{label}</label>
			<Select disabled={disabled} onValueChange={onValueChange} value={value}>
				<SelectTrigger className='w-full'>
					<SelectValue />
				</SelectTrigger>
				<SelectContent position='popper'>
					<SelectGroup>
						{options.map((option) => (
							<SelectItem key={option.value} value={option.value}>
								{option.label}
							</SelectItem>
						))}
					</SelectGroup>
				</SelectContent>
			</Select>
		</div>
	)
}

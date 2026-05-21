import { useCallback, useEffect, useMemo, useState } from 'react'

import type { ProjectOption } from '@/features/project/model/types'
import { useRegisterSubmitTarget } from '@/features/submit/model'
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
import { Button } from '@/shared/ui/base/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/shared/ui/base/dialog'
import { Input } from '@/shared/ui/base/input'
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/shared/ui/base/select'
import { Textarea } from '@/shared/ui/base/textarea'
import {
	dialogShellContentVariants,
	dialogShellDescriptionClass,
	dialogShellPanelFooterClass,
	dialogShellHeaderClass,
	dialogShellTitleClass,
} from '@/shared/ui/patterns/dialog-shell'
import { formFieldGridClass, formFieldLabelVariants } from '@/shared/ui/patterns/form-field'

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
	{ value: 'scheduled', label: '按计划时间' },
]

const SORT_FIELD_OPTIONS: Array<{ value: ViewSortField; label: string }> = [
	{ value: 'priority', label: '优先级' },
	{ value: 'dueAt', label: '截止时间' },
	{ value: 'scheduledAt', label: '计划时间' },
	{ value: 'createdAt', label: '创建时间' },
	{ value: 'updatedAt', label: '更新时间' },
	{ value: 'completedAt', label: '完成时间' },
	{ value: 'sortOrder', label: '原始排序' },
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

type InboxMode = 'any' | 'inbox' | 'notInbox'
type PriorityMode = 'any' | 'p4' | 'p3+' | 'p2+' | 'p1+'

function getInitialFilters(view: View | null): TaskViewFilters {
	const filters = (view?.filters ?? {}) as TaskViewFilters
	return {
		status: filters.status ?? ['todo', 'doing', 'waiting'],
		priority: filters.priority,
		inbox: filters.inbox,
		project: filters.project,
		due: filters.due,
		scheduled: filters.scheduled,
		created: filters.created,
		updated: filters.updated,
		completed: filters.completed,
		archived: filters.archived ?? false,
		deleted: filters.deleted ?? false,
	}
}

function getPriorityMode(filters: TaskViewFilters): PriorityMode {
	const priority = filters.priority
	if (!priority) return 'any'
	if (priority.eq === 4) return 'p4'
	if (priority.gte === 3) return 'p3+'
	if (priority.gte === 2) return 'p2+'
	if (priority.gte === 1) return 'p1+'
	return 'any'
}

function getInboxMode(filters: TaskViewFilters): InboxMode {
	if (filters.inbox === true) return 'inbox'
	if (filters.inbox === false) return 'notInbox'
	return 'any'
}

function buildPriorityFilter(mode: PriorityMode): TaskViewFilters['priority'] | undefined {
	switch (mode) {
		case 'p4':
			return { eq: 4 }
		case 'p3+':
			return { gte: 3 }
		case 'p2+':
			return { gte: 2 }
		case 'p1+':
			return { gte: 1 }
		default:
			return undefined
	}
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
	const [name, setName] = useState('')
	const [description, setDescription] = useState('')
	const [statusList, setStatusList] = useState<TaskStatus[]>(['todo', 'doing', 'waiting'])
	const [priorityMode, setPriorityMode] = useState<PriorityMode>('any')
	const [inboxMode, setInboxMode] = useState<InboxMode>('any')
	const [projectMode, setProjectMode] = useState<'any' | 'none' | 'specific'>('any')
	const [specificProjectId, setSpecificProjectId] = useState<string>('none')
	const [dueMode, setDueMode] = useState<TaskViewFilters['due']>({ mode: 'none' })
	const [scheduledMode, setScheduledMode] = useState<TaskViewFilters['scheduled']>({ mode: 'none' })
	const [groupBy, setGroupBy] = useState<TaskGroupBy>('none')
	const [sortRule, setSortRule] = useState<ViewSortRule>({
		field: 'updatedAt',
		direction: 'desc',
	})

	useEffect(() => {
		if (!open) {
			return
		}

		const filters = getInitialFilters(view)
		const firstSortRule = view?.sort[0] ?? { field: 'updatedAt', direction: 'desc' as const }
		setName(view?.name ?? '')
		setDescription(view?.description ?? '')
		setStatusList(filters.status ?? ['todo', 'doing', 'waiting'])
		setPriorityMode(getPriorityMode(filters))
		setInboxMode(getInboxMode(filters))
		setProjectMode(filters.project?.mode ?? 'any')
		setSpecificProjectId(filters.project?.ids?.[0] ?? 'none')
		setDueMode(filters.due ?? { mode: 'none' })
		setScheduledMode(filters.scheduled ?? { mode: 'none' })
		setGroupBy(view?.groupBy ?? 'none')
		setSortRule(firstSortRule)
	}, [open, view])

	const submitLabel = view ? '保存视图' : '创建视图'
	const title = view ? '编辑视图' : '新建自定义视图'
	const activeProjectOptions = useMemo(
		() => projects.slice().sort((left, right) => left.name.localeCompare(right.name, 'zh-CN')),
		[projects],
	)

	const canSubmit = name.trim().length > 0 && statusList.length > 0

	function toggleStatus(status: TaskStatus) {
		setStatusList((current) =>
			current.includes(status) ? current.filter((item) => item !== status) : [...current, status],
		)
	}

	const handleSubmit = useCallback(async () => {
		if (!canSubmit) {
			return
		}

		const filters: TaskViewFilters = {
			status: statusList,
			priority: buildPriorityFilter(priorityMode),
			inbox: inboxMode === 'any' ? undefined : inboxMode === 'inbox',
			project:
				projectMode === 'any'
					? undefined
					: projectMode === 'none'
						? { mode: 'none' }
						: {
								mode: 'specific',
								ids: specificProjectId !== 'none' ? [specificProjectId] : [],
							},
			due: dueMode?.mode === 'none' ? undefined : dueMode,
			scheduled: scheduledMode?.mode === 'none' ? undefined : scheduledMode,
			archived: false,
			deleted: false,
		}

		if (view) {
			await onUpdate({
				viewId: view.id,
				name: name.trim(),
				description: description.trim() ? description : null,
				filters,
				sort: [sortRule],
				groupBy,
			})
		} else {
			await onCreate({
				entityType: 'task',
				name: name.trim(),
				description: description.trim() ? description : null,
				filters,
				sort: [sortRule],
				groupBy,
			})
		}

		onClose()
	}, [
		canSubmit,
		description,
		dueMode,
		groupBy,
		inboxMode,
		name,
		onClose,
		onCreate,
		onUpdate,
		priorityMode,
		projectMode,
		scheduledMode,
		sortRule,
		specificProjectId,
		statusList,
		view,
	])
	const submitTarget = useMemo(
		() =>
			open
				? {
						id: view ? `view-editor:${view.id}` : 'view-editor:create',
						title: view ? '保存视图' : '创建视图',
						priority: 100,
						canSubmit: canSubmit && !isSubmitting,
						submit: handleSubmit,
						context: { source: 'view-editor' as const },
					}
				: null,
		[canSubmit, handleSubmit, isSubmitting, open, view],
	)
	useRegisterSubmitTarget(submitTarget)

	return (
		<Dialog onOpenChange={(nextOpen) => !nextOpen && onClose()} open={open}>
			<DialogContent className={dialogShellContentVariants({ size: 'wide' })}>
				<DialogHeader className={dialogShellHeaderClass}>
					<DialogTitle className={dialogShellTitleClass}>{title}</DialogTitle>
					<DialogDescription className={`max-w-140 ${dialogShellDescriptionClass}`}>
						自定义视图只保存筛选、排序与分组规则，不会拥有任务本身。
					</DialogDescription>
				</DialogHeader>

				<div className='grid gap-5 px-6 py-5'>
					<section className='grid gap-3'>
						<div className={formFieldGridClass}>
							<label className={formFieldLabelVariants({ tone: 'muted' })}>名称</label>
							<Input onChange={(event) => setName(event.target.value)} value={name} />
						</div>
						<div className={formFieldGridClass}>
							<label className={formFieldLabelVariants({ tone: 'muted' })}>说明</label>
							<Textarea
								onChange={(event) => setDescription(event.target.value)}
								placeholder='给这个视图留一句简短说明'
								value={description}
							/>
						</div>
					</section>

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
							onValueChange={(value) => setPriorityMode(value as PriorityMode)}
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
							label='收件箱'
							onValueChange={(value) => setInboxMode(value as InboxMode)}
							options={[
								{ value: 'any', label: '不限' },
								{ value: 'inbox', label: '仅 Inbox' },
								{ value: 'notInbox', label: '排除 Inbox' },
							]}
							value={inboxMode}
						/>
						<DialogSelect
							label='项目归属'
							onValueChange={(value) => setProjectMode(value as 'any' | 'none' | 'specific')}
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
							onValueChange={setSpecificProjectId}
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
								setDueMode(
									value === 'none'
										? { mode: 'none' }
										: { mode: value as NonNullable<TaskViewFilters['due']>['mode'] },
								)
							}
							options={[
								{ value: 'none', label: '不限' },
								{ value: 'today', label: '今天' },
								{ value: 'overdue', label: '已逾期' },
								{ value: 'future', label: '未来' },
							]}
							value={dueMode?.mode ?? 'none'}
						/>
						<DialogSelect
							label='计划时间'
							onValueChange={(value) =>
								setScheduledMode(
									value === 'none'
										? { mode: 'none' }
										: { mode: value as NonNullable<TaskViewFilters['scheduled']>['mode'] },
								)
							}
							options={[
								{ value: 'none', label: '不限' },
								{ value: 'today', label: '今天' },
								{ value: 'future', label: '未来' },
								{ value: 'past', label: '过去' },
							]}
							value={scheduledMode?.mode ?? 'none'}
						/>
					</section>

					<section className='grid gap-3 md:grid-cols-3'>
						<DialogSelect
							label='分组方式'
							onValueChange={(value) => setGroupBy(value as TaskGroupBy)}
							options={GROUP_BY_OPTIONS}
							value={groupBy}
						/>
						<DialogSelect
							label='主排序字段'
							onValueChange={(value) =>
								setSortRule((current) => ({ ...current, field: value as ViewSortField }))
							}
							options={SORT_FIELD_OPTIONS}
							value={sortRule.field}
						/>
						<DialogSelect
							label='排序方向'
							onValueChange={(value) =>
								setSortRule((current) => ({
									...current,
									direction: value as ViewSortRule['direction'],
								}))
							}
							options={[
								{ value: 'asc', label: '升序' },
								{ value: 'desc', label: '降序' },
							]}
							value={sortRule.direction}
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

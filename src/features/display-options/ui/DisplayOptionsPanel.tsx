'use client'

import type { ReactNode } from 'react'

import {
	getTaskDisplayPageCapabilities,
	TASK_DISPLAY_COMPLETED_ORDER_VALUES,
	type ResolvedTaskDisplayOptions,
	type TaskDisplayPageKey,
	type TaskDisplayPropertyKey,
} from '@/features/display-options/core'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/base/button'
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/shared/ui/base/select'
import { Switch } from '@/shared/ui/base/switch'
import { formFieldHintClass, formFieldLabelVariants, formFieldStackClass } from '@/shared/ui/patterns/form-field'

import { DisplayOptionsSection } from './DisplayOptionsSection'
import { PropertyToggleGrid } from './PropertyToggleGrid'

type DisplayOptionsPanelActions = {
	setLayout: (layout: ResolvedTaskDisplayOptions['layout']) => Promise<void>
	setGrouping: (groupBy: ResolvedTaskDisplayOptions['groupBy']) => Promise<void>
	setSubGrouping: (subGroupBy: ResolvedTaskDisplayOptions['subGroupBy']) => Promise<void>
	setOrdering: (
		orderBy: ResolvedTaskDisplayOptions['orderBy'],
		orderDirection?: ResolvedTaskDisplayOptions['orderDirection'],
	) => Promise<void>
	setCompletedOrder: (completedOrder: ResolvedTaskDisplayOptions['completedOrder']) => Promise<void>
	applyPartial: (patch: Partial<ResolvedTaskDisplayOptions>) => Promise<void>
	setVisibleProperties: (visibleProperties: TaskDisplayPropertyKey[]) => Promise<void>
	resetToDefault: () => Promise<void>
}

type DisplayOptionsPanelProps = {
	pageKey: TaskDisplayPageKey
	options: ResolvedTaskDisplayOptions
	status: 'loading' | 'ready' | 'error'
	error?: string | null
	actions: DisplayOptionsPanelActions
	className?: string
}

const LAYOUT_LABELS: Record<ResolvedTaskDisplayOptions['layout'], string> = {
	list: '列表',
	board: '看板',
}

const GROUP_LABELS: Record<ResolvedTaskDisplayOptions['groupBy'], string> = {
	none: '不分组',
	status: '状态',
	priority: '优先级',
	project: '项目',
	due: '截止时间',
	scheduled: '计划时间',
}

const ORDER_LABELS: Record<ResolvedTaskDisplayOptions['orderBy'], string> = {
	smart: '智能排序',
	manual: '手动顺序',
	priority: '优先级',
	status: '状态',
	dueAt: '截止时间',
	scheduledAt: '计划时间',
	inboxAt: '进入收件箱时间',
	statusChangedAt: '状态更新时间',
	createdAt: '创建时间',
	updatedAt: '更新时间',
	completedAt: '完成时间',
	canceledAt: '取消时间',
}

const COMPLETED_ORDER_LABELS: Record<ResolvedTaskDisplayOptions['completedOrder'], string> = {
	recency: '最近变更优先',
	natural: '自然顺序',
}

const PROPERTY_META: Record<
	TaskDisplayPropertyKey,
	{ label: string; description: string }
> = {
	status: { label: '状态', description: '在列表行里保留任务当前状态。' },
	priority: { label: '优先级', description: '显示紧急程度，方便快速扫视。' },
	project: { label: '项目', description: '显示任务当前归属项目。' },
	dueAt: { label: '截止时间', description: '显示任务的 deadline 信息。' },
	scheduledAt: { label: '计划时间', description: '显示任务的计划执行时间。' },
	updatedAt: { label: '更新时间', description: '显示最近一次修改时间。' },
	createdAt: { label: '创建时间', description: '显示任务创建时间。' },
	links: { label: '链接', description: '显示任务关联的资源链接入口。' },
}

const TASK_DISPLAY_ORDERED_PROPERTIES = [
	'status',
	'priority',
	'project',
	'dueAt',
	'scheduledAt',
	'updatedAt',
	'createdAt',
	'links',
] as const satisfies readonly TaskDisplayPropertyKey[]

export function DisplayOptionsPanel({
	pageKey,
	options,
	status,
	error,
	actions,
	className,
}: DisplayOptionsPanelProps) {
	const capabilities = getTaskDisplayPageCapabilities(pageKey)
	const isPending = status === 'loading'
	const isErrored = status === 'error'
	const supportsSubGrouping =
		getAllowedSubGroupChoices(pageKey, options.layout).filter((item) => item !== 'none').length > 0
	const canToggleShowEmptyGroups =
		capabilities.supportsShowEmptyGroups && options.groupBy !== 'none'

	return (
		<div className={cn('flex w-[360px] max-w-[calc(100vw-24px)] flex-col gap-4', className)}>
			<DisplayOptionsSection
				description='布局只决定容器形态，不改变任务集合本身。'
				title='布局'
			>
				<DisplayOptionField
					disabled={isPending || capabilities.allowedLayouts.length <= 1}
					label='布局模式'
				>
					<Select
						disabled={isPending || capabilities.allowedLayouts.length <= 1}
						onValueChange={(value) =>
							void actions.setLayout(value as ResolvedTaskDisplayOptions['layout'])
						}
						value={options.layout}
					>
						<SelectTrigger aria-label='布局模式' className='w-full'>
							<SelectValue placeholder='选择布局' />
						</SelectTrigger>
						<SelectContent position='popper'>
							<SelectGroup>
								{capabilities.allowedLayouts.map((layout) => (
									<SelectItem key={layout} value={layout}>
										{LAYOUT_LABELS[layout]}
									</SelectItem>
								))}
							</SelectGroup>
						</SelectContent>
					</Select>
				</DisplayOptionField>
			</DisplayOptionsSection>

			<DisplayOptionsSection
				description='主分组先决定 section 结构，再由排序规则决定组内顺序。'
				title='分组'
			>
				<DisplayOptionField label='主分组'>
					<Select
						disabled={isPending}
						onValueChange={(value) =>
							void actions.setGrouping(value as ResolvedTaskDisplayOptions['groupBy'])
						}
						value={options.groupBy}
					>
						<SelectTrigger aria-label='主分组' className='w-full'>
							<SelectValue placeholder='选择主分组' />
						</SelectTrigger>
						<SelectContent position='popper'>
							<SelectGroup>
								{getAllowedGroupChoices(pageKey, options.layout).map((groupBy) => (
									<SelectItem key={groupBy} value={groupBy}>
										{GROUP_LABELS[groupBy]}
									</SelectItem>
								))}
							</SelectGroup>
						</SelectContent>
					</Select>
				</DisplayOptionField>

				{supportsSubGrouping ? (
					<DisplayOptionField label='子分组'>
						<Select
							disabled={isPending}
							onValueChange={(value) =>
								void actions.setSubGrouping(value as ResolvedTaskDisplayOptions['subGroupBy'])
							}
							value={options.subGroupBy}
						>
							<SelectTrigger aria-label='子分组' className='w-full'>
								<SelectValue placeholder='选择子分组' />
							</SelectTrigger>
							<SelectContent position='popper'>
								<SelectGroup>
									{getAllowedSubGroupChoices(pageKey, options.layout).map((groupBy) => (
										<SelectItem key={groupBy} value={groupBy}>
											{GROUP_LABELS[groupBy]}
										</SelectItem>
									))}
								</SelectGroup>
							</SelectContent>
						</Select>
					</DisplayOptionField>
				) : null}
			</DisplayOptionsSection>

			<DisplayOptionsSection
				description='排序只影响组内顺序，不改变筛选结果。'
				title='排序'
			>
				<DisplayOptionField label='排序依据'>
					<Select
						disabled={isPending}
						onValueChange={(value) =>
							void actions.setOrdering(value as ResolvedTaskDisplayOptions['orderBy'], options.orderDirection)
						}
						value={options.orderBy}
					>
						<SelectTrigger aria-label='排序依据' className='w-full'>
							<SelectValue placeholder='选择排序依据' />
						</SelectTrigger>
						<SelectContent position='popper'>
							<SelectGroup>
								{capabilities.allowedOrderBy.map((orderBy) => (
									<SelectItem key={orderBy} value={orderBy}>
										{ORDER_LABELS[orderBy]}
									</SelectItem>
								))}
							</SelectGroup>
						</SelectContent>
					</Select>
				</DisplayOptionField>

				<DisplayOptionField label='排序方向'>
					<Select
						disabled={isPending}
						onValueChange={(value) =>
							void actions.setOrdering(
								options.orderBy,
								value as ResolvedTaskDisplayOptions['orderDirection'],
							)
						}
						value={options.orderDirection}
					>
						<SelectTrigger aria-label='排序方向' className='w-full'>
							<SelectValue placeholder='选择排序方向' />
						</SelectTrigger>
						<SelectContent position='popper'>
							<SelectGroup>
								<SelectItem value='asc'>升序</SelectItem>
								<SelectItem value='desc'>降序</SelectItem>
							</SelectGroup>
						</SelectContent>
					</Select>
				</DisplayOptionField>

				{capabilities.allowedCompletedOrder.length > 0 ? (
					<DisplayOptionField label='已完成任务排序'>
						<Select
							disabled={isPending}
							onValueChange={(value) =>
								void actions.setCompletedOrder(
									value as ResolvedTaskDisplayOptions['completedOrder'],
								)
							}
							value={options.completedOrder}
						>
							<SelectTrigger aria-label='已完成任务排序' className='w-full'>
								<SelectValue placeholder='选择已完成排序' />
							</SelectTrigger>
							<SelectContent position='popper'>
								<SelectGroup>
									{TASK_DISPLAY_COMPLETED_ORDER_VALUES.filter((value) =>
										capabilities.allowedCompletedOrder.includes(value),
									).map((value) => (
										<SelectItem key={value} value={value}>
											{COMPLETED_ORDER_LABELS[value]}
										</SelectItem>
									))}
								</SelectGroup>
							</SelectContent>
						</Select>
					</DisplayOptionField>
				) : null}

				{canToggleShowEmptyGroups ? (
					<DisplayInlineSwitch
						checked={options.showEmptyGroups}
						description='分组模式下保留空组，方便看见完整结构。'
						disabled={isPending}
						label='显示空分组'
						onCheckedChange={(checked) => void actions.applyPartial({ showEmptyGroups: checked })}
					/>
				) : null}
			</DisplayOptionsSection>

			<DisplayOptionsSection
				description='这些开关只影响列表信息密度，不影响任务详情字段。'
				title='显示属性'
			>
				<PropertyToggleGrid
					items={capabilities.allowedVisibleProperties.map((key) => ({
						key,
						label: PROPERTY_META[key].label,
						description: PROPERTY_META[key].description,
						checked: options.visibleProperties.includes(key),
						disabled: isPending,
						onToggle: () => {
							const next = toggleVisibleProperty(options.visibleProperties, key)
							void actions.setVisibleProperties(next)
						},
					}))}
				/>
			</DisplayOptionsSection>

			<div className='flex items-center justify-between gap-3'>
				<div className='min-h-5'>
					{isErrored && error ? (
						<p className='text-[12px] leading-5 text-destructive'>{error}</p>
					) : isPending ? (
						<p className='text-[12px] leading-5 text-sf-shell-tertiary'>正在读取显示偏好…</p>
					) : null}
				</div>
				<Button
					disabled={isPending}
					onClick={() => void actions.resetToDefault()}
					size='sm'
					type='button'
					variant='secondary'
				>
					恢复默认
				</Button>
			</div>
		</div>
	)
}

function DisplayOptionField({
	label,
	children,
	disabled,
}: {
	label: string
	children: ReactNode
	disabled?: boolean
}) {
	return (
		<label className={cn(formFieldStackClass, disabled ? 'opacity-70' : undefined)}>
			<span className={formFieldLabelVariants()}>{label}</span>
			{children}
		</label>
	)
}

function DisplayInlineSwitch({
	label,
	description,
	checked,
	disabled,
	onCheckedChange,
}: {
	label: string
	description: string
	checked: boolean
	disabled?: boolean
	onCheckedChange: (checked: boolean) => void
}) {
	return (
		<div
			className={cn(
				'flex items-start justify-between gap-3 rounded-2xl border border-sf-border-subtle bg-muted/20 px-3 py-3',
				disabled ? 'opacity-70' : undefined,
			)}
		>
			<div className='min-w-0'>
				<p className='text-sm font-medium text-foreground'>{label}</p>
				<p className={formFieldHintClass}>{description}</p>
			</div>
			<Switch
				aria-label={label}
				checked={checked}
				disabled={disabled}
				onCheckedChange={onCheckedChange}
			/>
		</div>
	)
}

function getAllowedGroupChoices(
	pageKey: TaskDisplayPageKey,
	layout: ResolvedTaskDisplayOptions['layout'],
) {
	const capabilities = getTaskDisplayPageCapabilities(pageKey)

	if (layout === 'board') {
		return capabilities.board?.allowedGroupBy ?? ['status']
	}

	return capabilities.allowedGroupBy
}

function getAllowedSubGroupChoices(
	pageKey: TaskDisplayPageKey,
	layout: ResolvedTaskDisplayOptions['layout'],
) {
	const capabilities = getTaskDisplayPageCapabilities(pageKey)

	if (layout === 'board') {
		return capabilities.board?.allowedSubGroupBy ?? ['none']
	}

	return capabilities.allowedSubGroupBy
}

function toggleVisibleProperty(
	current: readonly TaskDisplayPropertyKey[],
	key: TaskDisplayPropertyKey,
) {
	const exists = current.includes(key)
	if (exists) {
		return current.filter((item) => item !== key)
	}

	const order = new Map(TASK_DISPLAY_ORDERED_PROPERTIES.map((item, index) => [item, index]))
	return [...current, key].toSorted((left, right) => (order.get(left) ?? 999) - (order.get(right) ?? 999))
}

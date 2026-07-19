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
import { Button } from '@/shared/components/base/button'
import { Separator } from '@/shared/components/base/separator'
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/shared/components/base/select'
import { Switch } from '@/shared/components/base/switch'

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

const PROPERTY_META: Record<TaskDisplayPropertyKey, { label: string }> = {
	status: { label: '状态' },
	priority: { label: '优先级' },
	project: { label: '项目' },
	dueAt: { label: '截止时间' },
	scheduledAt: { label: '计划时间' },
	updatedAt: { label: '更新时间' },
	createdAt: { label: '创建时间' },
}

const TASK_DISPLAY_ORDERED_PROPERTIES = [
	'status',
	'priority',
	'project',
	'dueAt',
	'scheduledAt',
	'updatedAt',
	'createdAt',
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
	// 用 Set 承载已显示属性，避免下方 map 循环内重复 array.includes 扫描
	const visiblePropertySet = new Set(options.visibleProperties)

	// 合并 filter + map 为单次遍历，并用 Set 承载允许的排序值以避免循环内重复 includes 扫描
	const allowedCompletedOrderSet = new Set(capabilities.allowedCompletedOrder)
	const completedOrderItems: ReactNode[] = []
	for (const value of TASK_DISPLAY_COMPLETED_ORDER_VALUES) {
		if (!allowedCompletedOrderSet.has(value)) {
			continue
		}
		completedOrderItems.push(
			<SelectItem key={value} value={value}>
				{COMPLETED_ORDER_LABELS[value]}
			</SelectItem>,
		)
	}

	return (
		<div className={cn('flex w-full min-w-0 flex-col gap-3', className)}>
			<div className='flex flex-col gap-2'>
				<DisplayOptionRow label='布局模式'>
					<div
						aria-label='布局模式'
						className='flex max-w-full items-center justify-end gap-1 rounded-full border border-sf-border-subtle bg-muted/30 p-1'
						role='tablist'
					>
						{capabilities.allowedLayouts.map((layout) => (
							<Button
								aria-selected={options.layout === layout}
								className='min-w-12'
								disabled={isPending || capabilities.allowedLayouts.length <= 1}
								key={layout}
								onClick={() => void actions.setLayout(layout)}
								role='tab'
								size='sm'
								type='button'
								variant={options.layout === layout ? 'outline' : 'ghost'}
							>
								{LAYOUT_LABELS[layout]}
							</Button>
						))}
					</div>
				</DisplayOptionRow>

				<DisplayOptionRow label='主分组'>
					<Select
						disabled={isPending}
						onValueChange={(value) =>
							void actions.setGrouping(value as ResolvedTaskDisplayOptions['groupBy'])
						}
						value={options.groupBy}
					>
						<SelectTrigger aria-label='主分组' className='w-full min-w-0 justify-between'>
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
				</DisplayOptionRow>

				{supportsSubGrouping ? (
					<DisplayOptionRow label='子分组'>
						<Select
							disabled={isPending}
							onValueChange={(value) =>
								void actions.setSubGrouping(value as ResolvedTaskDisplayOptions['subGroupBy'])
							}
							value={options.subGroupBy}
						>
							<SelectTrigger aria-label='子分组' className='w-full min-w-0 justify-between'>
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
					</DisplayOptionRow>
				) : null}

				<DisplayOptionRow label='排序依据'>
					<Select
						disabled={isPending}
						onValueChange={(value) =>
							void actions.setOrdering(
								value as ResolvedTaskDisplayOptions['orderBy'],
								options.orderDirection,
							)
						}
						value={options.orderBy}
					>
						<SelectTrigger aria-label='排序依据' className='w-full min-w-0 justify-between'>
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
				</DisplayOptionRow>

				<DisplayOptionRow label='排序方向'>
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
						<SelectTrigger aria-label='排序方向' className='w-full min-w-0 justify-between'>
							<SelectValue placeholder='选择排序方向' />
						</SelectTrigger>
						<SelectContent position='popper'>
							<SelectGroup>
								<SelectItem value='asc'>升序</SelectItem>
								<SelectItem value='desc'>降序</SelectItem>
							</SelectGroup>
						</SelectContent>
					</Select>
				</DisplayOptionRow>

				{capabilities.allowedCompletedOrder.length > 0 ? (
					<DisplayOptionRow label='完成项排序'>
						<Select
							disabled={isPending}
							onValueChange={(value) =>
								void actions.setCompletedOrder(
									value as ResolvedTaskDisplayOptions['completedOrder'],
								)
							}
							value={options.completedOrder}
						>
							<SelectTrigger aria-label='已完成任务排序' className='w-full min-w-0 justify-between'>
								<SelectValue placeholder='选择已完成排序' />
							</SelectTrigger>
							<SelectContent position='popper'>
								<SelectGroup>{completedOrderItems}</SelectGroup>
							</SelectContent>
						</Select>
					</DisplayOptionRow>
				) : null}

				{canToggleShowEmptyGroups ? (
					<DisplayOptionRow label='空分组'>
						<DisplayInlineSwitch
							checked={options.showEmptyGroups}
							disabled={isPending}
							onCheckedChange={(checked) => void actions.applyPartial({ showEmptyGroups: checked })}
						/>
					</DisplayOptionRow>
				) : null}
			</div>

			<Separator />

			<div className='flex flex-col gap-2'>
				<div className='flex items-center justify-between gap-3'>
					<p className='text-sm font-medium text-foreground'>显示属性</p>
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
				<PropertyToggleGrid
					items={capabilities.allowedVisibleProperties.map((key) => ({
						key,
						label: PROPERTY_META[key].label,
						checked: visiblePropertySet.has(key),
						disabled: isPending,
						onToggle: () => {
							const next = toggleVisibleProperty(options.visibleProperties, key)
							void actions.setVisibleProperties(next)
						},
					}))}
				/>
			</div>

			<div className='min-h-5'>
				{isErrored && error ? (
					<p className='text-[12px] leading-5 text-destructive'>{error}</p>
				) : isPending ? (
					<p className='text-[12px] leading-5 text-sf-shell-tertiary'>正在读取显示偏好…</p>
				) : null}
			</div>
		</div>
	)
}

function DisplayOptionRow({ label, children }: { label: string; children: ReactNode }) {
	return (
		<div className='grid grid-cols-[68px_minmax(0,1fr)] items-center gap-3'>
			<span className='shrink-0 text-[12px] font-medium text-foreground'>{label}</span>
			<div className='flex min-w-0 items-center justify-end gap-2'>{children}</div>
		</div>
	)
}

function DisplayInlineSwitch({
	checked,
	disabled,
	onCheckedChange,
}: {
	checked: boolean
	disabled?: boolean
	onCheckedChange: (checked: boolean) => void
}) {
	return (
		<>
			<Switch
				aria-label='显示空分组'
				checked={checked}
				disabled={disabled}
				onCheckedChange={onCheckedChange}
			/>
		</>
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
	return [...current, key].toSorted(
		(left, right) => (order.get(left) ?? 999) - (order.get(right) ?? 999),
	)
}

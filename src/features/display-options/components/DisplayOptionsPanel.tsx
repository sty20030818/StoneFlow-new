'use client'

import type { ReactNode } from 'react'
import { ArrowDownIcon, ArrowUpIcon } from 'lucide-react'

import {
	getTaskDisplayPageCapabilities,
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
	setGrouping: (groupBy: ResolvedTaskDisplayOptions['groupBy']) => Promise<void>
	setSubGrouping: (subGroupBy: ResolvedTaskDisplayOptions['subGroupBy']) => Promise<void>
	setOrdering: (
		orderBy: ResolvedTaskDisplayOptions['orderBy'],
		orderDirection?: ResolvedTaskDisplayOptions['orderDirection'],
	) => Promise<void>
	setCompletedOrder: (completedOrder: ResolvedTaskDisplayOptions['completedOrder']) => Promise<void>
	applyPartial: (patch: Partial<ResolvedTaskDisplayOptions>) => Promise<void>
	setVisibleProperties: (visibleProperties: TaskDisplayPropertyKey[]) => Promise<void>
	/** 将当前呈现设为页面默认（workspace default） */
	setAsDefault: () => Promise<void>
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
	plannedAt: '计划时间',
	statusChangedAt: '状态更新时间',
	createdAt: '创建时间',
	updatedAt: '更新时间',
	completedAt: '完成时间',
	canceledAt: '取消时间',
}

const PROPERTY_META: Record<TaskDisplayPropertyKey, { label: string }> = {
	status: { label: '状态' },
	priority: { label: '优先级' },
	project: { label: '项目' },
	dueAt: { label: '截止时间' },
	plannedAt: { label: '计划时间' },
	updatedAt: { label: '更新时间' },
	createdAt: { label: '创建时间' },
}

const TASK_DISPLAY_ORDERED_PROPERTIES = [
	'status',
	'priority',
	'project',
	'dueAt',
	'plannedAt',
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
	const supportsSubGrouping = capabilities.allowedSubGroupBy.some((item) => item !== 'none')
	const canToggleShowEmptyGroups =
		capabilities.supportsShowEmptyGroups && options.groupBy !== 'none'
	const canToggleOrderDirection = options.orderBy !== 'manual'
	const visiblePropertySet = new Set(options.visibleProperties)
	const orderCompletedByRecency = options.completedOrder === 'recency'

	return (
		<div className={cn('flex w-full min-w-0 flex-col gap-3', className)}>
			{/* List/Board 占位：无第二布局，不放可点假开关（SPEC） */}

			<div className='flex flex-col gap-2'>
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
								{capabilities.allowedGroupBy.map((groupBy) => (
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
									{capabilities.allowedSubGroupBy.map((groupBy) => (
										<SelectItem key={groupBy} value={groupBy}>
											{GROUP_LABELS[groupBy]}
										</SelectItem>
									))}
								</SelectGroup>
							</SelectContent>
						</Select>
					</DisplayOptionRow>
				) : null}

				{/* 排序 + 方向内嵌（对齐 Linear Ordering 行） */}
				<DisplayOptionRow label='排序'>
					<div className='flex min-w-0 w-full items-center gap-1.5'>
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
							<SelectTrigger aria-label='排序依据' className='min-w-0 flex-1 justify-between'>
								<SelectValue placeholder='选择排序' />
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
						{canToggleOrderDirection ? (
							<Button
								aria-label={
									options.orderDirection === 'asc' ? '升序，点击切换为降序' : '降序，点击切换为升序'
								}
								className='size-8 shrink-0'
								disabled={isPending}
								onClick={() =>
									void actions.setOrdering(
										options.orderBy,
										options.orderDirection === 'asc' ? 'desc' : 'asc',
									)
								}
								size='icon'
								type='button'
								variant='outline'
							>
								{options.orderDirection === 'asc' ? (
									<ArrowUpIcon className='size-3.5' />
								) : (
									<ArrowDownIcon className='size-3.5' />
								)}
							</Button>
						) : null}
					</div>
				</DisplayOptionRow>

				{capabilities.allowedCompletedOrder.length > 0 ? (
					<DisplayOptionRow label='完成按近到远'>
						<DisplayInlineSwitch
							ariaLabel='已完成项按最近变更优先排序'
							checked={orderCompletedByRecency}
							disabled={isPending}
							onCheckedChange={(checked) =>
								void actions.setCompletedOrder(checked ? 'recency' : 'natural')
							}
						/>
					</DisplayOptionRow>
				) : null}

				<DisplayOptionRow label='显示已完成'>
					<DisplayInlineSwitch
						ariaLabel='显示已完成与已取消任务'
						checked={options.showCompleted}
						disabled={isPending}
						onCheckedChange={(checked) => void actions.applyPartial({ showCompleted: checked })}
					/>
				</DisplayOptionRow>

				{canToggleShowEmptyGroups ? (
					<DisplayOptionRow label='空分组'>
						<DisplayInlineSwitch
							ariaLabel='显示空分组'
							checked={options.showEmptyGroups}
							disabled={isPending}
							onCheckedChange={(checked) => void actions.applyPartial({ showEmptyGroups: checked })}
						/>
					</DisplayOptionRow>
				) : null}
			</div>

			<Separator />

			<div className='flex flex-col gap-2'>
				<div className='flex items-center justify-between gap-2'>
					<p className='text-sm font-medium text-foreground'>显示属性</p>
					<div className='flex shrink-0 items-center gap-1.5'>
						<Button
							disabled={isPending}
							onClick={() => void actions.setAsDefault()}
							size='sm'
							type='button'
							variant='ghost'
						>
							设为默认
						</Button>
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
					<p className='text-[12px] leading-5 text-sf-shell-text-tertiary'>正在读取显示偏好…</p>
				) : null}
			</div>
		</div>
	)
}

function DisplayOptionRow({ label, children }: { label: string; children: ReactNode }) {
	return (
		<div className='grid grid-cols-[88px_minmax(0,1fr)] items-center gap-3'>
			<span className='shrink-0 text-[12px] font-medium text-foreground'>{label}</span>
			<div className='flex min-w-0 items-center justify-end gap-2'>{children}</div>
		</div>
	)
}

function DisplayInlineSwitch({
	checked,
	disabled,
	onCheckedChange,
	ariaLabel,
}: {
	checked: boolean
	disabled?: boolean
	onCheckedChange: (checked: boolean) => void
	ariaLabel: string
}) {
	return (
		<Switch
			aria-label={ariaLabel}
			checked={checked}
			disabled={disabled}
			onCheckedChange={onCheckedChange}
		/>
	)
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

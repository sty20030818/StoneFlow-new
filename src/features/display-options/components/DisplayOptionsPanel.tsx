'use client'

/**
 * Linear 式显示选项面板：紧凑行（左标签 + 右控件）+ 属性 pill + 底栏 Reset / 设为默认。
 */
import type { ReactNode } from 'react'
import { ArrowUpIcon, ArrowDownIcon } from 'lucide-react'

import {
	getTaskDisplayPageCapabilities,
	type ResolvedTaskDisplayOptions,
	type TaskDisplayPageKey,
	type TaskDisplayPropertyKey,
} from '@/features/display-options/core'
import { cn } from '@/shared/lib/utils'
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
		<div className={cn('flex w-full min-w-0 flex-col', className)}>
			{/* 分组 / 排序区 — 对齐 Linear 行布局 */}
			<div className='flex flex-col gap-0.5 px-1 pb-2'>
				<DisplayOptionRow label='分组'>
					<div className='flex min-w-0 items-center gap-1'>
						<CompactSelect
							ariaLabel='分组'
							disabled={isPending}
							onValueChange={(value) =>
								void actions.setGrouping(value as ResolvedTaskDisplayOptions['groupBy'])
							}
							options={capabilities.allowedGroupBy.map((groupBy) => ({
								value: groupBy,
								label: GROUP_LABELS[groupBy],
							}))}
							value={options.groupBy}
						/>
					</div>
				</DisplayOptionRow>

				{supportsSubGrouping ? (
					<DisplayOptionRow label='子分组'>
						<CompactSelect
							ariaLabel='子分组'
							disabled={isPending}
							onValueChange={(value) =>
								void actions.setSubGrouping(value as ResolvedTaskDisplayOptions['subGroupBy'])
							}
							options={capabilities.allowedSubGroupBy.map((groupBy) => ({
								value: groupBy,
								label: GROUP_LABELS[groupBy],
							}))}
							value={options.subGroupBy}
						/>
					</DisplayOptionRow>
				) : null}

				<DisplayOptionRow
					label='排序'
					leading={
						canToggleOrderDirection ? (
							<button
								aria-label={
									options.orderDirection === 'asc' ? '升序，点击切换为降序' : '降序，点击切换为升序'
								}
								className='flex size-8 items-center justify-center rounded-md text-sf-text-tertiary transition-[color,background-color,transform] hover:bg-muted hover:text-foreground active:scale-[0.96]'
								disabled={isPending}
								onClick={() =>
									void actions.setOrdering(
										options.orderBy,
										options.orderDirection === 'asc' ? 'desc' : 'asc',
									)
								}
								type='button'
							>
								{options.orderDirection === 'asc' ? (
									<ArrowUpIcon className='size-3.5' />
								) : (
									<ArrowDownIcon className='size-3.5' />
								)}
							</button>
						) : null
					}
				>
					<CompactSelect
						ariaLabel='排序'
						disabled={isPending}
						onValueChange={(value) =>
							void actions.setOrdering(
								value as ResolvedTaskDisplayOptions['orderBy'],
								options.orderDirection,
							)
						}
						options={capabilities.allowedOrderBy.map((orderBy) => ({
							value: orderBy,
							label: ORDER_LABELS[orderBy],
						}))}
						value={options.orderBy}
					/>
				</DisplayOptionRow>

				{capabilities.allowedCompletedOrder.length > 0 ? (
					<DisplayOptionRow label='完成按近到远'>
						<Switch
							aria-label='已完成项按最近变更优先排序'
							checked={orderCompletedByRecency}
							disabled={isPending}
							onCheckedChange={(checked) =>
								void actions.setCompletedOrder(checked ? 'recency' : 'natural')
							}
						/>
					</DisplayOptionRow>
				) : null}
			</div>

			<Separator />

			{/* 完成可见性 */}
			<div className='flex flex-col gap-0.5 px-1 py-2'>
				<DisplayOptionRow label='已完成'>
					<CompactSelect
						ariaLabel='已完成可见性'
						disabled={isPending}
						onValueChange={(value) => void actions.applyPartial({ showCompleted: value === 'all' })}
						options={[
							{ value: 'all', label: '全部' },
							{ value: 'hide', label: '隐藏' },
						]}
						value={options.showCompleted ? 'all' : 'hide'}
					/>
				</DisplayOptionRow>
			</div>

			<Separator />

			{/* 列表选项 */}
			<div className='flex flex-col gap-0.5 px-1 py-2'>
				<p className='px-1 pb-1 text-[12px] font-medium text-sf-text-secondary'>列表选项</p>
				{canToggleShowEmptyGroups ? (
					<DisplayOptionRow label='显示空分组'>
						<Switch
							aria-label='显示空分组'
							checked={options.showEmptyGroups}
							disabled={isPending}
							onCheckedChange={(checked) => void actions.applyPartial({ showEmptyGroups: checked })}
						/>
					</DisplayOptionRow>
				) : null}
			</div>

			<Separator />

			{/* 显示属性 pills — Linear 风格 */}
			<div className='flex flex-col gap-2 px-2 py-2'>
				<p className='text-[12px] font-medium text-sf-text-secondary'>显示属性</p>
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

			<Separator />

			{/* 底栏：Reset 左 · 设为默认 右 */}
			<div className='flex items-center justify-between gap-2 px-2 py-2'>
				<button
					className='text-[13px] text-sf-text-secondary transition-[color,transform] hover:text-foreground active:scale-[0.96] disabled:opacity-50'
					disabled={isPending}
					onClick={() => void actions.resetToDefault()}
					type='button'
				>
					重置
				</button>
				<button
					className='text-[13px] font-medium text-primary transition-transform hover:underline active:scale-[0.96] disabled:opacity-50'
					disabled={isPending}
					onClick={() => void actions.setAsDefault()}
					type='button'
				>
					设为默认
				</button>
			</div>

			{isErrored && error ? (
				<p className='px-2 pb-2 text-[12px] text-destructive'>{error}</p>
			) : isPending ? (
				<p className='px-2 pb-2 text-[12px] text-sf-text-tertiary'>正在读取显示偏好…</p>
			) : null}
		</div>
	)
}

function DisplayOptionRow({
	label,
	leading,
	children,
}: {
	label: string
	leading?: ReactNode
	children: ReactNode
}) {
	return (
		<div className='flex min-h-9 items-center gap-2 px-1'>
			<span className='min-w-0 flex-1 text-[13px] text-sf-text-secondary'>{label}</span>
			{leading}
			<div className='flex shrink-0 items-center justify-end'>{children}</div>
		</div>
	)
}

function CompactSelect({
	value,
	options,
	onValueChange,
	disabled,
	ariaLabel,
}: {
	value: string
	options: Array<{ value: string; label: string }>
	onValueChange: (value: string) => void
	disabled?: boolean
	ariaLabel: string
}) {
	return (
		<Select disabled={disabled} onValueChange={onValueChange} value={value}>
			<SelectTrigger
				aria-label={ariaLabel}
				className='h-8 w-auto min-w-30 max-w-40 justify-between rounded-full border-border/80 bg-muted/40 px-3 text-[13px] shadow-none'
			>
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

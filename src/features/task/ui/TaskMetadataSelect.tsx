import { cn } from '@/shared/lib/utils'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from '@/shared/ui/base/dropdown-menu'
import { CheckIcon, CircleIcon, PauseIcon, PlayIcon, type LucideIcon, XIcon } from 'lucide-react'

import {
	getTaskPriorityOption,
	TASK_PRIORITY_OPTIONS,
	type TaskPriorityValue,
} from '@/features/task/model/taskPriority'
import { getTaskStatusOption, TASK_STATUS_OPTIONS } from '@/features/task/model/taskStatus'
import type { TaskStatus } from '@/shared/types'

const TASK_LEAD_RAIL_CLASS = 'flex shrink-0 items-center gap-1.5'
/** 与复选框同级：flex 子项 + 垂直居中，避免外壳高度/对齐与按钮不一致 */
const TASK_LEAD_MENU_WRAP_CLASS = 'flex shrink-0 items-center'
// 与 TaskSelectionCheckbox 外圈一致：20×20 + 主轴/交叉轴双居中（原先缺 items-center，子项在 stretch 下易视觉上移）
const TASK_LEAD_TRIGGER_BASE_CLASS =
	'flex size-5 shrink-0 items-center justify-center rounded-[5px] border-none bg-transparent p-0 text-foreground shadow-none transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/14 data-[state=open]:bg-transparent'
const TASK_CHECKBOX_BOX_CLASS =
	'flex size-4 items-center justify-center rounded-[4px] border transition-colors'
// 18px 色块 + 14px 图标，四边各 2px 整数留白
const TASK_PRIORITY_SURFACE_CLASS =
	'inline-flex size-[18px] shrink-0 items-center justify-center rounded-[5px] leading-none overflow-visible'

type TaskPrioritySelectProps = {
	value: number | null | undefined
	disabled?: boolean
	ariaLabel: string
	onValueChange: (value: TaskPriorityValue) => void
}

type TaskStatusSelectProps = {
	value: TaskStatus
	disabled?: boolean
	ariaLabel: string
	onValueChange: (value: TaskStatus) => void
}

type TaskSelectionCheckboxProps = {
	checked: boolean
	disabled?: boolean
	ariaLabel: string
	onCheckedChange: () => void
}

/**
 * 统一任务行前导轨道，承载选择、优先级和状态三类微控件。
 */
export function TaskLeadRail({
	children,
	className,
}: {
	children: React.ReactNode
	className?: string
}) {
	return <div className={cn(TASK_LEAD_RAIL_CLASS, className)}>{children}</div>
}

/**
 * 任务批量选择框只保留最小可见几何：透明触发区 + 内部方框。
 */
export function TaskSelectionCheckbox({
	checked,
	disabled,
	ariaLabel,
	onCheckedChange,
}: TaskSelectionCheckboxProps) {
	return (
		<button
			aria-checked={checked}
			aria-label={ariaLabel}
			className={cn(
				'group/task-selection flex size-5 shrink-0 items-center justify-center rounded-[5px] bg-transparent p-0 outline-none transition-opacity hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/14 disabled:pointer-events-none disabled:opacity-40',
				checked ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
			)}
			data-checked={checked}
			disabled={disabled}
			onClick={(event) => {
				stopTaskRowEvent(event)
				onCheckedChange()
			}}
			onKeyDownCapture={stopTaskRowEvent}
			onPointerDownCapture={stopTaskRowEvent}
			role='checkbox'
			type='button'
		>
			<span
				className={cn(
					TASK_CHECKBOX_BOX_CLASS,
					checked
						? 'border-primary bg-primary text-primary-foreground'
						: 'border-(--sf-color-border-strong) bg-transparent text-transparent group-hover/task-selection:border-(--sf-color-text-secondary)',
				)}
			>
				<CheckIcon className='size-3' />
			</span>
		</button>
	)
}

/**
 * 统一任务优先级的小尺寸触发器与下拉列表。
 * 结构与 ShellHeader 历史/新建、ShellSidebar Space 一致：Label + Group + Item，选中项右侧 Check（同 Space 切换）。
 */
export function TaskPrioritySelect({
	value,
	disabled,
	ariaLabel,
	onValueChange,
}: TaskPrioritySelectProps) {
	const option = getTaskPriorityOption(value)
	const emptyOption = getTaskPriorityOption(0)

	return (
		<div
			className={TASK_LEAD_MENU_WRAP_CLASS}
			onClick={stopTaskRowEvent}
			onPointerDown={stopTaskRowEvent}
		>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<button
						type='button'
						aria-label={ariaLabel}
						disabled={disabled}
						className={cn(
							'cursor-default outline-none transition-opacity disabled:pointer-events-none disabled:opacity-50',
							TASK_LEAD_TRIGGER_BASE_CLASS,
						)}
						onKeyDownCapture={stopTaskRowEvent}
					>
						<TaskPriorityIcon
							icon={option.icon}
							iconClassName={option.iconClassName}
							surfaceClassName={option.surfaceClassName}
						/>
						<span className='sr-only'>{option.label}</span>
					</button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align='start' sideOffset={6}>
					<DropdownMenuLabel>优先级</DropdownMenuLabel>
					<DropdownMenuGroup>
						<DropdownMenuItem
							className='gap-2 p-2'
							onSelect={() => {
								onValueChange(0)
							}}
						>
							<TaskPriorityIcon
								icon={emptyOption.icon}
								iconClassName={emptyOption.iconClassName}
								surfaceClassName={emptyOption.surfaceClassName}
							/>
							<span className='min-w-0 flex-1 truncate'>{emptyOption.label}</span>
							{option.value === 0 ? (
								<CheckIcon
									aria-hidden
									className='ml-auto size-3.5 shrink-0 text-(--sf-color-icon-secondary)'
								/>
							) : null}
						</DropdownMenuItem>
						{TASK_PRIORITY_OPTIONS.filter((priorityOption) => priorityOption.value !== 0).map(
							(priorityOption) => (
								<DropdownMenuItem
									key={priorityOption.value}
									className='gap-2 p-2'
									onSelect={() => {
										onValueChange(priorityOption.value)
									}}
								>
									<TaskPriorityIcon
										icon={priorityOption.icon}
										iconClassName={priorityOption.iconClassName}
										surfaceClassName={priorityOption.surfaceClassName}
									/>
									<span className='min-w-0 flex-1 truncate'>{priorityOption.label}</span>
									{option.value === priorityOption.value ? (
										<CheckIcon
											aria-hidden
											className='ml-auto size-3.5 shrink-0 text-(--sf-color-icon-secondary)'
										/>
									) : null}
								</DropdownMenuItem>
							),
						)}
					</DropdownMenuGroup>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	)
}

/**
 * 统一任务状态圆圈的小尺寸触发器与下拉列表（与 Sidebar Space 等相同的 Label + Group + Item + 选中 Check）。
 */
export function TaskStatusSelect({
	value,
	disabled,
	ariaLabel,
	onValueChange,
}: TaskStatusSelectProps) {
	const currentOption = getTaskStatusOption(value)

	return (
		<div
			className={TASK_LEAD_MENU_WRAP_CLASS}
			onClick={stopTaskRowEvent}
			onPointerDown={stopTaskRowEvent}
		>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<button
						type='button'
						aria-label={ariaLabel}
						disabled={disabled}
						className={cn(
							'cursor-default outline-none transition-opacity disabled:pointer-events-none disabled:opacity-50',
							TASK_LEAD_TRIGGER_BASE_CLASS,
						)}
						onKeyDownCapture={stopTaskRowEvent}
					>
						<TaskStatusIndicator status={value} />
						<span className='sr-only'>{currentOption.label}</span>
					</button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align='start' sideOffset={6}>
					<DropdownMenuLabel>状态</DropdownMenuLabel>
					<DropdownMenuGroup>
						{TASK_STATUS_OPTIONS.map((option) => (
							<DropdownMenuItem
								key={option.value}
								className='gap-2 p-2'
								onSelect={() => {
									onValueChange(option.value)
								}}
							>
								<TaskStatusIndicator status={option.value} />
								<span className='min-w-0 flex-1 truncate'>{option.label}</span>
								{value === option.value ? (
									<CheckIcon
										aria-hidden
										className='ml-auto size-3.5 shrink-0 text-(--sf-color-icon-secondary)'
									/>
								) : null}
							</DropdownMenuItem>
						))}
					</DropdownMenuGroup>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	)
}

export function TaskStatusIndicator({ status }: { status: TaskStatus }) {
	switch (status) {
		case 'done':
			return (
				<span className='flex size-4 shrink-0 items-center justify-center rounded-full bg-(--sf-color-project-task-status-done) text-white'>
					<CheckIcon className='size-3' />
				</span>
			)
		case 'doing':
			return (
				<span className='flex size-4 shrink-0 items-center justify-center rounded-full bg-sky-500 text-white'>
					<PlayIcon className='size-2.75 fill-current' />
				</span>
			)
		case 'waiting':
			return (
				<span className='flex size-4 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white'>
					<PauseIcon className='size-2.75 fill-current' />
				</span>
			)
		case 'canceled':
			return (
				<span className='flex size-4 shrink-0 items-center justify-center rounded-full bg-muted text-(--sf-color-text-secondary)'>
					<XIcon className='size-2.75' />
				</span>
			)
		default:
			return (
				<span className='flex size-4 shrink-0 items-center justify-center rounded-full text-(--sf-color-text-secondary)'>
					<CircleIcon className='size-3.5' />
				</span>
			)
	}
}

function TaskPriorityIcon({
	icon: Icon,
	iconClassName,
	surfaceClassName,
}: {
	icon: LucideIcon
	iconClassName: string
	surfaceClassName: string
}) {
	return (
		<span className={cn(TASK_PRIORITY_SURFACE_CLASS, surfaceClassName)}>
			<Icon className={cn('block size-3.5 shrink-0', iconClassName)} aria-hidden />
		</span>
	)
}

function stopTaskRowEvent(event: { stopPropagation: () => void }) {
	event.stopPropagation()
}

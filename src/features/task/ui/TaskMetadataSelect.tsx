import { cn } from '@/shared/lib/utils'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from '@/shared/ui/base/dropdown-menu'
import {
	CheckIcon,
	CircleCheckIcon,
	CircleIcon,
	CircleXIcon,
	PauseIcon,
	PlayIcon,
} from 'lucide-react'
import type { LucideProps } from 'lucide-react'
import { useEffect, useRef, type ComponentType } from 'react'

import {
	getTaskPriorityOption,
	TASK_PRIORITY_OPTIONS,
	type TaskPriorityValue,
} from '@/features/task/model/taskPriority'
import { PriorityIcon } from '@/features/task/ui/PriorityIcon'
import { getTaskStatusOption, TASK_STATUS_OPTIONS } from '@/features/task/model/taskStatus'
import type { TaskStatus } from '@/shared/types'

const TASK_LEAD_RAIL_CLASS = 'flex shrink-0 items-center gap-1'
const TASK_LEAD_MENU_WRAP_CLASS = 'flex size-5 shrink-0 items-center justify-center'
const TASK_LEAD_TRIGGER_BASE_CLASS =
	'flex size-5 shrink-0 items-center justify-center rounded-full border border-transparent bg-transparent p-0 text-foreground shadow-none transition-colors outline-none focus-visible:border-(--sf-color-border) focus-visible:ring-0'
const TASK_CHECKBOX_BOX_CLASS =
	'flex size-4 items-center justify-center rounded-[5px] border transition-colors'

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
				'group/task-selection flex size-5 shrink-0 items-center justify-center rounded-full bg-transparent p-0 outline-none transition-colors disabled:pointer-events-none disabled:opacity-40',
				checked
					? 'opacity-100'
					: 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100',
				'focus-visible:border-(--sf-color-border) focus-visible:ring-0',
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
						: 'border-(--sf-color-border-strong) bg-transparent text-transparent group-hover/task-selection:border-(--sf-color-border)',
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
						<PriorityIcon priority={option.value} size='md' />
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
							<PriorityIcon priority={0} size='md' />
							<span className='min-w-0 flex-1 truncate'>无优先级</span>
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
									<PriorityIcon priority={priorityOption.value} size='md' />
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

function SolidCircleIcon({
	icon: Icon,
	color,
	className,
}: {
	icon: ComponentType<LucideProps>
	color: string
	className?: string
}) {
	const ref = useRef<SVGSVGElement>(null)

	useEffect(() => {
		const svg = ref.current
		if (!svg) return
		const circle = svg.querySelector('circle')
		if (circle) svg.insertBefore(circle, svg.firstChild)
	}, [])

	return (
		<Icon
			ref={ref}
			className={cn(
				'size-4 shrink-0 [&_circle]:fill-(--sci-color) [&_circle]:stroke-none',
				className,
			)}
			fill='white'
			stroke='white'
			style={{ '--sci-color': color } as React.CSSProperties}
		/>
	)
}

export function TaskStatusIndicator({ status }: { status: TaskStatus }) {
	switch (status) {
		case 'done':
			return (
				<SolidCircleIcon icon={CircleCheckIcon} color='var(--sf-color-project-task-status-done)' />
			)
		case 'doing':
			return (
				<span className='flex size-4 shrink-0 items-center justify-center'>
					<PlayIcon className='size-3 text-(--sf-color-info-soft-text)' fill='currentColor' />
				</span>
			)
		case 'waiting':
			return (
				<span className='flex size-4 shrink-0 items-center justify-center'>
					<PauseIcon className='size-3 text-(--sf-color-warning-soft-text)' fill='currentColor' />
				</span>
			)
		case 'canceled':
			return <SolidCircleIcon icon={CircleXIcon} color='var(--sf-color-border-strong)' />
		default:
			return <CircleIcon className='size-4 shrink-0 text-(--sf-color-border-strong)' />
	}
}

function stopTaskRowEvent(event: { stopPropagation: () => void }) {
	event.stopPropagation()
}

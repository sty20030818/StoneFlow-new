import type { TaskPriorityValue } from '@/features/task/model/taskPriority'
import { TASK_PRIORITY_OPTIONS } from '@/features/task/model/taskPriority'
import type { TaskPlacement } from '@/shared/types'
import type { TaskStatus } from '@/shared/types'
import type { ProjectOption } from '@/features/project/model/types'
import { getTaskStatusOption, TASK_STATUS_OPTIONS } from '@/features/task/model/taskStatus'
import { PriorityIcon } from '@/features/task/ui/PriorityIcon'
import { TaskStatusIndicator } from '@/features/task/ui/TaskMetadataSelect'
import { Button } from '@/shared/ui/base/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from '@/shared/ui/base/dropdown-menu'
import { CheckIcon, FileIcon, FolderIcon, InboxIcon } from 'lucide-react'

/**
 * 状态元数据下拉 — outline button + DropdownMenu。
 */
export function StatusMetaAction({
	status,
	disabled,
	onStatusChange,
}: {
	status: TaskStatus
	disabled: boolean
	onStatusChange: (status: TaskStatus) => void
}) {
	const currentOption = getTaskStatusOption(status)

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button disabled={disabled} size='sm' variant='outline'>
					<TaskStatusIndicator status={status} />
					{currentOption.label}
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align='start' sideOffset={6}>
				<DropdownMenuLabel>状态</DropdownMenuLabel>
				<DropdownMenuGroup>
					{TASK_STATUS_OPTIONS.map((option) => (
						<DropdownMenuItem
							className='gap-2 p-2'
							key={option.value}
							onSelect={() => onStatusChange(option.value)}
						>
							<TaskStatusIndicator status={option.value} />
							<span className='min-w-0 flex-1 truncate'>{option.label}</span>
							{status === option.value ? (
								<CheckIcon
									aria-hidden
									className='ml-auto size-3.5 shrink-0 text-sf-icon-secondary'
								/>
							) : null}
						</DropdownMenuItem>
					))}
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}

/**
 * 优先级元数据下拉 — outline button + DropdownMenu。
 */
export function PriorityMetaAction({
	priority,
	disabled,
	onPriorityChange,
}: {
	priority: TaskPriorityValue
	disabled: boolean
	onPriorityChange: (priority: TaskPriorityValue) => void
}) {
	const currentOption =
		TASK_PRIORITY_OPTIONS.find((o) => o.value === priority) ?? TASK_PRIORITY_OPTIONS[0]

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button disabled={disabled} size='sm' variant='outline'>
					<PriorityIcon priority={priority} size='sm' />
					{currentOption.label}
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align='start' sideOffset={6}>
				<DropdownMenuLabel>优先级</DropdownMenuLabel>
				<DropdownMenuGroup>
					{TASK_PRIORITY_OPTIONS.map((option) => (
						<DropdownMenuItem
							className='gap-2 p-2'
							key={option.value}
							onSelect={() => onPriorityChange(option.value as TaskPriorityValue)}
						>
							<PriorityIcon priority={option.value} size='md' />
							<span className='min-w-0 flex-1 truncate'>{option.label}</span>
							{priority === option.value ? (
								<CheckIcon
									aria-hidden
									className='ml-auto size-3.5 shrink-0 text-sf-icon-secondary'
								/>
							) : null}
						</DropdownMenuItem>
					))}
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}

/**
 * 项目元数据下拉 — outline button + DropdownMenu。
 */
export function ProjectMetaAction({
	disabled,
	placement,
	projectId,
	projects,
	onPlacementChange,
}: {
	disabled: boolean
	placement: TaskPlacement
	projectId: string
	projects: ProjectOption[]
	onPlacementChange: (placement: TaskPlacement, projectId: string | null) => void
}) {
	const currentProject = projects.find((p) => p.id === projectId)
	const buttonLabel =
		placement === 'project'
			? (currentProject?.name ?? '选择项目')
			: placement === 'noProject'
				? '独立事项'
				: '收件箱'
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button disabled={disabled} size='sm' variant='outline'>
					{placement === 'inbox' ? (
						<InboxIcon className='size-4' />
					) : (
						<FolderIcon className='size-4' />
					)}
					{buttonLabel}
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align='start' sideOffset={6}>
				<DropdownMenuLabel>归属</DropdownMenuLabel>
				<DropdownMenuGroup>
					<DropdownMenuItem className='gap-2 p-2' onSelect={() => onPlacementChange('inbox', null)}>
						<InboxIcon className='size-4 text-sf-icon-secondary' />
						<span className='min-w-0 flex-1 truncate'>收件箱</span>
						{placement === 'inbox' ? (
							<CheckIcon aria-hidden className='ml-auto size-3.5 shrink-0 text-sf-icon-secondary' />
						) : null}
					</DropdownMenuItem>
					<DropdownMenuItem
						className='gap-2 p-2'
						onSelect={() => onPlacementChange('noProject', null)}
					>
						<FileIcon className='size-4 text-sf-icon-secondary' />
						<span className='min-w-0 flex-1 truncate'>独立事项</span>
						{placement === 'noProject' ? (
							<CheckIcon aria-hidden className='ml-auto size-3.5 shrink-0 text-sf-icon-secondary' />
						) : null}
					</DropdownMenuItem>
					{projects.map((project) => (
						<DropdownMenuItem
							className='gap-2 p-2'
							key={project.id}
							onSelect={() => onPlacementChange('project', project.id)}
						>
							<FolderIcon className='size-4 text-sf-icon-secondary' />
							<span className='min-w-0 flex-1 truncate'>{project.name}</span>
							{placement === 'project' && projectId === project.id ? (
								<CheckIcon
									aria-hidden
									className='ml-auto size-3.5 shrink-0 text-sf-icon-secondary'
								/>
							) : null}
						</DropdownMenuItem>
					))}
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}

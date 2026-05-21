import type { AutosaveController } from '@/shared/autosave'
import { DatePicker } from '@/shared/ui/base/date-picker'
import { buttonVariants } from '@/shared/ui/base/button'
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
} from '@/shared/ui/base/select'
import { cn } from '@/shared/lib/utils'
import { DetailSection } from '@/shared/ui/detail'
import { TASK_PRIORITY_OPTIONS } from '@/features/task/model/taskPriority'
import { formatTaskStatusLabel, TASK_STATUS_OPTIONS } from '@/features/task/model/taskStatus'
import type { TaskPriority, TaskStatus } from '@/shared/types'
import { FlagIcon } from 'lucide-react'

import type { TaskDetailDraft } from '../model/taskDetailDraft'

type TaskPropertiesSectionProps = {
	autosave: AutosaveController<TaskDetailDraft>
}

export function TaskPropertiesSection({ autosave }: TaskPropertiesSectionProps) {
	const priorityLabel =
		TASK_PRIORITY_OPTIONS.find((option) => option.value === autosave.draft.priority)?.label ??
		'优先级'

	return (
		<DetailSection title='属性'>
			<div className='flex flex-wrap gap-2' data-task-properties='button-group'>
				<Select
					onValueChange={(value) =>
						autosave.setField('status', value as TaskStatus, { saveMode: 'immediate' })
					}
					value={autosave.draft.status}
				>
					<SelectTrigger
						aria-label='状态'
						className={cn(
							buttonVariants({ variant: 'outline', size: 'sm' }),
							'h-8 max-w-full rounded-md px-2 text-[12px]',
						)}
					>
						<span className='truncate'>{formatTaskStatusLabel(autosave.draft.status)}</span>
					</SelectTrigger>
					<SelectContent position='popper'>
						<SelectGroup>
							{TASK_STATUS_OPTIONS.map((option) => (
								<SelectItem key={option.value} value={option.value}>
									{option.label}
								</SelectItem>
							))}
						</SelectGroup>
					</SelectContent>
				</Select>

				<Select
					onValueChange={(value) =>
						autosave.setField('priority', Number(value) as TaskPriority, {
							saveMode: 'immediate',
						})
					}
					value={`${autosave.draft.priority}`}
				>
					<SelectTrigger
						aria-label='优先级'
						className={cn(
							buttonVariants({ variant: 'outline', size: 'sm' }),
							'h-8 max-w-full rounded-md px-2 text-[12px]',
						)}
					>
						<FlagIcon className='size-3.5' />
						<span className='truncate'>{priorityLabel}</span>
					</SelectTrigger>
					<SelectContent position='popper'>
						<SelectGroup>
							{TASK_PRIORITY_OPTIONS.map((option) => (
								<SelectItem key={option.value} value={`${option.value}`}>
									{option.label}
								</SelectItem>
							))}
						</SelectGroup>
					</SelectContent>
				</Select>

				<DatePicker
					className='h-8 px-2 text-[12px]'
					onChange={(value) => autosave.setField('dueAt', value ?? '', { saveMode: 'immediate' })}
					placeholder='截止日期'
					value={autosave.draft.dueAt}
				/>

				<DatePicker
					className='h-8 px-2 text-[12px]'
					onChange={(value) =>
						autosave.setField('scheduledAt', value ?? '', { saveMode: 'immediate' })
					}
					placeholder='计划日期'
					value={autosave.draft.scheduledAt}
				/>

				<DatePicker
					className='h-8 px-2 text-[12px]'
					onChange={(value) =>
						autosave.setField('reminderAt', value ?? '', { saveMode: 'immediate' })
					}
					placeholder='提醒'
					value={autosave.draft.reminderAt}
				/>
			</div>
		</DetailSection>
	)
}

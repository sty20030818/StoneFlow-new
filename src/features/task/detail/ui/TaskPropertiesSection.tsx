import type { AutosaveController } from '@/shared/autosave'
import { DatePicker } from '@/shared/ui/base/date-picker'
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/shared/ui/base/select'
import { DetailFieldRow, DetailSection } from '@/shared/ui/detail'
import { TASK_PRIORITY_OPTIONS } from '@/features/task/model/taskPriority'
import { TASK_STATUS_OPTIONS } from '@/features/task/model/taskStatus'
import type { TaskPriority, TaskStatus } from '@/shared/types'

import type { TaskDetailDraft } from '../model/taskDetailDraft'

type TaskPropertiesSectionProps = {
	autosave: AutosaveController<TaskDetailDraft>
}

export function TaskPropertiesSection({ autosave }: TaskPropertiesSectionProps) {
	return (
		<DetailSection title='属性'>
			<div className='flex flex-col gap-2.5'>
				<DetailFieldRow label='状态'>
					<Select
						onValueChange={(value) =>
							autosave.setField('status', value as TaskStatus, { saveMode: 'immediate' })
						}
						value={autosave.draft.status}
					>
						<SelectTrigger className='h-7 border-0 bg-transparent px-0 text-[12px] shadow-none focus:ring-0'>
							<SelectValue />
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
				</DetailFieldRow>

				<DetailFieldRow label='优先级'>
					<Select
						onValueChange={(value) =>
							autosave.setField('priority', Number(value) as TaskPriority, {
								saveMode: 'immediate',
							})
						}
						value={`${autosave.draft.priority}`}
					>
						<SelectTrigger className='h-7 border-0 bg-transparent px-0 text-[12px] shadow-none focus:ring-0'>
							<SelectValue />
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
				</DetailFieldRow>

				<DetailFieldRow label='截止日期'>
					<DatePicker
						className='h-7 border-0 bg-transparent px-0 shadow-none hover:bg-transparent focus:ring-0'
						onChange={(value) => autosave.setField('dueAt', value ?? '', { saveMode: 'immediate' })}
						placeholder='选择日期'
						value={autosave.draft.dueAt}
					/>
				</DetailFieldRow>

				<DetailFieldRow label='计划日期'>
					<DatePicker
						className='h-7 border-0 bg-transparent px-0 shadow-none hover:bg-transparent focus:ring-0'
						onChange={(value) =>
							autosave.setField('scheduledAt', value ?? '', { saveMode: 'immediate' })
						}
						placeholder='选择日期'
						value={autosave.draft.scheduledAt}
					/>
				</DetailFieldRow>

				<DetailFieldRow label='提醒时间'>
					<DatePicker
						className='h-7 border-0 bg-transparent px-0 shadow-none hover:bg-transparent focus:ring-0'
						onChange={(value) =>
							autosave.setField('reminderAt', value ?? '', { saveMode: 'immediate' })
						}
						placeholder='选择日期'
						value={autosave.draft.reminderAt}
					/>
				</DetailFieldRow>
			</div>
		</DetailSection>
	)
}

import { Input, TextField } from '@heroui/react'

import type { AutosaveController } from '@/shared/autosave'

import type { TaskDetailDraft } from '../model/taskDetailDraft'

type TaskTitleFieldProps = {
	autosave: AutosaveController<TaskDetailDraft>
	disabled?: boolean
}

export function TaskTitleField({ autosave, disabled = false }: TaskTitleFieldProps) {
	return (
		<TextField
			aria-label='任务标题'
			fullWidth
			isDisabled={disabled}
			value={autosave.draft.title}
			onChange={(value) => autosave.setField('title', value, { saveMode: 'debounced' })}
		>
			<Input
				aria-label='任务标题'
				data-field-role='detail-title'
				placeholder='任务标题'
				variant='secondary'
			/>
		</TextField>
	)
}

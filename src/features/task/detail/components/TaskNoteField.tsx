import { TextArea, TextField } from '@heroui/react'

import type { AutosaveController } from '@/shared/autosave'

import type { TaskDetailDraft } from '../model/taskDetailDraft'

type TaskNoteFieldProps = {
	autosave: AutosaveController<TaskDetailDraft>
	disabled?: boolean
}

export function TaskNoteField({ autosave, disabled = false }: TaskNoteFieldProps) {
	return (
		<TextField
			aria-label='任务备注'
			fullWidth
			isDisabled={disabled}
			value={autosave.draft.note}
			onChange={(value) => autosave.setField('note', value, { saveMode: 'debounced' })}
		>
			<TextArea
				aria-label='任务备注'
				className='min-h-40 resize-none text-[13px]'
				placeholder='添加备注...'
				variant='secondary'
			/>
		</TextField>
	)
}

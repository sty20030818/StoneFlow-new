import type { AutosaveController } from '@/shared/autosave'
import { Input } from '@/shared/ui/base/input'

import type { TaskDetailDraft } from '../model/taskDetailDraft'

type TaskTitleFieldProps = {
	autosave: AutosaveController<TaskDetailDraft>
	disabled?: boolean
}

export function TaskTitleField({ autosave, disabled = false }: TaskTitleFieldProps) {
	return (
		<Input
			aria-label='任务标题'
			className='h-11 border-0 bg-transparent px-0 text-[20px] font-bold shadow-none focus-visible:ring-0 md:text-[22px]'
			disabled={disabled}
			onChange={(event) =>
				autosave.setField('title', event.currentTarget.value, { saveMode: 'debounced' })
			}
			placeholder='任务标题'
			value={autosave.draft.title}
		/>
	)
}

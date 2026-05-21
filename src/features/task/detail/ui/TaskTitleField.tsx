import type { AutosaveController } from '@/shared/autosave'
import { Input } from '@/shared/ui/base/input'

import type { TaskDetailDraft } from '../model/taskDetailDraft'

type TaskTitleFieldProps = {
	autosave: AutosaveController<TaskDetailDraft>
}

export function TaskTitleField({ autosave }: TaskTitleFieldProps) {
	return (
		<Input
			aria-label='任务标题'
			className='h-9 border-0 bg-transparent px-0 text-[14px] font-semibold shadow-none focus-visible:ring-0'
			onChange={(event) =>
				autosave.setField('title', event.currentTarget.value, { saveMode: 'debounced' })
			}
			placeholder='任务标题'
			value={autosave.draft.title}
		/>
	)
}

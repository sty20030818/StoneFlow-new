import type { AutosaveController } from '@/shared/autosave'
import { Textarea } from '@/shared/ui/base/textarea'

import type { TaskDetailDraft } from '../model/taskDetailDraft'

type TaskNoteFieldProps = {
	autosave: AutosaveController<TaskDetailDraft>
}

export function TaskNoteField({ autosave }: TaskNoteFieldProps) {
	return (
		<Textarea
			aria-label='任务备注'
			className='min-h-40 resize-none border-0 bg-transparent px-0 text-[13px] shadow-none focus-visible:ring-0'
			onChange={(event) =>
				autosave.setField('note', event.currentTarget.value, { saveMode: 'debounced' })
			}
			placeholder='添加备注...'
			value={autosave.draft.note}
		/>
	)
}

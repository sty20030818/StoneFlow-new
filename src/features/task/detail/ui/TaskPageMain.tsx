import type { AutosaveController } from '@/shared/autosave'
import { DetailSection } from '@/shared/ui/detail'

import type { TaskDetailDraft } from '../model/taskDetailDraft'
import { TaskActivityTimeline } from './TaskActivityTimeline'
import { TaskLinksSection } from './TaskLinksSection'
import { TaskNoteField } from './TaskNoteField'
import { TaskTitleField } from './TaskTitleField'

type TaskPageMainProps = {
	taskId: string
	spaceId: string
	autosave: AutosaveController<TaskDetailDraft>
	isReadOnly: boolean
}

export function TaskPageMain({ taskId, spaceId, autosave, isReadOnly }: TaskPageMainProps) {
	return (
		<div className='flex min-w-0 flex-col gap-5'>
			<section className='rounded-xl border border-sf-border-subtle bg-card px-4 py-4 md:px-5 md:py-5'>
				<TaskTitleField autosave={autosave} disabled={isReadOnly} />
				<div className='mt-3 border-t border-sf-divider pt-4'>
					<TaskNoteField autosave={autosave} disabled={isReadOnly} />
				</div>
			</section>

			<DetailSection
				className='rounded-xl border border-sf-border-subtle bg-card px-4 py-4 md:px-5 md:py-5'
				contentClassName='pt-0'
			>
				<TaskLinksSection taskId={taskId} />
			</DetailSection>

			<div className='rounded-xl border border-sf-border-subtle bg-card px-4 py-4 md:px-5 md:py-5'>
				<TaskActivityTimeline spaceId={spaceId} taskId={taskId} />
			</div>
		</div>
	)
}

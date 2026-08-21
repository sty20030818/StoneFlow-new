import { Card, Separator } from '@heroui/react'

import type { AutosaveController } from '@/shared/autosave'

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
		<div className='min-w-0'>
			<Card>
				<Card.Content>
					<div className='flex flex-col gap-5'>
						<div className='flex flex-col gap-2'>
							<TaskTitleField autosave={autosave} disabled={isReadOnly} />
							<TaskNoteField autosave={autosave} disabled={isReadOnly} />
						</div>
						<Separator variant='tertiary' />
						<TaskLinksSection taskId={taskId} />
						<Separator variant='tertiary' />
						<TaskActivityTimeline spaceId={spaceId} taskId={taskId} />
					</div>
				</Card.Content>
			</Card>
		</div>
	)
}

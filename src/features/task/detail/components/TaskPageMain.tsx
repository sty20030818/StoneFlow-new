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
		<div className='flex min-w-0 flex-col gap-5'>
			<Card>
				<Card.Content>
					<div className='flex flex-col gap-4'>
						<TaskTitleField autosave={autosave} disabled={isReadOnly} />
						<Separator variant='tertiary' />
						<TaskNoteField autosave={autosave} disabled={isReadOnly} />
					</div>
				</Card.Content>
			</Card>

			<Card>
				<Card.Content>
					<TaskLinksSection taskId={taskId} />
				</Card.Content>
			</Card>

			<Card>
				<Card.Content>
					<TaskActivityTimeline spaceId={spaceId} taskId={taskId} />
				</Card.Content>
			</Card>
		</div>
	)
}

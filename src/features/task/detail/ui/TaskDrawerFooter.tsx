import type { AutosaveController } from '@/shared/autosave'
import { Button } from '@/shared/ui/base/button'
import { DetailFooter, DetailSaveStatus } from '@/shared/ui/detail'
import type { TaskDetail } from '@/shared/types'

import type { TaskDetailDraft } from '../model/taskDetailDraft'

type TaskDrawerFooterProps = {
	autosave: AutosaveController<TaskDetailDraft>
	task: TaskDetail
	isArchiveBusy: boolean
	onArchiveOrRestore: () => void
}

export function TaskDrawerFooter({
	autosave,
	task,
	isArchiveBusy,
	onArchiveOrRestore,
}: TaskDrawerFooterProps) {
	return (
		<DetailFooter className='items-center justify-between'>
			<Button
				className='h-7 px-2 text-[12px]'
				disabled={isArchiveBusy}
				onClick={onArchiveOrRestore}
				size='sm'
				variant='ghost'
			>
				{task.archivedAt ? '恢复' : '归档'}
			</Button>
			<div className='flex min-w-0 items-center gap-2'>
				<DetailSaveStatus error={autosave.error} savedAt={autosave.savedAt} status={autosave.status} />
				{autosave.status === 'failed' ? (
					<Button className='h-7 px-2 text-[12px]' onClick={() => void autosave.retry()} size='sm' variant='outline'>
						重试
					</Button>
				) : null}
			</div>
		</DetailFooter>
	)
}

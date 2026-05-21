import { MoreHorizontalIcon, SquareArrowOutUpRightIcon } from 'lucide-react'

import type { AutosaveController } from '@/shared/autosave'
import { Button } from '@/shared/ui/base/button'
import { DetailHeader, DetailSaveStatus } from '@/shared/ui/detail'

import type { TaskDetailDraft } from '../model/taskDetailDraft'

type TaskDrawerHeaderProps = {
	autosave: AutosaveController<TaskDetailDraft>
}

export function TaskDrawerHeader({ autosave }: TaskDrawerHeaderProps) {
	return (
		<DetailHeader className='min-h-12 items-center gap-2 px-3 py-2'>
			<div className='min-w-0 flex flex-1 items-center gap-2'>
				<h2 className='shrink-0 text-[12px] font-medium text-sf-text-secondary'>任务详情</h2>
				<DetailSaveStatus
					className='truncate'
					error={autosave.error}
					savedAt={autosave.savedAt}
					status={autosave.status}
				/>
			</div>
			<div className='flex shrink-0 items-center gap-1'>
				<Button className='h-7 px-2 text-[12px]' size='sm' type='button' variant='outline'>
					<SquareArrowOutUpRightIcon className='size-3.5' />
					打开
				</Button>
				<Button aria-label='更多任务操作' className='size-7 p-0' size='icon' type='button' variant='outline'>
					<MoreHorizontalIcon className='size-4' />
				</Button>
			</div>
		</DetailHeader>
	)
}

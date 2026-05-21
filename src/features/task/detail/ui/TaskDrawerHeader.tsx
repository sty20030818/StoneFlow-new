import { MoreHorizontalIcon, SquareArrowOutUpRightIcon, XIcon } from 'lucide-react'

import type { AutosaveController } from '@/shared/autosave'
import { Button } from '@/shared/ui/base/button'
import { DetailHeader } from '@/shared/ui/detail'

import type { TaskDetailDraft } from '../model/taskDetailDraft'
import { TaskTitleField } from './TaskTitleField'

type TaskDrawerHeaderProps = {
	autosave: AutosaveController<TaskDetailDraft>
	onClose: () => void
}

export function TaskDrawerHeader({ autosave, onClose }: TaskDrawerHeaderProps) {
	return (
		<DetailHeader className='h-12 items-center gap-2 py-0'>
			<div className='min-w-0 flex-1'>
				<TaskTitleField autosave={autosave} />
			</div>
			<div className='flex shrink-0 items-center gap-1'>
				<Button className='h-7 px-2 text-[12px]' size='sm' type='button' variant='outline'>
					<SquareArrowOutUpRightIcon className='size-3.5' />
					打开
				</Button>
				<Button aria-label='更多任务操作' className='size-7 p-0' size='icon' type='button' variant='outline'>
					<MoreHorizontalIcon className='size-4' />
				</Button>
				<Button
					aria-label='关闭任务详情'
					className='size-7 p-0'
					onClick={onClose}
					size='icon'
					type='button'
					variant='ghost'
				>
					<XIcon className='size-4' />
				</Button>
			</div>
		</DetailHeader>
	)
}

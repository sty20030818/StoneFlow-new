import { startTransition } from 'react'
import { MoreHorizontalIcon, SquareArrowOutUpRightIcon } from 'lucide-react'

import { useEntityDetailController } from '@/features/entity-detail'
import type { AutosaveController } from '@/shared/autosave'
import { Button } from '@/shared/components/base/button'
import { DetailHeader, DetailSaveStatus } from '@/shared/components/detail'

import type { TaskDetailDraft } from '../model/taskDetailDraft'

type TaskDrawerHeaderProps = {
	autosave: AutosaveController<TaskDetailDraft>
	taskId: string
}

export function TaskDrawerHeader({ autosave, taskId }: TaskDrawerHeaderProps) {
	const entityDetailController = useEntityDetailController()

	const handleOpenPage = async () => {
		await autosave.flushNow()
		startTransition(() => {
			entityDetailController.openPage({ kind: 'task', id: taskId })
		})
	}

	return (
		<DetailHeader className='min-h-12 items-center gap-2 py-2 pl-3 pr-2'>
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
				<Button
					className='h-7 px-2 text-[12px]'
					onClick={() => void handleOpenPage()}
					size='sm'
					type='button'
					variant='outline'
				>
					<SquareArrowOutUpRightIcon className='size-3.5' />
					打开
				</Button>
				<Button
					aria-label='更多任务操作'
					className='size-7 p-0'
					size='icon'
					type='button'
					variant='outline'
				>
					<MoreHorizontalIcon className='size-4' />
				</Button>
			</div>
		</DetailHeader>
	)
}

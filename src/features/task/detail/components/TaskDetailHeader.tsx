import { startTransition } from 'react'
import { Button } from '@heroui/react'
import { SquareArrowOutUpRightIcon } from 'lucide-react'

import { useEntityDetailController } from '@/features/entity-detail'
import type { AutosaveController } from '@/shared/autosave'
import { DetailHeader, DetailSaveStatus } from '@/shared/components/detail'

import type { TaskDetailDraft } from '../model/taskDetailDraft'

type TaskDetailHeaderProps = {
	autosave: AutosaveController<TaskDetailDraft>
	taskId: string
}

export function TaskDetailHeader(props: TaskDetailHeaderProps) {
	const { autosave, taskId } = props
	const entityDetailController = useEntityDetailController()

	const handleOpenPage = async () => {
		await autosave.flushNow()
		startTransition(() => {
			entityDetailController.openPage({ kind: 'task', id: taskId })
		})
	}

	return (
		<DetailHeader className='min-h-12 items-center gap-2 py-2 pl-3 pr-10'>
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
				<Button onPress={() => void handleOpenPage()} size='sm' variant='outline'>
					<SquareArrowOutUpRightIcon className='size-3.5' />
					打开
				</Button>
			</div>
		</DetailHeader>
	)
}

import { Button } from '@heroui/react'
import { SquareArrowOutUpRightIcon, XIcon } from 'lucide-react'

import { useEntityDetailController } from '@/features/entity-detail'
import type { AutosaveController } from '@/shared/autosave'
import { DetailHeader, DetailSaveStatus } from '@/shared/components/detail'

import type { TaskDetailDraft } from '../model/taskDetailDraft'

type TaskDetailHeaderProps = {
	autosave: AutosaveController<TaskDetailDraft>
	onClose?: () => void
	taskId: string
}

export function TaskDetailHeader(props: TaskDetailHeaderProps) {
	const { autosave, onClose, taskId } = props
	const entityDetailController = useEntityDetailController()

	const handleOpenPage = async () => {
		if (await autosave.flushNow()) {
			void entityDetailController.openPage({ kind: 'task', id: taskId })
		}
	}

	return (
		<DetailHeader className='h-12 items-center gap-2 border-separator py-0 pl-3 pr-2'>
			<div className='min-w-0 flex flex-1 items-center gap-2'>
				<h2 className='shrink-0 text-xs font-medium text-muted'>任务详情</h2>
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
				{onClose ? (
					<Button isIconOnly aria-label='关闭任务详情' onPress={onClose} size='sm' variant='ghost'>
						<XIcon aria-hidden='true' className='size-3.5' />
					</Button>
				) : null}
			</div>
		</DetailHeader>
	)
}

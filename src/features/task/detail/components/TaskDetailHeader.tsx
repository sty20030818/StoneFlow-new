import { Button } from '@heroui/react'
import { SquareArrowOutUpRightIcon, XIcon } from 'lucide-react'

import { useEntityDetailController } from '@/features/entity-detail'
import type { AutosaveController } from '@/shared/autosave'

import type { TaskDetailDraft } from '../model/taskDetailDraft'
import { TaskAutosaveStatus } from './TaskAutosaveStatus'

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
		<header className='flex h-12 shrink-0 items-center justify-between gap-2 px-3'>
			<div className='min-w-0 flex flex-1 items-center gap-2'>
				<h2 className='shrink-0 text-sm font-semibold text-foreground'>任务详情</h2>
				<TaskAutosaveStatus error={autosave.error} status={autosave.status} />
			</div>
			<div className='flex shrink-0 items-center gap-1'>
				<Button
					aria-label='在完整页面中打开任务'
					onPress={() => void handleOpenPage()}
					size='sm'
					variant='ghost'
				>
					<SquareArrowOutUpRightIcon className='size-3.5' />
					完整页面
				</Button>
				{onClose ? (
					<Button isIconOnly aria-label='关闭任务详情' onPress={onClose} size='sm' variant='ghost'>
						<XIcon aria-hidden='true' className='size-3.5' />
					</Button>
				) : null}
			</div>
		</header>
	)
}

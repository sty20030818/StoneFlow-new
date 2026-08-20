import { Button } from '@heroui/react'
import { SquareArrowOutUpRightIcon, XIcon } from 'lucide-react'

import { useEntityDetailController } from '@/features/entity-detail'
import type { AutosaveController, AutosaveStatus } from '@/shared/autosave'

import type { TaskDetailDraft } from '../model/taskDetailDraft'

type TaskDetailHeaderProps = {
	autosave: AutosaveController<TaskDetailDraft>
	onClose?: () => void
	taskId: string
}

const SAVE_STATUS_LABELS: Partial<Record<AutosaveStatus, string>> = {
	dirty: '已编辑',
	scheduled: '保存中...',
	saving: '保存中...',
	saved: '已保存',
	failed: '保存失败',
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
		<header className='flex h-12 shrink-0 items-center justify-between gap-2 border-b border-separator py-0 pr-2 pl-3'>
			<div className='min-w-0 flex flex-1 items-center gap-2'>
				<h2 className='shrink-0 text-xs font-medium text-muted'>任务详情</h2>
				<TaskDetailSaveStatus error={autosave.error} status={autosave.status} />
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
		</header>
	)
}

function TaskDetailSaveStatus({
	status,
	error,
}: {
	status: AutosaveStatus
	error?: string | null
}) {
	const label = SAVE_STATUS_LABELS[status]
	if (!label) return null

	const isError = status === 'failed'
	return (
		<div
			className={
				isError
					? 'truncate text-[11px] leading-none text-danger-soft-foreground'
					: 'truncate text-[11px] leading-none text-muted'
			}
		>
			<span>{label}</span>
			{isError && error ? <span className='ml-1'>{error}</span> : null}
		</div>
	)
}

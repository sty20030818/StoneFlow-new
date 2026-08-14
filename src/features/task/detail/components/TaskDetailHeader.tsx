import { startTransition } from 'react'
import { Button, Dropdown } from '@heroui/react'
import { CheckIcon, PanelRightIcon, SquareArrowOutUpRightIcon } from 'lucide-react'

import { useEntityDetailController } from '@/features/entity-detail'
import type { AutosaveController } from '@/shared/autosave'
import { DetailHeader, DetailSaveStatus } from '@/shared/components/detail'

import type { TaskDetailDraft } from '../model/taskDetailDraft'
import type { TaskDetailPresentationPreference } from './TaskDetailContent'

type TaskDetailHeaderProps = {
	autosave: AutosaveController<TaskDetailDraft>
	taskId: string
	presentationPreference: TaskDetailPresentationPreference
	onPresentationPreferenceChange: (value: TaskDetailPresentationPreference) => void
}

export function TaskDetailHeader(props: TaskDetailHeaderProps) {
	const { autosave, taskId, presentationPreference, onPresentationPreferenceChange } = props
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
				<Dropdown>
					<Dropdown.Trigger
						aria-label='详情呈现方式'
						className='button button--outline button--sm size-8 p-0'
					>
						<PanelRightIcon className='size-4' />
					</Dropdown.Trigger>
					<Dropdown.Popover className='min-w-40' placement='bottom end'>
						<Dropdown.Menu
							aria-label='详情呈现方式'
							onAction={(key) => {
								if (key === 'sheet' || key === 'aside') {
									onPresentationPreferenceChange(key)
								}
							}}
							selectedKeys={[presentationPreference]}
							selectionMode='single'
						>
							<Dropdown.Item id='sheet' textValue='Sheet'>
								<Dropdown.ItemIndicator>
									<CheckIcon />
								</Dropdown.ItemIndicator>
								<span>Sheet</span>
							</Dropdown.Item>
							<Dropdown.Item id='aside' textValue='Aside'>
								<Dropdown.ItemIndicator>
									<CheckIcon />
								</Dropdown.ItemIndicator>
								<span>Aside</span>
							</Dropdown.Item>
						</Dropdown.Menu>
					</Dropdown.Popover>
				</Dropdown>
				<Button onPress={() => void handleOpenPage()} size='sm' variant='outline'>
					<SquareArrowOutUpRightIcon className='size-3.5' />
					打开
				</Button>
			</div>
		</DetailHeader>
	)
}

import { Button, Dropdown } from '@heroui/react'
import { CheckIcon } from 'lucide-react'

import { formatStatusLabel } from '../../model/launcherFormatters'
import type { LauncherStatus } from '../../model/types'
import { TaskStatusIndicator } from '@/features/task'

const STATUS_OPTIONS: LauncherStatus[] = ['todo', 'doing', 'done']

type StatusControlProps = {
	open: boolean
	status: LauncherStatus
	disabled?: boolean
	onOpenChange: (open: boolean) => void
	onStatusChange: (status: LauncherStatus) => void
}

/**
 * Launcher 状态控件。
 * 视觉语言借用任务创建，但仍保留 launcher 自己的三态范围。
 */
export function StatusControl({
	open,
	status,
	disabled = false,
	onOpenChange,
	onStatusChange,
}: StatusControlProps) {
	return (
		<Dropdown isOpen={open} onOpenChange={onOpenChange}>
			<Button aria-label='状态' isDisabled={disabled} size='sm' variant='outline'>
				<TaskStatusIndicator status={status} />
				{formatStatusLabel(status)}
			</Button>
			<Dropdown.Popover className='w-40' placement='bottom start'>
				<Dropdown.Menu aria-label='设置状态'>
					{STATUS_OPTIONS.map((option) => (
						<Dropdown.Item
							id={option}
							key={option}
							onAction={() => onStatusChange(option)}
							textValue={formatStatusLabel(option)}
						>
							<TaskStatusIndicator status={option} />
							<span className='min-w-0 flex-1 truncate'>{formatStatusLabel(option)}</span>
							{status === option ? (
								<CheckIcon aria-hidden className='ml-auto size-3.5 shrink-0 text-muted' />
							) : null}
						</Dropdown.Item>
					))}
				</Dropdown.Menu>
			</Dropdown.Popover>
		</Dropdown>
	)
}

import { CheckIcon } from 'lucide-react'

import { formatStatusLabel } from '@/features/quick-create/model/quickCreateFormatters'
import type { QuickCreateStatus } from '@/features/quick-create/model/types'
import { TaskStatusIndicator } from '@/features/task/model/indicators/TaskStatusIndicator'
import { Button } from '@/shared/components/base/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/shared/components/base/dropdown-menu'
import {
	quickCreateMenuContentClass,
	quickCreateMenuItemClass,
} from '@/shared/components/patterns/quick-create'

const STATUS_OPTIONS: QuickCreateStatus[] = ['todo', 'doing', 'done']

type StatusControlProps = {
	open: boolean
	status: QuickCreateStatus
	disabled?: boolean
	onOpenChange: (open: boolean) => void
	onStatusChange: (status: QuickCreateStatus) => void
}

/**
 * Quick Create 状态控件。
 * 视觉语言借用任务创建，但仍保留 quick-create 自己的三态范围。
 */
export function StatusControl({
	open,
	status,
	disabled = false,
	onOpenChange,
	onStatusChange,
}: StatusControlProps) {
	return (
		<DropdownMenu onOpenChange={onOpenChange} open={open}>
			<DropdownMenuTrigger asChild>
				<Button disabled={disabled} size='sm' variant='outline'>
					<TaskStatusIndicator status={status} />
					{formatStatusLabel(status)}
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align='start' className={`w-40 ${quickCreateMenuContentClass}`}>
				<DropdownMenuGroup>
					{STATUS_OPTIONS.map((option) => (
						<DropdownMenuItem
							className={quickCreateMenuItemClass}
							key={option}
							onSelect={() => onStatusChange(option)}
						>
							<TaskStatusIndicator status={option} />
							<span className='min-w-0 flex-1 truncate'>{formatStatusLabel(option)}</span>
							{status === option ? (
								<CheckIcon
									aria-hidden
									className='ml-auto size-3.5 shrink-0 text-sf-icon-secondary'
								/>
							) : null}
						</DropdownMenuItem>
					))}
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}

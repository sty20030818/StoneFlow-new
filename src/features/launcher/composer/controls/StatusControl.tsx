import { CheckIcon } from 'lucide-react'

import { formatStatusLabel } from '@/features/launcher/model/launcherFormatters'
import type { LauncherStatus } from '@/features/launcher/model/types'
import { TaskStatusIndicator } from '@/features/task'
import { Button } from '@/shared/components/base/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/shared/components/base/dropdown-menu'
import {
	launcherMenuContentClass,
	launcherMenuItemClass,
} from '@/shared/components/patterns/launcher'

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
		<DropdownMenu onOpenChange={onOpenChange} open={open}>
			<DropdownMenuTrigger asChild>
				<Button disabled={disabled} size='sm' variant='outline'>
					<TaskStatusIndicator status={status} />
					{formatStatusLabel(status)}
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align='start' className={`w-40 ${launcherMenuContentClass}`}>
				<DropdownMenuGroup>
					{STATUS_OPTIONS.map((option) => (
						<DropdownMenuItem
							className={launcherMenuItemClass}
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

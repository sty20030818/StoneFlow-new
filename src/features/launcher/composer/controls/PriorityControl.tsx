import { useState } from 'react'
import { CheckIcon } from 'lucide-react'

import type { LauncherPriority } from '../../model/types'
import { TASK_PRIORITY_OPTIONS } from '@/features/task'
import { PriorityIcon } from '@/features/task'
import { Button } from '@/shared/components/base/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/shared/components/base/dropdown-menu'
import { cn } from '@/shared/lib/utils'
import {
	launcherMenuContentClass,
	launcherMenuItemClass,
} from '@/shared/components/patterns/launcher'
import { ActionTooltip, DisabledActionTooltip } from '@/shared/components/tooltip'

type PriorityControlProps = {
	open: boolean
	priority: LauncherPriority
	disabled?: boolean
	onOpenChange: (open: boolean) => void
	onPriorityChange: (priority: LauncherPriority) => void
}

/**
 * Launcher 优先级控件。
 * 触发器改成 icon-only，菜单实现回到共享 DropdownMenu 体系。
 */
export function PriorityControl({
	open,
	priority,
	disabled = false,
	onOpenChange,
	onPriorityChange,
}: PriorityControlProps) {
	const [tooltipOpen, setTooltipOpen] = useState(false)

	function handleMenuOpenChange(nextOpen: boolean) {
		onOpenChange(nextOpen)
		if (nextOpen) {
			setTooltipOpen(false)
		}
	}
	const trigger = (
		<DropdownMenuTrigger asChild>
			<Button
				aria-label='优先级'
				className={cn(
					priority === 0
						? 'border-sf-border-subtle text-sf-text-quaternary'
						: 'border-sf-border-interactive text-sf-text-interactive',
				)}
				disabled={disabled}
				size='icon-sm'
				variant='outline'
			>
				<PriorityIcon priority={priority} size='md' />
			</Button>
		</DropdownMenuTrigger>
	)

	return (
		<DropdownMenu onOpenChange={handleMenuOpenChange} open={open}>
			{disabled ? (
				<DisabledActionTooltip label='设置优先级' reason='正在创建，暂时无法修改优先级'>
					{trigger}
				</DisabledActionTooltip>
			) : (
				<ActionTooltip
					isOpen={tooltipOpen}
					label='设置优先级'
					onOpenChange={(nextOpen) => setTooltipOpen(open ? false : nextOpen)}
				>
					{trigger}
				</ActionTooltip>
			)}
			<DropdownMenuContent align='start' className={`w-46 ${launcherMenuContentClass}`}>
				<DropdownMenuGroup>
					{TASK_PRIORITY_OPTIONS.map((option) => (
						<DropdownMenuItem
							className={launcherMenuItemClass}
							key={option.value}
							onSelect={() => onPriorityChange(option.value)}
						>
							<PriorityIcon priority={option.value} size='md' />
							<span className='min-w-0 flex-1 truncate'>{option.label}</span>
							{priority === option.value ? (
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

import { useState } from 'react'
import { Button, Dropdown } from '@heroui/react'
import { CheckIcon } from 'lucide-react'

import type { LauncherPriority } from '../../model/types'
import { TASK_PRIORITY_OPTIONS } from '@/features/task'
import { PriorityIcon } from '@/features/task'
import { ActionTooltip, DisabledActionTooltip } from '@/shared/components/tooltip'

type PriorityControlProps = {
	open: boolean
	priority: LauncherPriority
	disabled?: boolean
	onOpenChange: (open: boolean) => void
	onPriorityChange: (priority: LauncherPriority) => void
}

/** Launcher 优先级控件；触发器保持紧凑，菜单直接使用 HeroUI Dropdown。 */
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
		<Button aria-label='优先级' isDisabled={disabled} isIconOnly size='sm' variant='outline'>
			<PriorityIcon priority={priority} size='md' />
		</Button>
	)

	return (
		<Dropdown isOpen={open} onOpenChange={handleMenuOpenChange}>
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
			<Dropdown.Popover className='w-46' placement='bottom start'>
				<Dropdown.Menu aria-label='设置优先级'>
					{TASK_PRIORITY_OPTIONS.map((option) => (
						<Dropdown.Item
							className='gap-2 p-2 text-[12.5px]'
							id={String(option.value)}
							key={option.value}
							onAction={() => onPriorityChange(option.value)}
							textValue={option.label}
						>
							<PriorityIcon priority={option.value} size='md' />
							<span className='min-w-0 flex-1 truncate'>{option.label}</span>
							{priority === option.value ? (
								<CheckIcon aria-hidden className='ml-auto size-3.5 shrink-0 text-muted' />
							) : null}
						</Dropdown.Item>
					))}
				</Dropdown.Menu>
			</Dropdown.Popover>
		</Dropdown>
	)
}

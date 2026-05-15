import type { ReactNode } from 'react'

import { CheckIcon } from 'lucide-react'

import { cn } from '@/shared/lib/utils'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from '@/shared/ui/base/dropdown-menu'
import { stopRowEventPropagation } from '@/shared/ui/row/RowFieldCells'

const PRIORITY_TRIGGER_CLASS =
	'flex size-5 shrink-0 items-center justify-center rounded-full border border-transparent bg-transparent p-0 text-foreground shadow-none transition-colors outline-none focus-visible:border-border focus-visible:ring-0 disabled:pointer-events-none disabled:opacity-50'

export type PriorityCellOption<TValue extends string | number = string | number> = {
	value: TValue
	label: string
	icon: ReactNode
}

export type PriorityCellProps<TValue extends string | number = string | number> = {
	value: TValue | null | undefined
	disabled?: boolean
	ariaLabel: string
	triggerDataAttribute?: string
	options: Array<PriorityCellOption<TValue>>
	onChange?: (value: TValue) => void
}

export function PriorityCell<TValue extends string | number = string | number>({
	value,
	disabled,
	ariaLabel,
	triggerDataAttribute,
	options,
	onChange,
}: PriorityCellProps<TValue>) {
	const currentOption = options.find((option) => option.value === value) ?? options[0]
	if (!currentOption) {
		return null
	}

	return (
		<div className='flex size-5 shrink-0 items-center justify-center' onClick={stopRowEventPropagation} onPointerDown={stopRowEventPropagation}>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<button
						aria-label={ariaLabel}
						className={PRIORITY_TRIGGER_CLASS}
						data-task-row-menu-trigger={triggerDataAttribute}
						disabled={disabled}
						onKeyDownCapture={stopRowEventPropagation}
						type='button'
					>
						{currentOption.icon}
						<span className='sr-only'>{currentOption.label}</span>
					</button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align='start' sideOffset={6}>
					<DropdownMenuLabel>优先级</DropdownMenuLabel>
					<DropdownMenuGroup>
						{options.map((option) => (
							<DropdownMenuItem
								className='gap-2 p-2'
								key={String(option.value)}
								onSelect={() => onChange?.(option.value)}
							>
								{option.icon}
								<span className='min-w-0 flex-1 truncate'>{option.label}</span>
								{currentOption.value === option.value ? (
									<CheckIcon
										aria-hidden
										className={cn('ml-auto size-3.5 shrink-0 text-sf-icon-secondary')}
									/>
								) : null}
							</DropdownMenuItem>
						))}
					</DropdownMenuGroup>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	)
}

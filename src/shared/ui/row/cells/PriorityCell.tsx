import type { ReactNode } from 'react'
import { useMemo } from 'react'

import { CheckIcon } from 'lucide-react'

import { buildDigitShortcutMap } from '@/shared/ui/shortcut-menu'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from '@/shared/ui/base/dropdown-menu'
import { stopRowEventPropagation } from '@/shared/ui/row/RowFieldCells'
import { ShortcutDigitSelectLayer, ShortcutMenuItemHint } from '@/shared/ui/shortcut-menu'

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
	const shortcutItems = useMemo(
		() =>
			options.map((option) => ({
				label: option.label,
				value: option.value,
				disabled: false,
				isEmptyValue: String(option.value) === '0',
			})),
		[options],
	)
	const digitShortcutMap = useMemo(() => buildDigitShortcutMap(shortcutItems), [shortcutItems])
	if (!currentOption) {
		return null
	}

	return (
		<div
			className='flex size-5 shrink-0 items-center justify-center'
			onClick={stopRowEventPropagation}
			onPointerDown={stopRowEventPropagation}
		>
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
					<ShortcutDigitSelectLayer
						items={shortcutItems}
						onSelect={(item) => onChange?.(item.value)}
					/>
					<DropdownMenuLabel>优先级</DropdownMenuLabel>
					<DropdownMenuGroup>
						{options.map((option, index) => (
							<DropdownMenuItem
								className='gap-2 p-2'
								key={String(option.value)}
								onSelect={() => onChange?.(option.value)}
							>
								{option.icon}
								<span className='min-w-0 flex-1 truncate'>{option.label}</span>
								<span
									aria-hidden
									className='inline-flex size-3.5 shrink-0 items-center justify-center'
									data-slot='row-cell-selected-indicator'
								>
									{currentOption.value === option.value ? (
										<CheckIcon
											aria-hidden
											className='size-3.5 shrink-0 text-sf-icon-secondary'
										/>
									) : null}
								</span>
								<ShortcutMenuItemHint digit={digitShortcutMap[index]?.digit ?? ''} />
							</DropdownMenuItem>
						))}
					</DropdownMenuGroup>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	)
}

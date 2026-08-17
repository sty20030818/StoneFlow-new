import { useMemo, useState, type ReactNode } from 'react'

import {
	CommandShortcut,
	CommandTooltipRow,
	type CommandId,
	type KeybindingScope,
} from '@/features/command'
import {
	buildMetadataShortcutItems,
	defaultMetadataValueComparator,
	getMetadataFieldIndicator,
	type MetadataFieldOption,
	type MetadataShortcutMode,
	type MetadataValueComparator,
} from '@/features/metadata-fields/core'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from '@/shared/components/base/dropdown-menu'
import { buildDigitShortcutMap, ShortcutDigitSelectLayer } from '@/shared/components/shortcut-menu'
import { ActionTooltip, DisabledActionTooltip } from '@/shared/components/tooltip'

import { MetadataFieldButton } from './MetadataFieldButton'
import { MetadataFieldMenuItem } from './MetadataFieldMenuItem'

export type MetadataFieldKey =
	| 'status'
	| 'priority'
	| 'project'
	| 'space'
	| 'parentProject'
	| 'dueDate'
	| 'scheduledDate'
	| 'reminderDate'

type MetadataMenuAlign = 'start' | 'center' | 'end'

export type MetadataCommandShortcut = {
	commandId: CommandId
	scope: KeybindingScope
}

export type MetadataFieldDropdownProps<TValue> = {
	fieldKey?: MetadataFieldKey
	label: string
	value: TValue
	values?: TValue[]
	options: Array<MetadataFieldOption<TValue>>
	menuLabel?: string
	shortcut?: MetadataCommandShortcut
	ariaLabel?: string
	tooltipLabel?: string
	buttonLabel?: ReactNode
	buttonIcon?: ReactNode
	compact?: boolean
	buttonAppearance?: 'default' | 'row-icon'
	disabled?: boolean
	disabledReason?: ReactNode
	drawerOwnedOverlay?: boolean
	menuAlign?: MetadataMenuAlign
	stopPropagation?: boolean
	shortcutMode?: MetadataShortcutMode
	isValueEqual?: MetadataValueComparator<TValue>
	onSelectCustomOption?: (optionKey: string) => void
	onChange: (value: TValue) => void
}

export function MetadataFieldDropdown<TValue>({
	fieldKey,
	label,
	value,
	values,
	options,
	menuLabel,
	shortcut,
	ariaLabel,
	tooltipLabel,
	buttonLabel,
	buttonIcon,
	compact,
	buttonAppearance = 'default',
	disabled,
	disabledReason,
	drawerOwnedOverlay,
	menuAlign = 'start',
	stopPropagation,
	shortcutMode = 'default',
	isValueEqual = defaultMetadataValueComparator,
	onSelectCustomOption,
	onChange,
}: MetadataFieldDropdownProps<TValue>) {
	const [menuOpen, setMenuOpen] = useState(false)
	const [tooltipOpen, setTooltipOpen] = useState(false)
	const currentOption = options.find((option) => isValueEqual(option.value, value)) ?? options[0]
	const selectedValues = values ?? [value]
	const shortcutItems = useMemo(
		() => buildMetadataShortcutItems(options, shortcutMode),
		[options, shortcutMode],
	)
	const digitShortcutMap = useMemo(() => buildDigitShortcutMap(shortcutItems), [shortcutItems])
	const resolvedMenuLabel = menuLabel ?? buildMetadataMenuLabel(fieldKey, label)

	if (!currentOption) {
		return null
	}
	const resolvedAriaLabel = ariaLabel ?? label
	const resolvedTooltipLabel = tooltipLabel ?? label

	const trigger = (
		<DropdownMenuTrigger asChild>
			<MetadataFieldButton
				ariaLabel={resolvedAriaLabel}
				appearance={buttonAppearance}
				compact={compact}
				disabled={disabled}
				icon={buttonIcon === undefined ? currentOption.icon : buttonIcon}
				label={buttonLabel ?? currentOption.label}
				stopPropagation={stopPropagation}
				suppressOverflowTooltip={menuOpen}
			/>
		</DropdownMenuTrigger>
	)
	const shouldShowTooltip = buttonAppearance === 'row-icon' || shortcut !== undefined

	return (
		<DropdownMenu
			onOpenChange={(open) => {
				setMenuOpen(open)
				if (open) {
					setTooltipOpen(false)
				}
			}}
			open={menuOpen}
		>
			{disabled && disabledReason ? (
				<DisabledActionTooltip
					ariaLabel={resolvedAriaLabel}
					label={resolvedTooltipLabel}
					reason={disabledReason}
					shortcut={
						shortcut ? (
							<CommandShortcut commandId={shortcut.commandId} scope={shortcut.scope} />
						) : undefined
					}
				>
					{trigger}
				</DisabledActionTooltip>
			) : shouldShowTooltip && !disabled ? (
				<ActionTooltip
					onOpenChange={(open) => setTooltipOpen(open && !menuOpen)}
					open={tooltipOpen && !menuOpen}
				>
					<ActionTooltip.Trigger asChild>{trigger}</ActionTooltip.Trigger>
					<ActionTooltip.Content>
						{shortcut ? (
							<CommandTooltipRow
								commandId={shortcut.commandId}
								label={resolvedTooltipLabel}
								scope={shortcut.scope}
							/>
						) : (
							<ActionTooltip.Row label={resolvedTooltipLabel} />
						)}
					</ActionTooltip.Content>
				</ActionTooltip>
			) : (
				trigger
			)}
			<DropdownMenuContent
				align={menuAlign}
				data-drawer-owned-overlay={drawerOwnedOverlay ? 'true' : undefined}
				sideOffset={6}
			>
				<ShortcutDigitSelectLayer items={shortcutItems} onSelect={(item) => onChange(item.value)} />
				<DropdownMenuLabel className='px-2 py-1.5 text-[12px] normal-case tracking-normal'>
					<span className='flex items-center gap-2'>
						<span className='min-w-0 flex-1 truncate'>{resolvedMenuLabel}</span>
						{shortcut ? (
							<CommandShortcut commandId={shortcut.commandId} scope={shortcut.scope} />
						) : null}
					</span>
				</DropdownMenuLabel>
				<DropdownMenuGroup>
					{options.map((option, index) => {
						const shortcutDigit =
							digitShortcutMap.find((entry) => isValueEqual(entry.item.value, option.value))
								?.digit ?? ''

						return (
							<MetadataFieldMenuItem
								disabled={option.disabled}
								digit={
									shortcutMode === 'clear-only'
										? option.isEmptyValue
											? shortcutDigit
											: ''
										: shortcutDigit
								}
								icon={option.icon}
								indicator={getMetadataFieldIndicator({
									optionValue: option.value,
									selectedValues,
									isValueEqual,
								})}
								key={option.key ?? String(option.value)}
								label={option.label}
								stopPropagation={stopPropagation}
								trailing={option.trailing}
								value={option.value}
								onSelect={(nextValue) => {
									if (option.action === 'openCustomDateDialog') {
										onSelectCustomOption?.(option.key ?? String(index))
										return
									}

									onChange(nextValue)
								}}
							/>
						)
					})}
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}

function buildMetadataMenuLabel(fieldKey: MetadataFieldKey | undefined, fallbackLabel: string) {
	switch (fieldKey) {
		case 'project':
			return '移动到项目...'
		case 'dueDate':
			return '设置截止时间为...'
		case 'scheduledDate':
			return '设置计划时间为...'
		case 'reminderDate':
			return '设置提醒时间为...'
		default:
			return `设置${fallbackLabel}为...`
	}
}

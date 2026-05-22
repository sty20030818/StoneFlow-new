import { useMemo, type ReactNode } from 'react'

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
} from '@/shared/ui/base/dropdown-menu'
import { Kbd } from '@/shared/ui/base/kbd'
import { buildDigitShortcutMap, ShortcutDigitSelectLayer } from '@/shared/ui/shortcut-menu'

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

export type MetadataFieldDropdownProps<TValue> = {
	fieldKey?: MetadataFieldKey
	label: string
	value: TValue
	values?: TValue[]
	options: Array<MetadataFieldOption<TValue>>
	menuLabel?: string
	headerShortcut?: string | null
	ariaLabel?: string
	buttonLabel?: ReactNode
	buttonIcon?: ReactNode
	compact?: boolean
	buttonAppearance?: 'default' | 'row-icon'
	disabled?: boolean
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
	headerShortcut,
	ariaLabel,
	buttonLabel,
	buttonIcon,
	compact,
	buttonAppearance = 'default',
	disabled,
	drawerOwnedOverlay,
	menuAlign = 'start',
	stopPropagation,
	shortcutMode = 'default',
	isValueEqual = defaultMetadataValueComparator,
	onSelectCustomOption,
	onChange,
}: MetadataFieldDropdownProps<TValue>) {
	const currentOption = options.find((option) => isValueEqual(option.value, value)) ?? options[0]
	const selectedValues = values ?? [value]
	const shortcutItems = useMemo(
		() => buildMetadataShortcutItems(options, shortcutMode),
		[options, shortcutMode],
	)
	const digitShortcutMap = useMemo(() => buildDigitShortcutMap(shortcutItems), [shortcutItems])
	const resolvedMenuLabel = menuLabel ?? buildMetadataMenuLabel(fieldKey, label)
	const resolvedHeaderShortcut = headerShortcut ?? getMetadataMenuShortcut(fieldKey)

	if (!currentOption) {
		return null
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<MetadataFieldButton
					ariaLabel={ariaLabel ?? label}
					appearance={buttonAppearance}
					compact={compact}
					disabled={disabled}
					icon={buttonIcon === undefined ? currentOption.icon : buttonIcon}
					label={buttonLabel ?? currentOption.label}
					stopPropagation={stopPropagation}
				/>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align={menuAlign}
				data-drawer-owned-overlay={drawerOwnedOverlay ? 'true' : undefined}
				sideOffset={6}
			>
				<ShortcutDigitSelectLayer items={shortcutItems} onSelect={(item) => onChange(item.value)} />
				<DropdownMenuLabel className='px-2 py-1.5 text-[12px] normal-case tracking-normal'>
					<span className='flex items-center gap-2'>
						<span className='min-w-0 flex-1 truncate'>{resolvedMenuLabel}</span>
						{resolvedHeaderShortcut ? (
							<Kbd
								className='h-5 min-w-5 rounded-sm border border-sf-border-subtle bg-background/90 px-1.5 text-[11px] font-medium text-muted-foreground'
								data-slot='metadata-field-menu-shortcut-summary'
							>
								{resolvedHeaderShortcut}
							</Kbd>
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
								key={option.key ?? String(index)}
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

function getMetadataMenuShortcut(fieldKey: MetadataFieldKey | undefined) {
	switch (fieldKey) {
		case 'priority':
			return 'P'
		case 'status':
			return 'S'
		case 'dueDate':
			return 'D'
		case 'project':
			return '⇧ P'
		default:
			return null
		}
}

import type { ReactNode } from 'react'
import { FolderIcon, InboxIcon, TargetIcon } from 'lucide-react'

import {
	buildMetadataShortcutItems,
	findTaskPlacementGroupItem,
	findMetadataPlacementOption,
	getMetadataFieldIndicator,
	isMetadataPlacementValueEqual,
	isTaskPlacementTargetEqual,
	type MetadataPlacementOption,
	type MetadataPlacementValue,
	type MetadataShortcutMode,
	type TaskPlacementGroup,
	type TaskPlacementTarget,
} from '@/features/metadata-fields/core'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from '@/shared/ui/base/dropdown-menu'
import { Kbd } from '@/shared/ui/base/kbd'
import { ShortcutDigitSelectLayer } from '@/shared/ui/shortcut-menu'

import { MetadataFieldButton } from './MetadataFieldButton'
import { MetadataFieldDropdown } from './MetadataFieldDropdown'
import type { MetadataFieldKey } from './MetadataFieldDropdown'
import { MetadataPlacementGroupList } from './MetadataPlacementGroupList'

type PlacementDropdownSharedProps = {
	label: string
	menuLabel?: string
	headerShortcut?: string | null
	ariaLabel?: string
	buttonIcon?: ReactNode
	buttonLabel?: ReactNode
	compact?: boolean
	buttonAppearance?: 'default' | 'row-icon'
	disabled?: boolean
	drawerOwnedOverlay?: boolean
	menuAlign?: 'start' | 'center' | 'end'
	stopPropagation?: boolean
	shortcutMode?: MetadataShortcutMode
}

type LegacyPlacementDropdownProps = PlacementDropdownSharedProps & {
	value: MetadataPlacementValue
	values?: MetadataPlacementValue[]
	options: MetadataPlacementOption[]
	onChange: (value: MetadataPlacementValue) => void
}

type GroupedPlacementDropdownProps = PlacementDropdownSharedProps & {
	value: TaskPlacementTarget
	values?: TaskPlacementTarget[]
	groups: TaskPlacementGroup[]
	onChange: (value: TaskPlacementTarget) => void
}

export type MetadataPlacementDropdownProps =
	| LegacyPlacementDropdownProps
	| GroupedPlacementDropdownProps

export function MetadataPlacementDropdown(props: MetadataPlacementDropdownProps) {
	if (isGroupedPlacementDropdownProps(props)) {
		return <GroupedPlacementDropdown {...props} />
	}

	const {
		label,
		value,
		values,
		options,
		menuLabel,
		headerShortcut,
		ariaLabel,
		buttonIcon,
		buttonLabel,
		compact,
		buttonAppearance = 'default',
		disabled,
		drawerOwnedOverlay,
		menuAlign,
		stopPropagation,
		shortcutMode = 'clear-only',
		onChange,
	} = props

	const currentOption = findMetadataPlacementOption(options, value)
	const resolvedValue = currentOption?.value ?? options[0]?.value

	if (!currentOption || !resolvedValue) {
		return null
	}

	return (
		<MetadataFieldDropdown
			ariaLabel={ariaLabel}
			buttonIcon={buttonIcon ?? currentOption.icon}
			buttonLabel={buttonLabel ?? currentOption.label}
			buttonAppearance={buttonAppearance}
			compact={compact}
			disabled={disabled}
			drawerOwnedOverlay={drawerOwnedOverlay}
			fieldKey={getMetadataPlacementFieldKey(label)}
			headerShortcut={headerShortcut}
			isValueEqual={isMetadataPlacementValueEqual}
			label={label}
			menuAlign={menuAlign}
			menuLabel={menuLabel}
			options={options}
			shortcutMode={shortcutMode}
			stopPropagation={stopPropagation}
			value={resolvedValue}
			values={values}
			onChange={onChange}
		/>
	)
}

function GroupedPlacementDropdown({
	label,
	value,
	values,
	groups,
	menuLabel,
	headerShortcut,
	ariaLabel,
	buttonIcon,
	buttonLabel,
	compact,
	buttonAppearance = 'default',
	disabled,
	drawerOwnedOverlay,
	menuAlign = 'start',
	stopPropagation,
	shortcutMode = 'clear-only',
	onChange,
}: GroupedPlacementDropdownProps) {
	const currentItem = findTaskPlacementGroupItem(groups, value)
	const selectedValues = values ?? [value]
	const flatItems = groups.flatMap((group) => group.items)
	const shortcutItems = buildMetadataShortcutItems(
		flatItems.map((item) => ({
			label: item.title,
			value: item.target,
			isEmptyValue: item.isEmptyValue,
		})),
		shortcutMode,
	)
	const fieldKey = getMetadataPlacementFieldKey(label)
	const resolvedMenuLabel = menuLabel ?? buildPlacementMenuLabel(fieldKey, label)
	const resolvedHeaderShortcut = headerShortcut ?? getPlacementMenuShortcut(fieldKey)

	if (!currentItem) {
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
					icon={buttonIcon ?? getGroupedPlacementIcon(currentItem)}
					label={buttonLabel ?? currentItem.title}
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
				<MetadataPlacementGroupList
					getDigit={(item) => {
						if (!item?.showsDigit) {
							return ''
						}
						return item.digit ?? ''
					}}
					getIcon={getGroupedPlacementIcon}
					getIndicator={(target) =>
						getMetadataFieldIndicator({
							optionValue: target,
							selectedValues,
							isValueEqual: isTaskPlacementTargetEqual,
						})
					}
					groups={groups}
					stopPropagation={stopPropagation}
					onChange={onChange}
				/>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}

function getGroupedPlacementIcon(
	itemOrTarget: TaskPlacementTarget | TaskPlacementGroup['items'][number],
) {
	const title = 'target' in itemOrTarget ? itemOrTarget.title : null
	const target = 'target' in itemOrTarget ? itemOrTarget.target : itemOrTarget

	if (target.kind === 'project') {
		return <FolderIcon className='size-3.5' />
	}

	if (title === '收件箱') {
		return <InboxIcon className='size-3.5' />
	}

	return <TargetIcon className='size-3.5' />
}

function buildPlacementMenuLabel(fieldKey: MetadataFieldKey, fallbackLabel: string) {
	switch (fieldKey) {
		case 'project':
			return '移动到项目...'
		default:
			return `设置${fallbackLabel}为...`
	}
}

function getPlacementMenuShortcut(fieldKey: MetadataFieldKey) {
	switch (fieldKey) {
		case 'project':
			return '⇧ P'
		default:
			return null
	}
}

function getMetadataPlacementFieldKey(label: string): MetadataFieldKey {
	switch (label) {
		case '空间':
			return 'space'
		case '父项目':
			return 'parentProject'
		default:
			return 'project'
	}
}

function isGroupedPlacementDropdownProps(
	props: MetadataPlacementDropdownProps,
): props is GroupedPlacementDropdownProps {
	return 'groups' in props
}

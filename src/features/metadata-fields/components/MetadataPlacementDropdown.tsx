import { useState, type ReactNode } from 'react'
import { Dropdown } from '@heroui/react'
import { Header } from 'react-aria-components'
import { FolderIcon, TargetIcon } from 'lucide-react'

import { CommandShortcut } from '@/features/command'
import {
	buildMetadataShortcutItems,
	findTaskPlacementGroupItem,
	getMetadataFieldIndicator,
	isTaskPlacementTargetEqual,
	type MetadataShortcutMode,
	type TaskPlacementGroup,
	type TaskPlacementTarget,
} from '@/features/metadata-fields/core'
import { ShortcutDigitSelectLayer } from '@/shared/components/shortcut-menu'
import { ActionTooltip, DisabledActionTooltip } from '@/shared/components/tooltip'

import { MetadataFieldButton } from './MetadataFieldButton'
import type { MetadataCommandShortcut } from './MetadataFieldDropdown'
import { MetadataPlacementGroupList } from './MetadataPlacementGroupList'

type MetadataPlacementDropdownProps = {
	label: string
	menuLabel?: string
	shortcut?: MetadataCommandShortcut
	ariaLabel?: string
	buttonIcon?: ReactNode
	buttonLabel?: ReactNode
	compact?: boolean
	buttonAppearance?: 'default' | 'row-icon'
	disabled?: boolean
	disabledReason?: ReactNode
	drawerOwnedOverlay?: boolean
	menuAlign?: 'start' | 'center' | 'end'
	stopPropagation?: boolean
	shortcutMode?: MetadataShortcutMode
	value: TaskPlacementTarget
	values?: TaskPlacementTarget[]
	groups: TaskPlacementGroup[]
	onChange: (value: TaskPlacementTarget) => void
}

export function MetadataPlacementDropdown({
	label,
	value,
	values,
	groups,
	menuLabel,
	shortcut,
	ariaLabel,
	buttonIcon,
	buttonLabel,
	compact,
	buttonAppearance = 'default',
	disabled,
	disabledReason,
	drawerOwnedOverlay,
	menuAlign = 'start',
	stopPropagation,
	shortcutMode = 'clear-only',
	onChange,
}: MetadataPlacementDropdownProps) {
	const [menuOpen, setMenuOpen] = useState(false)
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

	if (!currentItem) {
		return null
	}

	const trigger = (
		<MetadataFieldButton
			ariaLabel={ariaLabel ?? label}
			appearance={buttonAppearance}
			compact={compact}
			disabled={disabled}
			icon={buttonIcon ?? getGroupedPlacementIcon(currentItem)}
			label={buttonLabel ?? currentItem.title}
			stopPropagation={stopPropagation}
			suppressOverflowTooltip={menuOpen}
		/>
	)
	const shouldShowTooltip = buttonAppearance === 'row-icon' || shortcut !== undefined
	const triggerLabel = ariaLabel ?? label

	return (
		<Dropdown isOpen={menuOpen} onOpenChange={setMenuOpen}>
			{disabled && disabledReason ? (
				<DisabledActionTooltip
					label={triggerLabel}
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
					label={triggerLabel}
					shortcut={
						shortcut ? (
							<CommandShortcut commandId={shortcut.commandId} scope={shortcut.scope} />
						) : undefined
					}
				>
					{trigger}
				</ActionTooltip>
			) : (
				trigger
			)}
			<Dropdown.Popover
				data-drawer-owned-overlay={drawerOwnedOverlay ? 'true' : undefined}
				offset={6}
				placement={resolveMenuPlacement(menuAlign)}
			>
				<ShortcutDigitSelectLayer
					items={shortcutItems}
					onSelect={(item) => {
						onChange(item.value)
						setMenuOpen(false)
					}}
				/>
				<Dropdown.Menu aria-label={menuLabel ?? label}>
					<Dropdown.Section>
						<Header className='flex items-center gap-2 px-2 py-1.5 text-[12px] font-medium text-muted'>
							<span className='min-w-0 flex-1 truncate'>{menuLabel ?? label}</span>
							{shortcut ? (
								<CommandShortcut commandId={shortcut.commandId} scope={shortcut.scope} />
							) : null}
						</Header>
					</Dropdown.Section>
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
				</Dropdown.Menu>
			</Dropdown.Popover>
		</Dropdown>
	)
}

function resolveMenuPlacement(align: 'start' | 'center' | 'end') {
	return align === 'center' ? 'bottom' : (`bottom ${align}` as const)
}

function getGroupedPlacementIcon(
	itemOrTarget: TaskPlacementTarget | TaskPlacementGroup['items'][number],
) {
	const target = 'target' in itemOrTarget ? itemOrTarget.target : itemOrTarget

	if (target.kind === 'project') {
		return <FolderIcon className='size-3.5' />
	}

	return <TargetIcon className='size-3.5' />
}

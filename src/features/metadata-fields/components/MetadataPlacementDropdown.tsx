import { useState, type ReactNode } from 'react'
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
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from '@/shared/components/base/dropdown-menu'
import { ShortcutDigitSelectLayer } from '@/shared/components/shortcut-menu'
import { ActionTooltip, DisabledActionTooltip } from '@/shared/components/tooltip'

import { MetadataFieldButton } from './MetadataFieldButton'
import type { MetadataCommandShortcut } from './MetadataFieldDropdown'
import { MetadataPlacementGroupList } from './MetadataPlacementGroupList'

export type MetadataPlacementDropdownProps = {
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

export function MetadataPlacementDropdown(props: MetadataPlacementDropdownProps) {
	return <GroupedPlacementDropdown {...props} />
}

function GroupedPlacementDropdown({
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
	const [tooltipOpen, setTooltipOpen] = useState(false)
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
		<DropdownMenuTrigger asChild>
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
		</DropdownMenuTrigger>
	)
	const shouldShowTooltip = buttonAppearance === 'row-icon' || shortcut !== undefined
	const triggerLabel = ariaLabel ?? label

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
					isOpen={tooltipOpen && !menuOpen}
					label={triggerLabel}
					onOpenChange={(open) => setTooltipOpen(open && !menuOpen)}
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
			<DropdownMenuContent
				align={menuAlign}
				data-drawer-owned-overlay={drawerOwnedOverlay ? 'true' : undefined}
				sideOffset={6}
			>
				<ShortcutDigitSelectLayer items={shortcutItems} onSelect={(item) => onChange(item.value)} />
				<DropdownMenuLabel className='px-2 py-1.5 text-[12px] normal-case tracking-normal'>
					<span className='flex items-center gap-2'>
						<span className='min-w-0 flex-1 truncate'>{menuLabel}</span>
						{shortcut ? (
							<CommandShortcut commandId={shortcut.commandId} scope={shortcut.scope} />
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
	const target = 'target' in itemOrTarget ? itemOrTarget.target : itemOrTarget

	if (target.kind === 'project') {
		return <FolderIcon className='size-3.5' />
	}

	return <TargetIcon className='size-3.5' />
}

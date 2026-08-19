import { useState } from 'react'
import { Button, Dropdown } from '@heroui/react'
import { CheckIcon } from 'lucide-react'

import type { LauncherSpaceSummary } from '../../model/types'
import { getSpaceVisual } from '@/features/space'
import { ActionTooltip, OverflowTooltip } from '@/shared/components/tooltip'

type SpaceControlProps = {
	open: boolean
	label: string
	iconOnly?: boolean
	spaces: LauncherSpaceSummary[]
	selectedSpaceId: string | null
	onOpenChange: (open: boolean) => void
	onSelectSpace: (spaceId: string) => void
}

export function SpaceControl({
	open,
	label,
	iconOnly = false,
	spaces,
	selectedSpaceId,
	onOpenChange,
	onSelectSpace,
}: SpaceControlProps) {
	const [tooltipOpen, setTooltipOpen] = useState(false)
	const currentSpace = spaces.find((space) => space.id === selectedSpaceId) ?? null
	const currentVisual = currentSpace ? getSpaceVisual(currentSpace) : null
	const CurrentIcon = currentVisual?.icon
	const trigger = (
		<Button
			aria-label='空间选择'
			className={iconOnly ? undefined : 'max-w-44'}
			isIconOnly={iconOnly}
			size='sm'
			variant='outline'
		>
			{CurrentIcon ? (
				<CurrentIcon
					className={`size-3.5 shrink-0 ${currentVisual?.iconClassName ?? 'text-muted'}`}
				/>
			) : null}
			{iconOnly ? (
				<span className='sr-only'>{label}</span>
			) : open ? (
				<span className='min-w-0 flex-1 truncate'>{label}</span>
			) : (
				<OverflowTooltip className='min-w-0 flex-1' content={label}>
					{label}
				</OverflowTooltip>
			)}
		</Button>
	)

	function handleMenuOpenChange(nextOpen: boolean) {
		onOpenChange(nextOpen)
		if (nextOpen) {
			setTooltipOpen(false)
		}
	}

	return (
		<Dropdown isOpen={open} onOpenChange={handleMenuOpenChange}>
			{iconOnly ? (
				<ActionTooltip
					isOpen={tooltipOpen}
					label='选择空间'
					onOpenChange={(nextOpen) => setTooltipOpen(open ? false : nextOpen)}
				>
					{trigger}
				</ActionTooltip>
			) : (
				trigger
			)}
			<Dropdown.Popover className='w-48' placement='bottom end'>
				<Dropdown.Menu aria-label='选择空间'>
					{spaces.map((space) => {
						const visual = getSpaceVisual(space)
						const SpaceIcon = visual.icon

						return (
							<Dropdown.Item
								className='gap-2 p-2 text-[12.5px]'
								id={space.id}
								key={space.id}
								onAction={() => onSelectSpace(space.id)}
								textValue={space.name}
							>
								<SpaceIcon className={`size-3.5 shrink-0 ${visual.iconClassName}`} />
								<span className='min-w-0 flex-1 truncate'>{space.name}</span>
								{space.id === selectedSpaceId ? (
									<CheckIcon aria-hidden className='ml-auto size-3.5 shrink-0 text-muted' />
								) : null}
							</Dropdown.Item>
						)
					})}
				</Dropdown.Menu>
			</Dropdown.Popover>
		</Dropdown>
	)
}

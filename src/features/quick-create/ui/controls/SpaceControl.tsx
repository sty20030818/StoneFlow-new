import { CheckIcon } from 'lucide-react'

import type { QuickCreateSpaceSummary } from '@/features/quick-create/model/types'
import { getSpaceVisual } from '@/features/space/model/spaceVisuals'
import { Button } from '@/shared/ui/base/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/shared/ui/base/dropdown-menu'
import {
	quickCreateMenuContentClass,
	quickCreateMenuItemClass,
} from '@/shared/ui/patterns/quick-create'

type SpaceControlProps = {
	open: boolean
	label: string
	iconOnly?: boolean
	spaces: QuickCreateSpaceSummary[]
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
	const currentSpace = spaces.find((space) => space.id === selectedSpaceId) ?? null
	const currentVisual = currentSpace ? getSpaceVisual(currentSpace) : null
	const CurrentIcon = currentVisual?.icon

	return (
		<DropdownMenu onOpenChange={onOpenChange} open={open}>
			<DropdownMenuTrigger asChild>
				<Button
					aria-label='空间选择'
					className={iconOnly ? undefined : 'max-w-44'}
					size={iconOnly ? 'icon-sm' : 'sm'}
					variant={iconOnly ? 'outline' : 'outline'}
				>
					{CurrentIcon ? (
						<CurrentIcon
							className={`size-3.5 shrink-0 ${currentVisual?.iconClassName ?? 'text-sf-text-secondary'}`}
						/>
					) : null}
					{iconOnly ? (
						<span className='sr-only'>{label}</span>
					) : (
						<span className='truncate'>{label}</span>
					)}
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align='end' className={`w-48 ${quickCreateMenuContentClass}`}>
				<DropdownMenuGroup>
					{spaces.map((space) => {
						const visual = getSpaceVisual(space)
						const SpaceIcon = visual.icon

						return (
							<DropdownMenuItem
								className={quickCreateMenuItemClass}
								key={space.id}
								onSelect={() => onSelectSpace(space.id)}
							>
								<SpaceIcon className={`size-3.5 shrink-0 ${visual.iconClassName}`} />
								<span className='min-w-0 flex-1 truncate'>{space.name}</span>
								{space.id === selectedSpaceId ? (
									<CheckIcon
										aria-hidden
										className='ml-auto size-3.5 shrink-0 text-sf-icon-secondary'
									/>
								) : null}
							</DropdownMenuItem>
						)
					})}
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}

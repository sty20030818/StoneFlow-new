import { CheckIcon } from 'lucide-react'

import type { LauncherSpaceSummary } from '@/features/launcher/model/types'
import { getSpaceVisual } from '@/features/space'
import { Button } from '@/shared/components/base/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/shared/components/base/dropdown-menu'
import {
	launcherMenuContentClass,
	launcherMenuItemClass,
} from '@/shared/components/patterns/launcher'

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
			<DropdownMenuContent align='end' className={`w-48 ${launcherMenuContentClass}`}>
				<DropdownMenuGroup>
					{spaces.map((space) => {
						const visual = getSpaceVisual(space)
						const SpaceIcon = visual.icon

						return (
							<DropdownMenuItem
								className={launcherMenuItemClass}
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

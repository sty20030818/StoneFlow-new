import { ChevronDownIcon } from 'lucide-react'

import { useLauncher } from '@/features/launcher/domain/LauncherDomainProvider'
import { PlacementControl } from '@/features/launcher/composer/controls/PlacementControl'
import { PriorityControl } from '@/features/launcher/composer/controls/PriorityControl'
import { TitleInput } from '@/features/launcher/composer/TitleInput'
import { SpaceControl } from '@/features/launcher/composer/controls/SpaceControl'
import { Button } from '@/shared/components/base/button'
import { cn } from '@/shared/lib/utils'
import { launcherToolbarRowClass } from '@/shared/components/patterns/launcher'

export function PrimaryMetaBar() {
	const { actions, derived, state } = useLauncher()

	return (
		<div className={launcherToolbarRowClass} data-testid='launcher-primary-meta-bar'>
			<PriorityControl
				disabled={state.submitState === 'submitting'}
				onOpenChange={(open) => actions.setPopover(open ? 'priority' : null)}
				onPriorityChange={actions.setPriority}
				open={state.activePopover === 'priority'}
				priority={state.draft.priority}
			/>

			<TitleInput />

			<PlacementControl
				disabled={state.submitState === 'submitting'}
				label={derived.placementLabel}
				onOpenChange={(open) => actions.setPopover(open ? 'project' : null)}
				onPlacementChange={actions.selectPlacement}
				open={state.activePopover === 'project'}
				options={derived.projectOptions}
				value={state.draft.placement}
			/>

			<SpaceControl
				iconOnly
				label={derived.spaceName}
				onOpenChange={(open) => actions.setPopover(open ? 'space' : null)}
				onSelectSpace={actions.selectSpace}
				open={state.activePopover === 'space'}
				selectedSpaceId={state.draft.spaceId}
				spaces={state.initialState?.spaces ?? []}
			/>

			<Button
				aria-label='更多参数'
				className={cn(
					state.isAdvancedOpen ? 'border-primary text-primary' : 'text-sf-text-quaternary',
				)}
				onClick={actions.toggleAdvanced}
				size='icon-sm'
				variant='outline'
			>
				<ChevronDownIcon
					className={cn('size-4 transition-transform', state.isAdvancedOpen ? 'rotate-180' : '')}
				/>
			</Button>
		</div>
	)
}

import { useState } from 'react'
import { ChevronDownIcon } from 'lucide-react'

import { useLauncher } from '../domain/LauncherDomainProvider'
import { PlacementControl } from './controls/PlacementControl'
import { PriorityControl } from './controls/PriorityControl'
import { TitleInput } from './TitleInput'
import { SpaceControl } from './controls/SpaceControl'
import { Button } from '@/shared/components/base/button'
import { cn } from '@/shared/lib/utils'
import { launcherToolbarRowClass } from '@/shared/components/patterns/launcher'
import { ActionTooltip } from '@/shared/components/tooltip'

export function PrimaryMetaBar() {
	const { actions, derived, state } = useLauncher()
	const [advancedTooltipOpen, setAdvancedTooltipOpen] = useState(false)
	const advancedActionLabel = state.isAdvancedOpen ? '收起更多参数' : '展开更多参数'

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
				spaces={state.openContext?.spaces ?? []}
			/>

			<ActionTooltip onOpenChange={setAdvancedTooltipOpen} open={advancedTooltipOpen}>
				<ActionTooltip.Trigger asChild>
					<Button
						aria-expanded={state.isAdvancedOpen}
						aria-label='更多参数'
						className={cn(
							state.isAdvancedOpen ? 'border-primary text-primary' : 'text-sf-text-quaternary',
						)}
						onClick={() => {
							setAdvancedTooltipOpen(false)
							actions.toggleAdvanced()
						}}
						size='icon-sm'
						variant='outline'
					>
						<ChevronDownIcon
							className={cn(
								'size-4 transition-transform',
								state.isAdvancedOpen ? 'rotate-180' : '',
							)}
						/>
					</Button>
				</ActionTooltip.Trigger>
				<ActionTooltip.Content>
					<ActionTooltip.Row label={advancedActionLabel} />
				</ActionTooltip.Content>
			</ActionTooltip>
		</div>
	)
}

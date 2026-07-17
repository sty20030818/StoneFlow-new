import { ChevronDownIcon } from 'lucide-react'

import { useQuickCreate } from '@/features/quick-create/domain/QuickCreateDomainProvider'
import { PlacementControl } from '@/features/quick-create/ui/controls/PlacementControl'
import { PriorityControl } from '@/features/quick-create/ui/controls/PriorityControl'
import { QuickCreateTitleInput } from '@/features/quick-create/ui/QuickCreateTitleInput'
import { SpaceControl } from '@/features/quick-create/ui/controls/SpaceControl'
import { Button } from '@/shared/components/base/button'
import { cn } from '@/shared/lib/utils'
import { quickCreateToolbarRowClass } from '@/shared/components/patterns/quick-create'

export function QuickCreatePrimaryMetaBar() {
	const { actions, derived, state } = useQuickCreate()

	return (
		<div className={quickCreateToolbarRowClass} data-testid='quick-create-primary-meta-bar'>
			<PriorityControl
				disabled={state.submitState === 'submitting'}
				onOpenChange={(open) => actions.setPopover(open ? 'priority' : null)}
				onPriorityChange={actions.setPriority}
				open={state.activePopover === 'priority'}
				priority={state.draft.priority}
			/>

			<QuickCreateTitleInput />

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

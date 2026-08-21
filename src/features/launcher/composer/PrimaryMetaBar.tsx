import { Button } from '@heroui/react'
import { ChevronDownIcon, ChevronUpIcon } from 'lucide-react'

import { useLauncher } from '../domain/LauncherDomainProvider'
import { PlacementControl } from './controls/PlacementControl'
import { PriorityControl } from './controls/PriorityControl'
import { TitleInput } from './TitleInput'
import { SpaceControl } from './controls/SpaceControl'
import { ActionTooltip } from '@/shared/components/tooltip'

export function PrimaryMetaBar() {
	const { actions, derived, state } = useLauncher()
	const advancedActionLabel = state.isAdvancedOpen ? '收起更多参数' : '展开更多参数'

	return (
		<div className='flex h-12 items-center gap-2 px-3' data-testid='launcher-primary-meta-bar'>
			<TitleInput />

			<PriorityControl
				disabled={state.submitState === 'submitting'}
				onOpenChange={(open) => actions.setPopover(open ? 'priority' : null)}
				onPriorityChange={actions.setPriority}
				open={state.activePopover === 'priority'}
				priority={state.draft.priority}
			/>
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

			<ActionTooltip label={advancedActionLabel}>
				<Button
					aria-expanded={state.isAdvancedOpen}
					aria-label='更多参数'
					isIconOnly
					onPress={actions.toggleAdvanced}
					size='sm'
					variant='outline'
				>
					{state.isAdvancedOpen ? (
						<ChevronUpIcon className='size-4' />
					) : (
						<ChevronDownIcon className='size-4' />
					)}
				</Button>
			</ActionTooltip>
		</div>
	)
}

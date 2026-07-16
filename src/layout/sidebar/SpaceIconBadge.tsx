import type { SpaceVisualDefinition } from '@/features/space'
import { cn } from '@/shared/lib/utils'

type SpaceIconBadgeProps = {
	visual: SpaceVisualDefinition
}

export function SpaceIconBadge({ visual }: SpaceIconBadgeProps) {
	const SpaceIcon = visual.icon

	return (
		<span
			className={cn(
				'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white shadow-(--sf-shadow-panel)',
				visual.iconBadgeClassName,
			)}
			data-sidebar-keep='true'
			data-space-icon-badge='true'
		>
			<SpaceIcon className='size-4 text-white' />
		</span>
	)
}

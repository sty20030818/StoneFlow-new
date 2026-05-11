import { FolderIcon } from 'lucide-react'

import { BoardCollapsibleSection } from '@/shared/ui/board'
import { entityBoardMutedIconClass } from '@/shared/ui/patterns/entity-board'

import type { QuickCreateProjectItem } from '@/features/quick-create/model/types'
import { QuickCreateProjectResultRowAdapter } from '@/features/quick-create/ui/adapters/QuickCreateProjectResultRowAdapter'

type QuickCreateProjectResultsSectionProps = {
	title: string
	items: QuickCreateProjectItem[]
	baseIndex: number
	activeIndex: number
	open: boolean
	onOpen: (item: QuickCreateProjectItem) => void
	onOpenChange: (open: boolean) => void
	onHover: (index: number) => void
	testId: string
}

export function QuickCreateProjectResultsSection({
	title,
	items,
	baseIndex,
	activeIndex,
	open,
	onOpen,
	onOpenChange,
	onHover,
	testId,
}: QuickCreateProjectResultsSectionProps) {
	if (items.length === 0) {
		return null
	}

	return (
		<BoardCollapsibleSection
			count={items.length}
			getItemId={(_child, index) => items[index]?.id}
			icon={
				<span className={entityBoardMutedIconClass}>
					<FolderIcon className='size-3.5' />
				</span>
			}
			label={title}
			onOpenChange={onOpenChange}
			open={open}
		>
			<div data-testid={testId}>
				{items.map((item, index) => {
					const absoluteIndex = baseIndex + index
					return (
						<QuickCreateProjectResultRowAdapter
							index={absoluteIndex}
							isActive={activeIndex === absoluteIndex}
							item={item}
							key={item.id}
							onHover={onHover}
							onOpen={onOpen}
						/>
					)
				})}
			</div>
		</BoardCollapsibleSection>
	)
}

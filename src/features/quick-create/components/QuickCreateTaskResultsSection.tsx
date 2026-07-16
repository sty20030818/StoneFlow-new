import { ListTodoIcon } from 'lucide-react'

import { BoardCollapsibleSection } from '@/shared/components/board'
import { entityBoardMutedIconClass } from '@/shared/components/patterns/entity-board'
import { quickCreateBoardCollapsibleClass } from '@/shared/components/patterns/quick-create'

import type { QuickCreateTaskItem } from '@/features/quick-create/model/types'
import { QuickCreateTaskResultRowAdapter } from '@/features/quick-create/components/adapters/QuickCreateTaskResultRowAdapter'

type QuickCreateTaskResultsSectionProps = {
	title: string
	items: QuickCreateTaskItem[]
	baseIndex?: number
	activeIndex: number
	open: boolean
	onOpen: (item: QuickCreateTaskItem) => void
	onOpenChange: (open: boolean) => void
	onHover: (index: number) => void
	testId: string
}

export function QuickCreateTaskResultsSection({
	title,
	items,
	baseIndex = 0,
	activeIndex,
	open,
	onOpen,
	onOpenChange,
	onHover,
	testId,
}: QuickCreateTaskResultsSectionProps) {
	if (items.length === 0) {
		return null
	}

	return (
		<BoardCollapsibleSection
			className={quickCreateBoardCollapsibleClass}
			count={items.length}
			getItemId={(_child, index) => items[index]?.id}
			icon={
				<span className={entityBoardMutedIconClass}>
					<ListTodoIcon className='size-3.5' />
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
						<QuickCreateTaskResultRowAdapter
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

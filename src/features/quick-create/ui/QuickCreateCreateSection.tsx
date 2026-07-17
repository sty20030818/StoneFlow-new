import { BoardGroup, BoardRows } from '@/shared/components/board'

import { QuickCreateCreateRowAdapter } from '@/features/quick-create/ui/adapters/QuickCreateCreateRowAdapter'
import { quickCreateBoardGroupClass } from '@/shared/components/patterns/quick-create'

export function QuickCreateCreateSection() {
	return (
		<BoardGroup className={quickCreateBoardGroupClass} data-testid='quick-create-create-section'>
			<BoardRows>
				<QuickCreateCreateRowAdapter />
			</BoardRows>
		</BoardGroup>
	)
}

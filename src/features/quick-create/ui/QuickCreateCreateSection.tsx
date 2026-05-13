import { BoardGroup, BoardRows } from '@/shared/ui/board'

import { QuickCreateCreateRowAdapter } from '@/features/quick-create/ui/adapters/QuickCreateCreateRowAdapter'
import { quickCreateBoardGroupClass } from '@/shared/ui/patterns/quick-create'

export function QuickCreateCreateSection() {
	return (
		<BoardGroup className={quickCreateBoardGroupClass} data-testid='quick-create-create-section'>
			<BoardRows>
				<QuickCreateCreateRowAdapter />
			</BoardRows>
		</BoardGroup>
	)
}

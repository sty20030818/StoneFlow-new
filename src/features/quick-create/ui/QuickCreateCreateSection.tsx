import { BoardGroup, BoardRows } from '@/shared/ui/board'

import { QuickCreateCreateRowAdapter } from '@/features/quick-create/ui/adapters/QuickCreateCreateRowAdapter'

export function QuickCreateCreateSection() {
	return (
		<BoardGroup data-testid='quick-create-create-section'>
			<BoardRows>
				<QuickCreateCreateRowAdapter />
			</BoardRows>
		</BoardGroup>
	)
}

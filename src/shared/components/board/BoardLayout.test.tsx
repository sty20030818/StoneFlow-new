import { render, screen } from '@testing-library/react'

import {
	BoardRowSlot,
	BoardSectionHeader,
	COLLECTION_ITEM_GAP,
	COLLECTION_ROW_HEIGHT,
	getBoardRowSelectionPosition,
} from '@/shared/components/board'

describe('BoardLayout', () => {
	it('从同组相邻项推导连续选择位置', () => {
		const selectedKeys = new Set(['a', 'b', 'c', 'solo'])

		expect(getBoardRowSelectionPosition('a', undefined, 'b', selectedKeys)).toBe('first')
		expect(getBoardRowSelectionPosition('b', 'a', 'c', selectedKeys)).toBe('middle')
		expect(getBoardRowSelectionPosition('c', 'b', undefined, selectedKeys)).toBe('last')
		expect(getBoardRowSelectionPosition('solo', undefined, undefined, selectedKeys)).toBe('single')
		expect(getBoardRowSelectionPosition('rest', 'c', undefined, selectedKeys)).toBeUndefined()
	})

	it('通过公共 hook 暴露 Row slot 与 Section header 合同', () => {
		const { container } = render(
			<>
				<BoardSectionHeader count={2} label='进行中' selectedCount={1} />
				<BoardRowSlot selectionPosition='first'>任务 A</BoardRowSlot>
			</>,
		)

		expect(container.querySelector('[data-board-section-header="true"]')).toHaveTextContent(
			'进行中',
		)
		expect(screen.getByText('已选 1')).toBeInTheDocument()
		const rowSlot = container.querySelector<HTMLElement>('[data-board-row-slot="true"]')
		expect(rowSlot).toHaveAttribute('data-selection-group-position', 'first')
		expect(rowSlot).toHaveStyle({ height: `${COLLECTION_ROW_HEIGHT}px` })
		expect(rowSlot?.firstElementChild).toHaveStyle({
			height: `${COLLECTION_ROW_HEIGHT + COLLECTION_ITEM_GAP}px`,
		})
	})
})

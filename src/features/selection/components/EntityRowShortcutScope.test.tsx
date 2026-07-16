import { act, fireEvent, render, screen } from '@testing-library/react'

import { useEntitySelection } from '@/features/selection/model'

import { EntityRowShortcutScope } from './EntityRowShortcutScope'

describe('EntityRowShortcutScope', () => {
	it('Cmd+A 全选后不制造键盘 hover 行', () => {
		render(<EntitySelectionHarness />)

		fireEvent.mouseEnter(screen.getByTestId('row-b'))
		expect(screen.getByTestId('hovered-id')).toHaveTextContent('b')

		fireKey('a', { metaKey: true })

		expect(screen.getByTestId('selected-ids')).toHaveTextContent('a,b,c')
		expect(screen.getByTestId('focused-id')).toHaveTextContent('none')
		expect(screen.getByTestId('hovered-id')).toHaveTextContent('none')
		expect(screen.getByTestId('hover-source')).toHaveTextContent('none')
	})
})

function EntitySelectionHarness() {
	const ids = ['a', 'b', 'c']
	const selection = useEntitySelection(ids)

	return (
		<EntityRowShortcutScope
			focusedId={selection.focusedId}
			ids={ids}
			onMoveFocus={selection.moveFocus}
			onSelectAll={selection.selectIds}
			onSetFocusedId={selection.setFocusedId}
			onToggleSelection={selection.toggleSelection}
			selectedIdSet={selection.selectedIdSet}
		>
			{(state) => (
				<div>
					<div data-testid='selected-ids'>{selection.selectedIds.join(',')}</div>
					<div data-testid='focused-id'>{selection.focusedId ?? 'none'}</div>
					<div data-testid='hovered-id'>{state.hoveredId ?? 'none'}</div>
					<div data-testid='hover-source'>{state.hoverSource ?? 'none'}</div>
					{ids.map((id) => (
						<div data-testid={`row-${id}`} key={id} onMouseEnter={() => state.onRowHover(id)} />
					))}
				</div>
			)}
		</EntityRowShortcutScope>
	)
}

function fireKey(
	key: string,
	options: Pick<KeyboardEventInit, 'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey'> = {},
) {
	const event = new KeyboardEvent('keydown', {
		key,
		bubbles: true,
		cancelable: true,
		metaKey: options.metaKey,
		ctrlKey: options.ctrlKey,
		altKey: options.altKey,
		shiftKey: options.shiftKey,
	})

	Object.defineProperty(event, 'target', {
		configurable: true,
		value: document.body,
	})

	act(() => {
		window.dispatchEvent(event)
	})
}

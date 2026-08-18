import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'

import {
	COMMAND_IDS,
	CommandShortcutLayer,
	DEFAULT_KEYBINDINGS,
	KeybindingRegistry,
	ShortcutRegistryProvider,
	type CommandId,
} from '@/features/command'
import { useEntitySelection } from '@/features/selection/model'
import { SELECTION_SHORTCUT_BINDINGS } from '@/features/selection/shortcuts'

import { EntityRowShortcutScope } from './EntityRowShortcutScope'

const TEST_SHORTCUT_REGISTRY = new KeybindingRegistry([
	...DEFAULT_KEYBINDINGS,
	...SELECTION_SHORTCUT_BINDINGS,
])

describe('EntityRowShortcutScope', () => {
	it('Mod+A 全选后不制造键盘 hover 行', () => {
		renderSelectionHarness()

		fireEvent.mouseEnter(screen.getByTestId('row-b'))
		expect(screen.getByTestId('hovered-id')).toHaveTextContent('b')

		fireKey('a', { ctrlKey: true })

		expect(screen.getByTestId('selected-ids')).toHaveTextContent('a,b,c')
		expect(screen.getByTestId('focused-id')).toHaveTextContent('none')
		expect(screen.getByTestId('hovered-id')).toHaveTextContent('none')
		expect(screen.getByTestId('hover-source')).toHaveTextContent('none')
	})

	it('有选择时 Escape 仍交给 global close 统一裁决', async () => {
		const onGlobalTrigger = vi.fn<(id: CommandId) => void>()
		renderSelectionHarness(onGlobalTrigger)
		fireKey('a', { ctrlKey: true })

		const event = fireKey('Escape')

		expect(event.defaultPrevented).toBe(true)
		expect(screen.getByTestId('selected-ids')).toHaveTextContent('a,b,c')
		await waitFor(() => expect(onGlobalTrigger).toHaveBeenCalledWith(COMMAND_IDS.close))
	})

	it('无选择时 list 不消费 Escape，事件下沉给 global close', async () => {
		const onGlobalTrigger = vi.fn<(id: CommandId) => void>()
		renderSelectionHarness(onGlobalTrigger)

		const event = fireKey('Escape')

		expect(event.defaultPrevented).toBe(true)
		await waitFor(() => expect(onGlobalTrigger).toHaveBeenCalledWith(COMMAND_IDS.close))
	})

	it('HeroUI Command 打开时不让旧列表快捷键穿透', () => {
		renderSelectionHarness(() => undefined, true)

		const event = fireKey('a', { ctrlKey: true })

		expect(event.defaultPrevented).toBe(false)
		expect(screen.getByTestId('selected-ids')).toBeEmptyDOMElement()
	})
})

function renderSelectionHarness(
	onGlobalTrigger: (id: CommandId) => void = () => undefined,
	commandOpen = false,
) {
	return render(
		<ShortcutRegistryProvider registry={TEST_SHORTCUT_REGISTRY}>
			<CommandShortcutLayer onTrigger={onGlobalTrigger} />
			{commandOpen ? <div data-slot='command-backdrop' /> : null}
			<EntitySelectionHarness />
		</ShortcutRegistryProvider>,
	)
}

function EntitySelectionHarness() {
	const ids = ['a', 'b', 'c']
	const selection = useEntitySelection(ids)

	return (
		<EntityRowShortcutScope
			focusedId={selection.focusedId}
			ids={ids}
			onClearSelection={selection.clearSelection}
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

	return event
}

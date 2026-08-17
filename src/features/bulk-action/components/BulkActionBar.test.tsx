import { fireEvent, render, screen } from '@testing-library/react'

import { KeybindingRegistry, ShortcutRegistryProvider } from '@/features/command'
import { SELECTION_SHORTCUT_BINDINGS } from '@/features/selection'

import { BulkActionBar } from './BulkActionBar'

const TEST_SHORTCUT_REGISTRY = new KeybindingRegistry(SELECTION_SHORTCUT_BINDINGS)

describe('BulkActionBar', () => {
	it('selectedCount 小于 1 时不渲染', () => {
		const { container } = renderBulkActionBar(
			<BulkActionBar
				action={<button type='button'>操作</button>}
				onClear={() => undefined}
				selectedCount={0}
			/>,
		)

		expect(container).toBeEmptyDOMElement()
	})

	it('显示选中数量并渲染 action slot', () => {
		renderBulkActionBar(
			<BulkActionBar
				action={<button type='button'>操作</button>}
				onClear={() => undefined}
				selectedCount={3}
			/>,
		)

		expect(screen.getByRole('toolbar', { name: '批量操作' })).toBeInTheDocument()
		expect(screen.getByText('已选 3 项')).toBeInTheDocument()
		expect(screen.getByRole('button', { name: '操作' })).toBeInTheDocument()
	})

	it('点击清空按钮调用 onClear', () => {
		const onClear = vi.fn<() => void>()
		renderBulkActionBar(
			<BulkActionBar
				action={<button type='button'>操作</button>}
				onClear={onClear}
				selectedCount={1}
			/>,
		)

		fireEvent.click(screen.getByRole('button', { name: '清空已选' }))

		expect(onClear).toHaveBeenCalledTimes(1)
	})

	it('清空提示从 list Registry 展示 Escape', async () => {
		renderBulkActionBar(
			<BulkActionBar
				action={<button type='button'>操作</button>}
				onClear={() => undefined}
				selectedCount={1}
			/>,
		)

		fireEvent.keyDown(document, { key: 'Tab' })
		screen.getByRole('button', { name: '清空已选' }).focus()

		expect(await screen.findByRole('tooltip')).toHaveTextContent('清空已选Esc')
		expect(screen.getByLabelText('按 Escape')).toBeInTheDocument()
	})
})

function renderBulkActionBar(ui: React.ReactNode) {
	return render(
		<ShortcutRegistryProvider registry={TEST_SHORTCUT_REGISTRY}>{ui}</ShortcutRegistryProvider>,
	)
}

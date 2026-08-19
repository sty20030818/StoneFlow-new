import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { Dropdown } from '@heroui/react'

import { FilterValueOption } from './FilterValueOption'

describe('filter value options', () => {
	it('勾选值后保持菜单打开', () => {
		const onToggle = vi.fn()
		render(
			<Dropdown defaultOpen>
				<Dropdown.Trigger>筛选</Dropdown.Trigger>
				<Dropdown.Popover>
					<Dropdown.Menu aria-label='筛选值' selectionMode='multiple'>
						<FilterValueOption label='高' onToggle={onToggle} value='high' />
					</Dropdown.Menu>
				</Dropdown.Popover>
			</Dropdown>,
		)

		const option = screen.getByRole('menuitemcheckbox', { name: '高' })
		fireEvent.click(option)

		expect(onToggle).toHaveBeenCalledTimes(1)
		expect(screen.getByRole('menuitemcheckbox', { name: '高' })).toBeInTheDocument()
	})

	it('HeroUI 菜单保留 typeahead', async () => {
		render(
			<Dropdown defaultOpen>
				<Dropdown.Trigger>筛选</Dropdown.Trigger>
				<Dropdown.Popover>
					<Dropdown.Menu aria-label='筛选值'>
						<Dropdown.Item id='alpha' textValue='Alpha'>
							Alpha
						</Dropdown.Item>
						<Dropdown.Item id='beta' textValue='Beta'>
							Beta
						</Dropdown.Item>
					</Dropdown.Menu>
				</Dropdown.Popover>
			</Dropdown>,
		)

		fireEvent.keyDown(screen.getByRole('menu'), { key: 'b' })

		await waitFor(() => expect(screen.getByRole('menuitem', { name: 'Beta' })).toHaveFocus())
	})
})

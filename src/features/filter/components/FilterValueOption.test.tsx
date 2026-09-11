import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'

import { Dropdown } from '@heroui/react'

import { FilterValueOption } from './FilterValueOption'

describe('filter value options', () => {
	it('受控勾选和取消各触发一次回调，禁用项不响应且菜单保持打开', () => {
		const onToggle = vi.fn()
		const onDisabledToggle = vi.fn()
		const onClose = vi.fn()
		function Fixture() {
			const [selected, setSelected] = useState(false)
			return (
				<Dropdown defaultOpen>
					<Dropdown.Trigger>筛选</Dropdown.Trigger>
					<Dropdown.Popover>
						<Dropdown.Menu
							aria-label='筛选值'
							selectedKeys={selected ? ['high'] : []}
							selectionMode='multiple'
						>
							<FilterValueOption
								label='高'
								onClose={onClose}
								onToggle={() => {
									onToggle()
									setSelected((value) => !value)
								}}
								value='high'
							/>
							<FilterValueOption
								disabled
								label='低'
								onClose={onClose}
								onToggle={onDisabledToggle}
								value='low'
							/>
						</Dropdown.Menu>
					</Dropdown.Popover>
				</Dropdown>
			)
		}
		render(<Fixture />)

		const option = screen.getByRole('menuitemcheckbox', { name: '高' })
		expect(option).toHaveAttribute('aria-checked', 'false')
		expect(
			option.querySelector('input, button, [role="checkbox"], [tabindex]:not([tabindex="-1"])'),
		).toBeNull()
		const checkbox = option.querySelector<HTMLElement>('[data-slot="checkbox"]')!
		expect(checkbox).not.toHaveAttribute('data-selected')
		fireEvent.pointerDown(checkbox)
		fireEvent.click(checkbox)
		expect(onToggle).toHaveBeenCalledTimes(1)
		expect(option).toHaveAttribute('aria-checked', 'true')
		expect(checkbox).toHaveAttribute('data-selected', 'true')
		expect(screen.getByRole('menu')).toBeInTheDocument()

		fireEvent.pointerDown(checkbox)
		fireEvent.click(checkbox)
		expect(onToggle).toHaveBeenCalledTimes(2)
		expect(option).toHaveAttribute('aria-checked', 'false')
		expect(checkbox).not.toHaveAttribute('data-selected')

		const disabledOption = screen.getByRole('menuitemcheckbox', { name: '低' })
		expect(disabledOption).toHaveAttribute('aria-disabled', 'true')
		fireEvent.click(disabledOption)
		expect(onDisabledToggle).not.toHaveBeenCalled()
		expect(disabledOption).toHaveAttribute('aria-checked', 'false')
		expect(screen.getByRole('menu')).toBeInTheDocument()
		expect(onClose).not.toHaveBeenCalled()

		fireEvent.pointerDown(checkbox)
		fireEvent.pointerCancel(checkbox)
		fireEvent.click(option)
		expect(onToggle).toHaveBeenCalledTimes(3)
		expect(onClose).toHaveBeenCalledOnce()
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

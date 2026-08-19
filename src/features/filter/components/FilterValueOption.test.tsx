import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/shared/components/base/dropdown-menu'

import { FilterValueOption } from './FilterValueOption'

describe('filter value options', () => {
	it('勾选值后保持菜单打开', () => {
		const onToggle = vi.fn()
		render(
			<DropdownMenu defaultOpen>
				<DropdownMenuTrigger>筛选</DropdownMenuTrigger>
				<DropdownMenuContent>
					<FilterValueOption checked={false} label='高' onToggle={onToggle} />
				</DropdownMenuContent>
			</DropdownMenu>,
		)

		const option = screen.getByRole('menuitemcheckbox', { name: '高' })
		fireEvent.click(option)

		expect(onToggle).toHaveBeenCalledTimes(1)
		expect(screen.getByRole('menuitemcheckbox', { name: '高' })).toBeInTheDocument()
	})

	it('菜单内容阻断全局冒泡时仍保留 Radix typeahead', async () => {
		render(
			<DropdownMenu defaultOpen>
				<DropdownMenuTrigger>筛选</DropdownMenuTrigger>
				<DropdownMenuContent>
					<DropdownMenuItem>Alpha</DropdownMenuItem>
					<DropdownMenuItem>Beta</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>,
		)

		fireEvent.keyDown(screen.getByRole('menu'), { key: 'b' })

		await waitFor(() => expect(screen.getByRole('menuitem', { name: 'Beta' })).toHaveFocus())
	})
})

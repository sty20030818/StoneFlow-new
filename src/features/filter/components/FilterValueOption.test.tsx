import { fireEvent, render, screen } from '@testing-library/react'

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from '@/shared/components/base/dropdown-menu'
import { TooltipProvider } from '@/shared/components/base/tooltip'

import { getFilterValueOptions } from './filterOptionCatalog'
import { FilterValueOption } from './FilterValueOption'

describe('filter value options', () => {
	it('优先级目录复用 task 顺序、文案与图标', () => {
		const options = getFilterValueOptions('priority')

		expect(options.map(({ value, label }) => [value, label])).toEqual([
			['0', '无优先级'],
			['4', '紧急'],
			['3', '高'],
			['2', '中'],
			['1', '低'],
		])
		expect(options.every((option) => option.leading != null)).toBe(true)
	})

	it('勾选值后保持菜单打开', () => {
		const onToggle = vi.fn()
		render(
			<TooltipProvider>
				<DropdownMenu defaultOpen>
					<DropdownMenuTrigger>筛选</DropdownMenuTrigger>
					<DropdownMenuContent>
						<FilterValueOption checked={false} label='高' onToggle={onToggle} />
					</DropdownMenuContent>
				</DropdownMenu>
			</TooltipProvider>,
		)

		const option = screen.getByRole('menuitemcheckbox', { name: '高' })
		expect(option.querySelector('[data-slot="selection-indicator"]')).toBeInTheDocument()
		expect(option.querySelector('[data-slot="overflow-tooltip-trigger"]')).toBeInTheDocument()
		fireEvent.click(option)

		expect(onToggle).toHaveBeenCalledTimes(1)
		expect(screen.getByRole('menuitemcheckbox', { name: '高' })).toBeInTheDocument()
	})
})

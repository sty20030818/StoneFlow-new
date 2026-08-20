import type { ReactNode } from 'react'

import { Dropdown } from '@heroui/react'

import { OverflowTooltip } from '@/shared/components/tooltip'

type FilterValueOptionProps = {
	value: string
	label: string
	leading?: ReactNode
	count?: number
	disabled?: boolean
	onToggle: () => void
}

/** 单个筛选值行；只负责菜单语义与四槽布局，不持有筛选状态。 */
export function FilterValueOption({
	value,
	label,
	leading,
	count,
	disabled,
	onToggle,
}: FilterValueOptionProps) {
	return (
		<Dropdown.Item
			id={value}
			isDisabled={disabled}
			onAction={onToggle}
			shouldCloseOnSelect={false}
			textValue={label}
		>
			<Dropdown.ItemIndicator />
			{leading ? (
				<span className='flex size-4 shrink-0 items-center justify-center' aria-hidden>
					{leading}
				</span>
			) : null}
			<OverflowTooltip className='min-w-0 flex-1' content={label}>
				{label}
			</OverflowTooltip>
			{count == null ? null : (
				<span className='shrink-0 text-[12px] tabular-nums text-muted'>{count}</span>
			)}
		</Dropdown.Item>
	)
}

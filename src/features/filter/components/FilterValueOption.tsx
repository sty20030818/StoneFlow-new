import type { ReactNode } from 'react'

import { DropdownMenuItem } from '@/shared/components/base/dropdown-menu'
import { SelectionIndicator } from '@/shared/components/base/selection-indicator'

type FilterValueOptionProps = {
	checked: boolean
	label: string
	leading?: ReactNode
	count?: number
	disabled?: boolean
	onToggle: () => void
}

/** 单个筛选值行；只负责菜单语义与四槽布局，不持有筛选状态。 */
export function FilterValueOption({
	checked,
	label,
	leading,
	count,
	disabled,
	onToggle,
}: FilterValueOptionProps) {
	return (
		<DropdownMenuItem
			aria-checked={checked}
			className='group/selection-indicator h-8 gap-2 px-1.5 py-0 text-[13px]'
			disabled={disabled}
			onSelect={(event) => {
				event.preventDefault()
				onToggle()
			}}
			role='menuitemcheckbox'
		>
			<SelectionIndicator checked={checked} disabled={disabled} />
			{leading ? (
				<span className='flex size-4 shrink-0 items-center justify-center' aria-hidden>
					{leading}
				</span>
			) : null}
			<span className='min-w-0 flex-1 truncate'>{label}</span>
			{count == null ? null : (
				<span className='shrink-0 text-[12px] tabular-nums text-sf-text-tertiary'>{count}</span>
			)}
		</DropdownMenuItem>
	)
}

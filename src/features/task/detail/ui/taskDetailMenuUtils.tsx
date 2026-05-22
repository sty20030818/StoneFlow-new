import type { ReactNode } from 'react'

import { CheckIcon, MinusIcon } from 'lucide-react'

import { cn } from '@/shared/lib/utils'
import { ShortcutMenuItemHint } from '@/shared/ui/shortcut-menu'

export type DetailMenuOptionIndicator = 'checked' | 'mixed' | null

export function getDetailMenuOptionIndicator<T>(
	values: Set<T>,
	value: T,
): DetailMenuOptionIndicator {
	if (!values.has(value)) {
		return null
	}

	return values.size === 1 ? 'checked' : 'mixed'
}

export function DetailMenuOptionIndicatorIcon({
	indicator,
}: {
	indicator: DetailMenuOptionIndicator
}) {
	if (indicator === 'checked') {
		return <CheckIcon className='size-3.5 text-foreground' />
	}

	if (indicator === 'mixed') {
		return <MinusIcon className='size-3.5 text-foreground' />
	}

	return <CheckIcon className='invisible size-3.5' />
}

export function DetailMenuOptionRow({
	icon,
	label,
	indicator,
	digit,
	trailing,
}: {
	icon: ReactNode
	label: ReactNode
	indicator: DetailMenuOptionIndicator
	digit?: string
	trailing?: ReactNode
}) {
	const hasTrailing = !digit && trailing !== undefined && trailing !== null

	return (
		<>
			{icon}
			<span className='min-w-0 flex-1 truncate'>{label}</span>
			<span
				className={cn(
					'ml-auto shrink-0 items-center text-[11px] text-muted-foreground',
					hasTrailing
						? 'grid grid-cols-[0.875rem_1.25rem_auto] gap-x-2'
						: 'grid grid-cols-[0.875rem_1.25rem] gap-x-2',
				)}
			>
				<span className='flex items-center justify-center'>
					<DetailMenuOptionIndicatorIcon indicator={indicator} />
				</span>
				<span className='flex items-center justify-center'>
					{digit ? <ShortcutMenuItemHint digit={digit} /> : null}
				</span>
				{hasTrailing ? <span className='min-w-0 text-right tabular-nums'>{trailing}</span> : null}
			</span>
		</>
	)
}

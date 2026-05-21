import type { ReactNode } from 'react'

import { CheckIcon, MinusIcon } from 'lucide-react'

import { ShortcutMenuItemHint } from '@/shared/ui/shortcut-menu'

export type DetailMenuOptionIndicator = 'checked' | 'mixed' | null

export function getDetailMenuOptionIndicator<T>(values: Set<T>, value: T): DetailMenuOptionIndicator {
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
	return (
		<>
			{icon}
			<span className='min-w-0 flex-1 truncate'>{label}</span>
			<span className='ml-auto flex min-w-12 items-center justify-end gap-2 text-[11px] text-muted-foreground'>
				<DetailMenuOptionIndicatorIcon indicator={indicator} />
				{digit ? <ShortcutMenuItemHint digit={digit} /> : null}
				{!digit && trailing ? <span className='tabular-nums'>{trailing}</span> : null}
			</span>
		</>
	)
}

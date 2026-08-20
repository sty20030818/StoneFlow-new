import { cn } from '@/shared/lib/utils'
import { formatShortDate } from '@/shared/lib/date'

export type CreatedAtCellProps = {
	value: string | null | undefined
	formatter?: (value: string) => string
	className?: string
}

export function CreatedAtCell({
	value,
	formatter = formatShortDate,
	className,
}: CreatedAtCellProps) {
	if (!value) {
		return null
	}

	return (
		<span className={cn('shrink-0 text-xs tabular-nums text-muted', className)}>
			{formatter(value)}
		</span>
	)
}

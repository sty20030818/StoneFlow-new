import { cn } from '@/shared/lib/utils'

/** 空态轻标题：无灰底、不可折叠、不 sticky。 */
export function SectionLabel({
	title,
	count,
	className,
}: {
	title: string
	count: number
	className?: string
}) {
	return (
		<div
			className={cn(
				'flex items-center gap-1.5 px-2 pt-2 pb-1 text-xs font-medium text-muted',
				className,
			)}
		>
			<span>{title}</span>
			<span aria-label={`${count} 项`} className='tabular-nums'>
				{count}
			</span>
		</div>
	)
}

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
				'flex items-center gap-2 px-2.5 pt-2.5 pb-1 text-[10.5px] font-semibold tracking-[0.06em] text-muted uppercase',
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

import { cn } from '@/shared/lib/utils'
import {
	launcherSectionCountClass,
	launcherSectionLabelClass,
} from '@/shared/components/patterns/launcher'

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
		<div className={cn(launcherSectionLabelClass, className)}>
			<span>{title}</span>
			<span className={launcherSectionCountClass}>{count}</span>
		</div>
	)
}

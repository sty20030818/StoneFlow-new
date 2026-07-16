import type { ComponentPropsWithoutRef, ReactNode } from 'react'

import { cn } from '@/shared/lib/utils'

import {
	detailSectionClass,
	detailSectionContentClass,
	detailSectionDescriptionClass,
	detailSectionHeaderClass,
	detailSectionTitleClass,
} from './detailTokens'

type DetailSectionProps = ComponentPropsWithoutRef<'section'> & {
	title?: ReactNode
	description?: ReactNode
	contentClassName?: string
}

export function DetailSection({
	title,
	description,
	className,
	contentClassName,
	children,
	...props
}: DetailSectionProps) {
	return (
		<section className={cn(detailSectionClass, className)} {...props}>
			{title || description ? (
				<div className={detailSectionHeaderClass}>
					{title ? <h3 className={detailSectionTitleClass}>{title}</h3> : null}
					{description ? <p className={detailSectionDescriptionClass}>{description}</p> : null}
				</div>
			) : null}
			<div className={cn(detailSectionContentClass, contentClassName)}>{children}</div>
		</section>
	)
}

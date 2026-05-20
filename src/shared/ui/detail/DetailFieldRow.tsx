import type { ComponentPropsWithoutRef, ReactNode } from 'react'

import { cn } from '@/shared/lib/utils'

import {
	detailFieldContentClass,
	detailFieldDescriptionClass,
	detailFieldLabelClass,
	detailFieldRowClass,
} from './detailTokens'

type DetailFieldRowProps = ComponentPropsWithoutRef<'div'> & {
	label: ReactNode
	description?: ReactNode
	labelClassName?: string
	contentClassName?: string
}

export function DetailFieldRow({
	label,
	description,
	className,
	labelClassName,
	contentClassName,
	children,
	...props
}: DetailFieldRowProps) {
	return (
		<div className={cn(detailFieldRowClass, className)} {...props}>
			<div className={cn(detailFieldLabelClass, labelClassName)}>{label}</div>
			<div className={cn(detailFieldContentClass, contentClassName)}>
				{children}
				{description ? <p className={detailFieldDescriptionClass}>{description}</p> : null}
			</div>
		</div>
	)
}

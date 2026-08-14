import { forwardRef, type ReactNode } from 'react'

import { cn } from '@/shared/lib/utils'
import { AppScrollArea } from '@/shared/components/AppScrollArea'

import { detailBodyViewportClass, detailBodyWrapperClass } from './detailTokens'

type DetailBodyProps = {
	children: ReactNode
	className?: string
	viewportClassName?: string
}

export const DetailBody = forwardRef<HTMLDivElement, DetailBodyProps>(function DetailBody(
	{ children, className, viewportClassName },
	ref,
) {
	return (
		<AppScrollArea
			className={cn(detailBodyWrapperClass, className)}
			ref={ref}
			viewportClassName={cn(detailBodyViewportClass, viewportClassName)}
		>
			{children}
		</AppScrollArea>
	)
})

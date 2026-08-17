import { forwardRef, type ReactNode } from 'react'

import { ScrollShadow } from '@heroui/react'

import { cn } from '@/shared/lib/utils'

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
		<ScrollShadow
			className={cn(detailBodyWrapperClass, detailBodyViewportClass, className, viewportClassName)}
			data-scroll-container='true'
			ref={ref}
		>
			{children}
		</ScrollShadow>
	)
})

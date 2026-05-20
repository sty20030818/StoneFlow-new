import type { ReactNode } from 'react'

import { cn } from '@/shared/lib/utils'
import { AppScrollArea } from '@/shared/ui/AppScrollArea'

import { detailBodyViewportClass, detailBodyWrapperClass } from './detailTokens'

type DetailBodyProps = {
	children: ReactNode
	className?: string
	viewportClassName?: string
}

export function DetailBody({ children, className, viewportClassName }: DetailBodyProps) {
	return (
		<AppScrollArea
			className={cn(detailBodyWrapperClass, className)}
			viewportClassName={cn(detailBodyViewportClass, viewportClassName)}
		>
			{children}
		</AppScrollArea>
	)
}

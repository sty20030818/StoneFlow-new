import type { ComponentPropsWithoutRef } from 'react'

import { cn } from '@/shared/lib/utils'

import { detailFooterClass } from './detailTokens'

type DetailFooterProps = ComponentPropsWithoutRef<'div'>

export function DetailFooter({ className, children, ...props }: DetailFooterProps) {
	return (
		<div className={cn(detailFooterClass, className)} {...props}>
			{children}
		</div>
	)
}

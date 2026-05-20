import type { ComponentPropsWithoutRef } from 'react'

import { cn } from '@/shared/lib/utils'

import { detailHeaderClass } from './detailTokens'

type DetailHeaderProps = ComponentPropsWithoutRef<'div'>

export function DetailHeader({ className, children, ...props }: DetailHeaderProps) {
	return (
		<div className={cn(detailHeaderClass, className)} {...props}>
			{children}
		</div>
	)
}

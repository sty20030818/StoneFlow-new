import type { ComponentPropsWithoutRef } from 'react'

import { cn } from '@/shared/lib/utils'

import { detailDrawerShellClass } from './detailTokens'

type DetailDrawerShellProps = ComponentPropsWithoutRef<'div'>

export function DetailDrawerShell({
	className,
	children,
	...props
}: DetailDrawerShellProps) {
	return (
		<div
			className={cn(detailDrawerShellClass, className)}
			data-detail-drawer-shell='true'
			{...props}
		>
			{children}
		</div>
	)
}

import type { ComponentPropsWithoutRef } from 'react'

import { cn } from '@/shared/lib/utils'

import {
	detailPageGridClass,
	detailPageMainClass,
	detailPageSidebarClass,
	detailPageSidebarInnerClass,
	detailPageStatusBlockClass,
} from './detailTokens'

export function DetailPageGrid({ className, children, ...props }: ComponentPropsWithoutRef<'div'>) {
	return (
		<div className={cn(detailPageGridClass, className)} {...props}>
			{children}
		</div>
	)
}

export function DetailPageMain({ className, children, ...props }: ComponentPropsWithoutRef<'div'>) {
	return (
		<div className={cn(detailPageMainClass, className)} {...props}>
			{children}
		</div>
	)
}

export function DetailPageSidebar({
	className,
	children,
	...props
}: ComponentPropsWithoutRef<'aside'>) {
	return (
		<aside className={cn(detailPageSidebarClass, className)} {...props}>
			<div className={detailPageSidebarInnerClass}>{children}</div>
		</aside>
	)
}

export function DetailPageStatusBlock({
	className,
	children,
	...props
}: ComponentPropsWithoutRef<'div'>) {
	return (
		<div className={cn(detailPageStatusBlockClass, className)} {...props}>
			{children}
		</div>
	)
}

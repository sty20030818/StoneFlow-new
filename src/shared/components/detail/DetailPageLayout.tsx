import type { ComponentPropsWithoutRef } from 'react'

import { cn } from '@/shared/lib/utils'
import { AppScrollArea } from '@/shared/components/AppScrollArea'

import {
	detailPageContentClass,
	detailPageGridClass,
	detailPageHeaderClass,
	detailPageLayoutClass,
	detailPageMainClass,
	detailPageSidebarClass,
	detailPageSidebarInnerClass,
	detailPageStatusBlockClass,
	detailPageViewportClass,
} from './detailTokens'

export function DetailPageLayout({
	className,
	children,
	...props
}: ComponentPropsWithoutRef<'section'>) {
	return (
		<section className={cn(detailPageLayoutClass, className)} {...props}>
			{children}
		</section>
	)
}

export function DetailPageHeader({
	className,
	children,
	...props
}: ComponentPropsWithoutRef<'div'>) {
	return (
		<div className={cn(detailPageHeaderClass, className)} {...props}>
			{children}
		</div>
	)
}

type DetailPageContentProps = ComponentPropsWithoutRef<'div'> & {
	viewportClassName?: string
}

export function DetailPageContent({
	className,
	viewportClassName,
	children,
	...props
}: DetailPageContentProps) {
	return (
		<AppScrollArea
			className={cn(detailPageContentClass, className)}
			viewportClassName={cn(detailPageViewportClass, viewportClassName)}
			viewportProps={props}
		>
			{children}
		</AppScrollArea>
	)
}

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

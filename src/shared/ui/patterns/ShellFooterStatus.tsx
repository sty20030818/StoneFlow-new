/**
 * Shell Footer 状态轨零件（presentational compound）。
 * 灯 / 文案 / 动作各自独立，不共享 click target。
 *
 * React 19：ref 作为普通 prop，无需 forwardRef。
 */

import type { ButtonHTMLAttributes, ComponentPropsWithoutRef, ReactNode, Ref } from 'react'

import {
	shellFooterIconButtonClass,
	shellFooterInteractiveTextClass,
	shellFooterStaticTextClass,
	shellFooterStatusDotClass,
} from '@/shared/ui/patterns/shell-footer'
import { cn } from '@/shared/lib/utils'

function Root({
	className,
	children,
	...props
}: ComponentPropsWithoutRef<'div'> & { children: ReactNode }) {
	return (
		<div className={cn('flex min-w-0 items-center gap-1.5', className)} {...props}>
			{children}
		</div>
	)
}

function Dot({
	className,
	busy,
	...props
}: ComponentPropsWithoutRef<'span'> & { busy?: boolean }) {
	return (
		<span
			className={cn(shellFooterStatusDotClass, busy && 'animate-pulse', className)}
			aria-hidden
			{...props}
		/>
	)
}

function StaticLabel({
	className,
	children,
	...props
}: ComponentPropsWithoutRef<'span'> & { children: ReactNode }) {
	return (
		<span className={cn(shellFooterStaticTextClass, 'max-w-28', className)} {...props}>
			{children}
		</span>
	)
}

function InteractiveLabel({
	className,
	children,
	ref,
	...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
	children: ReactNode
	ref?: Ref<HTMLButtonElement>
}) {
	return (
		<button
			ref={ref}
			type='button'
			className={cn(
				shellFooterInteractiveTextClass,
				'max-w-32 cursor-pointer tabular-nums',
				className,
			)}
			{...props}
		>
			{children}
		</button>
	)
}

function IconButton({
	className,
	children,
	ref,
	...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
	children: ReactNode
	ref?: Ref<HTMLButtonElement>
}) {
	return (
		<button ref={ref} type='button' className={cn(shellFooterIconButtonClass, className)} {...props}>
			{children}
		</button>
	)
}

/** 环 / 自定义指示器容器 */
function Indicator({
	className,
	children,
	...props
}: ComponentPropsWithoutRef<'span'> & { children: ReactNode }) {
	return (
		<span
			className={cn('relative flex size-3.5 shrink-0 items-center justify-center', className)}
			{...props}
		>
			{children}
		</span>
	)
}

export const ShellFooterStatus = {
	Root,
	Dot,
	StaticLabel,
	InteractiveLabel,
	IconButton,
	Indicator,
}

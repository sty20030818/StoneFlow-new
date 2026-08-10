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
} from '@/shared/components/patterns/shell-footer'
import { ActionTooltip, DisabledActionTooltip, OverflowTooltip } from '@/shared/components/tooltip'
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
}: Omit<ComponentPropsWithoutRef<'span'>, 'title'> & { busy?: boolean }) {
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
	overflowContent,
}: {
	children: ReactNode
	className?: string
	overflowContent?: ReactNode
}) {
	if (overflowContent !== undefined) {
		return (
			<OverflowTooltip
				className={cn(shellFooterStaticTextClass, 'max-w-28', className)}
				content={overflowContent}
			>
				{children}
			</OverflowTooltip>
		)
	}

	return <span className={cn(shellFooterStaticTextClass, 'max-w-28', className)}>{children}</span>
}

function InteractiveLabel({
	className,
	children,
	ref,
	...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'title'> & {
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
	disabled,
	disabledReason,
	ref,
	'aria-label': ariaLabel,
	...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label' | 'children' | 'title'> & {
	'aria-label': string
	children: ReactNode
	disabledReason?: ReactNode
	ref?: Ref<HTMLButtonElement>
}) {
	const action = (
		<button
			ref={ref}
			type='button'
			aria-label={ariaLabel}
			className={cn(shellFooterIconButtonClass, className)}
			disabled={disabled}
			{...props}
		>
			{children}
		</button>
	)

	if (disabled) {
		return disabledReason === undefined ? (
			action
		) : (
			<DisabledActionTooltip label={ariaLabel} reason={disabledReason}>
				{action}
			</DisabledActionTooltip>
		)
	}

	return (
		<ActionTooltip>
			<ActionTooltip.Trigger asChild>{action}</ActionTooltip.Trigger>
			<ActionTooltip.Content>
				<ActionTooltip.Row label={ariaLabel} />
			</ActionTooltip.Content>
		</ActionTooltip>
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

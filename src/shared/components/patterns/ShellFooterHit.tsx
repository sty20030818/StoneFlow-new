/**
 * Shell Footer 一体可点 hit（presentational）。
 *
 * 契约：indicator（children）+ label 共用 click target。
 * 无业务语义；业务变体在 feature 层组合。
 */

import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react'

import {
	shellFooterHitClass,
	shellFooterHitToneClass,
	type ShellFooterHitTone,
} from '@/shared/components/patterns/shell-footer'
import { ActionTooltip } from '@/shared/components/tooltip'
import { cn } from '@/shared/lib/utils'

export type ShellFooterHitProps = {
	/** 文案 */
	label: string
	/** 语气色 */
	tone?: ShellFooterHitTone
	/** 指示器插槽（环 / 图标等） */
	children: ReactNode
	/** 仅在能补充 label 信息时传入；相同文案不会重复展示 Tooltip。 */
	tooltipLabel?: string
	ref?: Ref<HTMLButtonElement>
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label' | 'children' | 'title' | 'type'>

export function ShellFooterHit({
	label,
	tone = 'neutral',
	children,
	className,
	disabled,
	ref,
	tooltipLabel,
	...props
}: ShellFooterHitProps) {
	const action = (
		<button
			ref={ref}
			type='button'
			aria-label={tooltipLabel ?? label}
			className={cn(shellFooterHitClass, shellFooterHitToneClass[tone], className)}
			disabled={disabled}
			{...props}
		>
			<span className='relative flex size-3.5 shrink-0 items-center justify-center' aria-hidden>
				{children}
			</span>
			<span className='min-w-0 truncate'>{label}</span>
		</button>
	)

	if (disabled || !tooltipLabel || tooltipLabel === label) return action

	return (
		<ActionTooltip>
			<ActionTooltip.Trigger asChild>{action}</ActionTooltip.Trigger>
			<ActionTooltip.Content>
				<ActionTooltip.Row label={tooltipLabel} />
			</ActionTooltip.Content>
		</ActionTooltip>
	)
}

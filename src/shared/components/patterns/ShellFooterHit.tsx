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
import { cn } from '@/shared/lib/utils'

export type ShellFooterHitProps = {
	/** 文案 */
	label: string
	/** 语气色 */
	tone?: ShellFooterHitTone
	/** 指示器插槽（环 / 图标等） */
	children: ReactNode
	ref?: Ref<HTMLButtonElement>
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'type'>

export function ShellFooterHit({
	label,
	tone = 'neutral',
	children,
	className,
	title,
	ref,
	...props
}: ShellFooterHitProps) {
	const accessible = title ?? label

	return (
		<button
			ref={ref}
			type='button'
			title={accessible}
			aria-label={accessible}
			className={cn(shellFooterHitClass, shellFooterHitToneClass[tone], className)}
			{...props}
		>
			<span className='relative flex size-3.5 shrink-0 items-center justify-center' aria-hidden>
				{children}
			</span>
			<span className='min-w-0 truncate'>{label}</span>
		</button>
	)
}

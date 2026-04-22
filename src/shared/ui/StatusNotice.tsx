import type { ComponentPropsWithoutRef, ReactNode } from 'react'

import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/shared/lib/utils'

const statusNoticeVariants = cva('rounded-lg border', {
	variants: {
		variant: {
			neutral: 'border-(--sf-color-border-subtle) bg-muted/60 text-(--sf-color-shell-tertiary)',
			success:
				'border-(--sf-color-success-soft-border) bg-(--sf-color-success-soft) text-(--sf-color-success-soft-text)',
			warning:
				'border-(--sf-color-warning-soft-border) bg-(--sf-color-warning-soft) text-(--sf-color-warning-soft-text)',
			danger:
				'border-(--sf-color-danger-soft-border) bg-(--sf-color-danger-soft) text-(--sf-color-danger-soft-text)',
		},
		size: {
			default: 'px-4 py-4',
			sm: 'px-3 py-2',
		},
		layout: {
			stack: '',
			split: 'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
		},
	},
	defaultVariants: {
		variant: 'neutral',
		size: 'default',
		layout: 'stack',
	},
})

type StatusNoticeProps = ComponentPropsWithoutRef<'div'> &
	VariantProps<typeof statusNoticeVariants> & {
		title?: ReactNode
		description?: ReactNode
		actions?: ReactNode
	}

/**
 * 统一轻量状态提示块，覆盖 success / warning / danger / neutral 四类语义。
 */
export function StatusNotice({
	className,
	variant,
	size,
	layout,
	title,
	description,
	actions,
	children,
	...props
}: StatusNoticeProps) {
	const content =
		title || description ? (
			<div className='min-w-0'>
				{title ? <p className='text-sm font-medium text-current'>{title}</p> : null}
				{description ? (
					<p className={cn('opacity-90', title ? 'mt-1 text-sm leading-6' : 'text-sm leading-6')}>
						{description}
					</p>
				) : null}
			</div>
		) : (
			<div className='min-w-0 text-current'>{children}</div>
		)

	return (
		<div
			className={cn(
				statusNoticeVariants({ variant, size, layout: actions ? 'split' : layout }),
				className,
			)}
			{...props}
		>
			{content}
			{actions ? <div className='flex shrink-0 items-center gap-2'>{actions}</div> : null}
		</div>
	)
}

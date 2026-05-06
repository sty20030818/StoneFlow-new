import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/shared/lib/utils'

/**
 * 页面级空态容器：负责在 flex 布局中吃掉剩余高度（flex-1 + min-h-0），
 * 让内部的 `Empty` 能稳定做到垂直/水平居中。
 */
function EmptyPage({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			className={cn('flex min-h-0 min-w-0 flex-1 flex-col', className)}
			data-slot='empty-page'
			{...props}
		/>
	)
}

function Empty({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			className={cn(
				'flex w-full min-w-0 flex-1 flex-col items-center justify-center gap-4 p-6 text-center',
				className,
			)}
			data-slot='empty'
			{...props}
		/>
	)
}

function EmptyHeader({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			className={cn('flex max-w-sm flex-col items-center gap-2', className)}
			data-slot='empty-header'
			{...props}
		/>
	)
}

const emptyMediaVariants = cva(
	'flex shrink-0 items-center justify-center [&_svg]:pointer-events-none [&_svg]:shrink-0',
	{
		variants: {
			variant: {
				default: 'bg-transparent',
				icon: 'size-9 rounded-lg bg-sf-shell-hover text-sf-text-primary [&_svg:not([class*=size-])]:size-4.5',
			},
		},
		defaultVariants: {
			variant: 'default',
		},
	},
)

function EmptyMedia({
	className,
	variant = 'default',
	...props
}: React.ComponentProps<'div'> & VariantProps<typeof emptyMediaVariants>) {
	return (
		<div
			className={cn(emptyMediaVariants({ className, variant }))}
			data-slot='empty-media'
			data-variant={variant}
			{...props}
		/>
	)
}

function EmptyTitle({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			className={cn('text-sm font-medium text-foreground tracking-tight', className)}
			data-slot='empty-title'
			{...props}
		/>
	)
}

function EmptyDescription({ className, ...props }: React.ComponentProps<'p'>) {
	return (
		<p
			className={cn(
				// 让空态描述在多行时更“均匀换行”，避免最后一行特别短带来的视觉失衡
				'text-balance text-sm leading-6 text-muted-foreground [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-foreground',
				className,
			)}
			data-slot='empty-description'
			{...props}
		/>
	)
}

function EmptyContent({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			className={cn('flex w-full max-w-sm min-w-0 flex-col items-center gap-2.5', className)}
			data-slot='empty-content'
			{...props}
		/>
	)
}

export { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyPage, EmptyTitle }

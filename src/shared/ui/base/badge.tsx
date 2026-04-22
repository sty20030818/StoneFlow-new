import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'

import { cn } from '@/shared/lib/utils'

const badgeVariants = cva(
	'group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/18 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!',
	{
		variants: {
			variant: {
				default:
					'border-(--sf-color-accent-soft-border) bg-accent text-accent-foreground [a]:hover:bg-accent/80',
				primary:
					'border-(--sf-color-accent-soft-border) bg-accent text-accent-foreground [a]:hover:bg-accent/80',
				secondary:
					'border-(--sf-color-border-subtle) bg-secondary text-secondary-foreground [a]:hover:bg-(--sf-color-bg-surface-hover)',
				destructive:
					'border-(--sf-color-danger-soft-border) bg-(--sf-color-danger-soft) text-(--sf-color-danger-soft-text) focus-visible:ring-destructive/20 [a]:hover:bg-(--sf-color-danger-soft)',
				success:
					'border-(--sf-color-success-soft-border) bg-(--sf-color-success-soft) text-(--sf-color-success-soft-text) [a]:hover:bg-(--sf-color-success-soft)',
				warning:
					'border-(--sf-color-warning-soft-border) bg-(--sf-color-warning-soft) text-(--sf-color-warning-soft-text) [a]:hover:bg-(--sf-color-warning-soft)',
				outline:
					'border-(--sf-color-border-subtle) bg-card text-(--sf-color-text-secondary) [a]:hover:bg-muted/70 [a]:hover:text-foreground',
				ghost:
					'border-transparent hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50',
				link: 'text-primary underline-offset-4 hover:underline',
			},
		},
		defaultVariants: {
			variant: 'default',
		},
	},
)

export type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>

function Badge({
	className,
	variant = 'default',
	asChild = false,
	...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
	const Comp = asChild ? Slot.Root : 'span'

	return (
		<Comp
			data-slot='badge'
			data-variant={variant}
			className={cn(badgeVariants({ variant }), className)}
			{...props}
		/>
	)
}

export { Badge }

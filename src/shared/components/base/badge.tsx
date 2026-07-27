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
					'border-sf-accent-soft-border bg-accent text-accent-foreground [a]:hover:bg-accent/80',
				primary:
					'border-sf-accent-soft-border bg-accent text-accent-foreground [a]:hover:bg-accent/80',
				secondary:
					'border-sf-border-subtle bg-secondary text-secondary-foreground [a]:hover:bg-sf-surface-hover',
				destructive:
					'border-sf-danger-surface-border bg-sf-danger-surface text-sf-danger-surface-text focus-visible:ring-destructive/20 [a]:hover:bg-sf-danger-surface',
				success:
					'border-sf-success-surface-border bg-sf-success-surface text-sf-success-surface-text [a]:hover:bg-sf-success-surface',
				warning:
					'border-sf-warning-surface-border bg-sf-warning-surface text-sf-warning-surface-text [a]:hover:bg-sf-warning-surface',
				outline:
					'border-sf-border-subtle bg-card text-sf-text-secondary [a]:hover:bg-muted/70 [a]:hover:text-foreground',
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

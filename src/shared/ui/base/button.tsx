import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'

import { cn } from '@/shared/lib/utils'

const buttonVariants = cva(
	"group/button inline-flex shrink-0 items-center justify-center rounded-md border border-transparent bg-clip-padding text-sm leading-none font-medium whitespace-nowrap transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/18 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
	{
		variants: {
			variant: {
				default:
					'border-primary bg-primary text-primary-foreground hover:opacity-95 [a]:hover:opacity-95',
				outline:
					'border-sf-border-interactive bg-sf-surface-interactive text-sf-text-interactive shadow-(--sf-shadow-interactive) hover:border-sf-border-interactive-hover hover:bg-sf-surface-interactive-hover hover:text-sf-text-interactive-hover focus-visible:border-sf-border-interactive-active focus-visible:bg-sf-surface-interactive-active focus-visible:text-sf-text-interactive-active aria-expanded:border-sf-border-interactive-active aria-expanded:bg-sf-surface-interactive-active aria-expanded:text-sf-text-interactive-active aria-pressed:border-sf-border-interactive-active aria-pressed:bg-sf-surface-interactive-active aria-pressed:text-sf-text-interactive-active data-[state=open]:border-sf-border-interactive-active data-[state=open]:bg-sf-surface-interactive-active data-[state=open]:text-sf-text-interactive-active',
				secondary:
					'border-border bg-secondary text-secondary-foreground hover:bg-muted/80 hover:text-foreground aria-expanded:bg-muted/80 aria-expanded:text-foreground',
				ghost:
					'text-muted-foreground hover:bg-sf-surface-interactive-hover hover:text-sf-text-interactive-hover focus-visible:bg-sf-surface-interactive-hover focus-visible:text-sf-text-interactive-hover aria-expanded:bg-sf-surface-interactive-hover aria-expanded:text-sf-text-interactive-hover aria-pressed:bg-sf-surface-interactive-hover aria-pressed:text-sf-text-interactive-hover data-[state=open]:bg-sf-surface-interactive-hover data-[state=open]:text-sf-text-interactive-hover',
				destructive:
					'border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive/15 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40',
				link: 'text-primary underline-offset-4 hover:underline',
			},
			size: {
				default:
					'h-[30px] gap-1.5 rounded-full px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
				xs: "h-[30px] gap-1 rounded-full px-2 text-xs in-data-[slot=button-group]:rounded-full has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
				sm: "h-[30px] gap-1 rounded-full px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-full has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
				lg: 'h-[30px] gap-1.5 rounded-full px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
				icon: 'size-[30px] rounded-full',
				'icon-xs':
					"size-[30px] rounded-full in-data-[slot=button-group]:rounded-full [&_svg:not([class*='size-'])]:size-3",
				'icon-sm': 'size-[30px] rounded-full in-data-[slot=button-group]:rounded-full',
				'icon-lg': 'size-[30px] rounded-full',
			},
		},
		defaultVariants: {
			variant: 'default',
			size: 'default',
		},
	},
)

const Button = React.forwardRef<
	HTMLButtonElement,
	React.ComponentProps<'button'> &
		VariantProps<typeof buttonVariants> & {
			asChild?: boolean
		}
>(function Button({ className, variant = 'default', size = 'default', asChild = false, ...props }, ref) {
	const Comp = asChild ? Slot.Root : 'button'

	return (
		<Comp
			data-slot='button'
			data-variant={variant}
			data-size={size}
			className={cn(buttonVariants({ variant, size, className }))}
			ref={ref}
			{...props}
		/>
	)
})

export { Button, buttonVariants }

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
					'border-primary bg-primary text-primary-foreground hover:bg-(--sf-color-accent-hover) [a]:hover:bg-(--sf-color-accent-hover)',
				outline:
					'border-border bg-(--sf-color-main-icon-button-bg) text-(--sf-color-main-icon-button-foreground) shadow-(--sf-shadow-panel) hover:border-(--sf-color-border) hover:bg-(--sf-color-main-icon-button-hover) hover:text-foreground aria-expanded:border-(--sf-color-border) aria-expanded:bg-(--sf-color-main-icon-button-hover) aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50',
				secondary:
					'border-(--sf-color-border-subtle) bg-secondary text-secondary-foreground hover:bg-(--sf-color-bg-surface-hover) hover:text-foreground aria-expanded:bg-(--sf-color-bg-surface-active) aria-expanded:text-foreground',
				ghost:
					'text-(--sf-color-icon-primary) hover:bg-(--sf-color-bg-surface-hover) hover:text-foreground aria-expanded:bg-(--sf-color-bg-surface-active) aria-expanded:text-foreground dark:hover:bg-muted/50',
				destructive:
					'border-(--sf-color-danger-soft-border) bg-(--sf-color-danger-soft) text-(--sf-color-danger-soft-text) hover:bg-destructive/12 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40',
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

function Button({
	className,
	variant = 'default',
	size = 'default',
	asChild = false,
	...props
}: React.ComponentProps<'button'> &
	VariantProps<typeof buttonVariants> & {
		asChild?: boolean
	}) {
	const Comp = asChild ? Slot.Root : 'button'

	return (
		<Comp
			data-slot='button'
			data-variant={variant}
			data-size={size}
			className={cn(buttonVariants({ variant, size, className }))}
			{...props}
		/>
	)
}

export { Button }

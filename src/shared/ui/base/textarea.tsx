import * as React from 'react'

import { cn } from '@/shared/lib/utils'

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
	return (
		<textarea
			data-slot='textarea'
			className={cn(
				'flex field-sizing-content min-h-16 w-full rounded-md border border-input bg-card px-2.5 py-2 text-base text-foreground transition-colors outline-none placeholder:text-(--sf-color-text-quaternary) hover:border-(--sf-color-border-strong) focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/14 disabled:cursor-not-allowed disabled:bg-muted disabled:text-(--sf-color-text-disabled) disabled:opacity-80 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40',
				className,
			)}
			{...props}
		/>
	)
}

export { Textarea }

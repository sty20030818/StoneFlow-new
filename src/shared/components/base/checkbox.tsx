import * as React from 'react'
import { Checkbox as CheckboxPrimitive } from 'radix-ui'

import { cn } from '@/shared/lib/utils'

function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
	return (
		<CheckboxPrimitive.Root
			data-slot='checkbox'
			className={cn(
				'group/checkbox flex size-5 shrink-0 items-center justify-center rounded-full bg-transparent p-0 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40',
				className,
			)}
			{...props}
		>
			<span className='flex size-4 items-center justify-center rounded-[5px] border border-sf-border-strong bg-transparent text-transparent transition-colors group-hover/checkbox:border-sf-icon-secondary group-data-[state=checked]/checkbox:border-primary group-data-[state=checked]/checkbox:bg-primary group-data-[state=checked]/checkbox:text-primary-foreground group-data-[state=indeterminate]/checkbox:border-primary group-data-[state=indeterminate]/checkbox:bg-primary group-data-[state=indeterminate]/checkbox:text-primary-foreground'>
				<CheckboxPrimitive.Indicator data-slot='checkbox-indicator'>
					<svg
						aria-hidden
						className='size-3'
						fill='none'
						stroke='currentColor'
						strokeWidth='2.5'
						viewBox='0 0 24 24'
					>
						<path d='M5 12.5L9.5 17L19 7.5' />
					</svg>
				</CheckboxPrimitive.Indicator>
			</span>
		</CheckboxPrimitive.Root>
	)
}

export { Checkbox }

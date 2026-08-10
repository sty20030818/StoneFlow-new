import { forwardRef } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

import { cn } from '@/shared/lib/utils'
import { buttonVariants } from '@/shared/components/base/button'
import { OverflowTooltip } from '@/shared/components/tooltip'

type DetailMetaButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
	icon?: ReactNode
	label: ReactNode
	trailing?: ReactNode
}

export const DetailMetaButton = forwardRef<HTMLButtonElement, DetailMetaButtonProps>(
	function DetailMetaButton(
		{ icon, label, trailing = null, className, type = 'button', ...props },
		ref,
	) {
		return (
			<button
				{...props}
				className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), className)}
				data-size='sm'
				data-variant='outline'
				ref={ref}
				type={type}
			>
				{icon}
				<OverflowTooltip className='min-w-0 flex-1 text-left' content={label}>
					{label}
				</OverflowTooltip>
				{trailing}
			</button>
		)
	},
)

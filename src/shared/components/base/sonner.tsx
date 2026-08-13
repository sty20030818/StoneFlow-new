'use client'

import type { CSSProperties } from 'react'

import { Toaster as Sonner, type ToasterProps } from 'sonner'

function Toaster({ position = 'bottom-right', ...props }: ToasterProps) {
	return (
		<Sonner
			className='toaster group'
			position={position}
			style={
				{
					'--normal-bg': 'var(--sf-surface-raised)',
					'--normal-text': 'var(--sf-text-primary)',
					'--normal-border': 'var(--sf-border-secondary)',
					'--border-radius': 'var(--radius-md)',
				} as CSSProperties
			}
			toastOptions={{
				classNames: {
					toast:
						'rounded-lg border border-legacy-border bg-popover text-popover-foreground shadow-(--sf-shadow-popover)',
					title: 'text-[13px] font-medium text-legacy-foreground',
					description: 'text-[12px] text-muted-foreground',
				},
			}}
			{...props}
		/>
	)
}

export { Toaster }

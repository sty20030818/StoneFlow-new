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
					'--normal-bg': 'var(--popover)',
					'--normal-text': 'var(--popover-foreground)',
					'--normal-border': 'var(--border)',
					'--border-radius': 'var(--radius-md)',
				} as CSSProperties
			}
			toastOptions={{
				classNames: {
					toast:
						'rounded-lg border border-(--sf-color-border-secondary) bg-popover text-popover-foreground shadow-(--sf-shadow-popover)',
					title: 'text-[13px] font-medium text-foreground',
					description: 'text-[12px] text-muted-foreground',
				},
			}}
			{...props}
		/>
	)
}

export { Toaster }

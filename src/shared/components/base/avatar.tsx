import * as React from 'react'
import * as AvatarPrimitive from '@radix-ui/react-avatar'

import { cn } from '@/shared/lib/utils'

function Avatar({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Root>) {
	return (
		<AvatarPrimitive.Root
			className={cn('relative flex size-8 shrink-0 rounded-full', className)}
			data-slot='avatar'
			{...props}
		/>
	)
}

function AvatarImage({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Image>) {
	return (
		<AvatarPrimitive.Image
			className={cn('aspect-square size-full overflow-hidden rounded-full', className)}
			data-slot='avatar-image'
			{...props}
		/>
	)
}

function AvatarFallback({
	className,
	...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
	return (
		<AvatarPrimitive.Fallback
			className={cn(
				'flex size-full items-center justify-center overflow-hidden rounded-full bg-legacy-muted',
				className,
			)}
			data-slot='avatar-fallback'
			{...props}
		/>
	)
}

function AvatarBadge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
	return (
		<span
			className={cn(
				'absolute -right-0.5 -bottom-0.5 size-3 rounded-full border-2 border-legacy-background',
				className,
			)}
			data-slot='avatar-badge'
			{...props}
		/>
	)
}

export { Avatar, AvatarImage, AvatarFallback, AvatarBadge }

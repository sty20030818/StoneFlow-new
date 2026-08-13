'use client'

import * as React from 'react'
import { Dialog as DialogPrimitive } from 'radix-ui'

import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/components/base/button'
import { ActionTooltip } from '@/shared/components/tooltip'
import { XIcon } from 'lucide-react'

function Dialog({ ...props }: React.ComponentProps<typeof DialogPrimitive.Root>) {
	return <DialogPrimitive.Root data-slot='dialog' {...props} />
}

function DialogTrigger({ ...props }: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
	return <DialogPrimitive.Trigger data-slot='dialog-trigger' {...props} />
}

function DialogPortal({ ...props }: React.ComponentProps<typeof DialogPrimitive.Portal>) {
	return <DialogPrimitive.Portal data-slot='dialog-portal' {...props} />
}

function DialogClose({ ...props }: React.ComponentProps<typeof DialogPrimitive.Close>) {
	return <DialogPrimitive.Close data-slot='dialog-close' {...props} />
}

function DialogOverlay({
	className,
	...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
	return (
		<DialogPrimitive.Overlay
			data-slot='dialog-overlay'
			className={cn(
				// 不在遮罩上使用 backdrop-blur：低透明度下仍会严重糊化背后内容
				'fixed inset-0 isolate z-50 bg-sf-overlay-scrim duration-100 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0',
				className,
			)}
			{...props}
		/>
	)
}

function DialogContent({
	className,
	children,
	showCloseButton = true,
	disableAnimation = false,
	...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
	showCloseButton?: boolean
	disableAnimation?: boolean
}) {
	return (
		<DialogPortal>
			<DialogOverlay />
			<DialogPrimitive.Content
				data-slot='dialog-content'
				className={cn(
					'fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl border border-sf-border-secondary bg-popover p-4 text-sm text-popover-foreground shadow-(--sf-shadow-float) outline-none sm:max-w-sm',
					disableAnimation
						? 'duration-0'
						: 'duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
					className,
				)}
				{...props}
			>
				{children}
				{showCloseButton ? <DialogIconCloseButton /> : null}
			</DialogPrimitive.Content>
		</DialogPortal>
	)
}

function DialogIconCloseButton() {
	return (
		<ActionTooltip>
			<ActionTooltip.Trigger asChild>
				<DialogPrimitive.Close data-slot='dialog-close' asChild>
					<Button
						aria-label='关闭'
						className='absolute top-2 right-2'
						size='icon-sm'
						type='button'
						variant='ghost'
					>
						<XIcon />
					</Button>
				</DialogPrimitive.Close>
			</ActionTooltip.Trigger>
			<ActionTooltip.Content>
				<ActionTooltip.Row label='关闭' />
			</ActionTooltip.Content>
		</ActionTooltip>
	)
}

function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div data-slot='dialog-header' className={cn('flex flex-col gap-2', className)} {...props} />
	)
}

function DialogFooter({
	className,
	showCloseButton = false,
	children,
	...props
}: React.ComponentProps<'div'> & {
	showCloseButton?: boolean
}) {
	return (
		<div
			data-slot='dialog-footer'
			className={cn(
				'-mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-xl border-t border-sf-divider bg-legacy-muted/60 p-4 sm:flex-row sm:justify-end',
				className,
			)}
			{...props}
		>
			{children}
			{showCloseButton && (
				<DialogPrimitive.Close asChild>
					<Button variant='outline'>关闭</Button>
				</DialogPrimitive.Close>
			)}
		</div>
	)
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
	return (
		<DialogPrimitive.Title
			data-slot='dialog-title'
			className={cn('text-base leading-none font-medium', className)}
			{...props}
		/>
	)
}

function DialogDescription({
	className,
	...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
	return (
		<DialogPrimitive.Description
			data-slot='dialog-description'
			className={cn(
				'text-sm text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-legacy-foreground',
				className,
			)}
			{...props}
		/>
	)
}

export {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogOverlay,
	DialogPortal,
	DialogTitle,
	DialogTrigger,
}

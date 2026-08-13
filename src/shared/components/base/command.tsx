'use client'

import * as React from 'react'
import { Command as CommandPrimitive } from 'cmdk'

import { cn } from '@/shared/lib/utils'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/shared/components/base/dialog'

function Command({ className, ...props }: React.ComponentProps<typeof CommandPrimitive>) {
	return (
		<CommandPrimitive
			data-slot='command'
			className={cn(
				'flex size-full flex-col overflow-hidden rounded-lg border border-sf-border-subtle bg-legacy-background/98 p-0 text-popover-foreground shadow-(--sf-shadow-popover)',
				className,
			)}
			{...props}
		/>
	)
}

function CommandDialog({
	title = '命令面板',
	description = '搜索要执行的命令...',
	children,
	className,
	showCloseButton = false,
	...props
}: React.ComponentProps<typeof Dialog> & {
	title?: string
	description?: string
	className?: string
	showCloseButton?: boolean
}) {
	return (
		<Dialog {...props}>
			<DialogHeader className='sr-only'>
				<DialogTitle>{title}</DialogTitle>
				<DialogDescription>{description}</DialogDescription>
			</DialogHeader>
			<DialogContent
				className={cn(
					'top-[18%] translate-y-0 overflow-hidden rounded-xl border-none bg-transparent p-0 shadow-none max-sm:max-w-[calc(100%-1.5rem)] max-lg:max-w-[calc(100%-1.5rem)] sm:max-w-190',
					className,
				)}
				showCloseButton={showCloseButton}
			>
				{children}
			</DialogContent>
		</Dialog>
	)
}

const CommandInput = React.forwardRef<
	React.ElementRef<typeof CommandPrimitive.Input>,
	React.ComponentProps<typeof CommandPrimitive.Input> & {
		wrapperClassName?: string
	}
>(({ className, wrapperClassName, ...props }, ref) => {
	return (
		<div data-slot='command-input-wrapper' className={cn('px-5 py-4', wrapperClassName)}>
			<CommandPrimitive.Input
				data-slot='command-input'
				ref={ref}
				className={cn(
					'w-full border-none bg-transparent p-0 text-[18px] font-medium text-legacy-foreground shadow-none outline-hidden ring-0 placeholder:text-sf-text-quaternary disabled:cursor-not-allowed disabled:opacity-50',
					className,
				)}
				{...props}
			/>
		</div>
	)
})
CommandInput.displayName = 'CommandInput'

const CommandList = React.forwardRef<
	React.ElementRef<typeof CommandPrimitive.List>,
	React.ComponentProps<typeof CommandPrimitive.List>
>(({ className, ...props }, ref) => {
	return (
		<CommandPrimitive.List
			data-slot='command-list'
			ref={ref}
			className={cn(
				'max-h-72 scroll-py-2 overflow-x-hidden overflow-y-auto outline-none',
				className,
			)}
			{...props}
		/>
	)
})
CommandList.displayName = 'CommandList'

function CommandEmpty({
	className,
	...props
}: React.ComponentProps<typeof CommandPrimitive.Empty>) {
	return (
		<CommandPrimitive.Empty
			data-slot='command-empty'
			className={cn('py-10 text-center text-[13px] text-sf-text-secondary', className)}
			{...props}
		/>
	)
}

function CommandGroup({
	className,
	...props
}: React.ComponentProps<typeof CommandPrimitive.Group>) {
	return (
		<CommandPrimitive.Group
			data-slot='command-group'
			className={cn(
				'overflow-hidden px-0 text-legacy-foreground **:[[cmdk-group-heading]]:pr-2 **:[[cmdk-group-heading]]:pl-3 **:[[cmdk-group-heading]]:pt-1 **:[[cmdk-group-heading]]:pb-2 **:[[cmdk-group-heading]]:text-[13px] **:[[cmdk-group-heading]]:font-medium **:[[cmdk-group-heading]]:tracking-normal **:[[cmdk-group-heading]]:text-sf-text-secondary',
				className,
			)}
			{...props}
		/>
	)
}

function CommandSeparator({
	className,
	...props
}: React.ComponentProps<typeof CommandPrimitive.Separator>) {
	return (
		<CommandPrimitive.Separator
			data-slot='command-separator'
			className={cn('mx-4 h-px bg-sf-border-subtle', className)}
			{...props}
		/>
	)
}

function CommandItem({
	className,
	children,
	...props
}: React.ComponentProps<typeof CommandPrimitive.Item>) {
	return (
		<CommandPrimitive.Item
			data-slot='command-item'
			className={cn(
				'group/command-item relative mx-1 flex min-h-11 cursor-default items-center rounded-md bg-transparent px-3 py-2 text-sm outline-hidden select-none hover:bg-sf-surface-app in-data-[slot=dialog-content]:rounded-md! data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-55 data-[selected=false]:bg-transparent data-selected:bg-sf-surface-app data-selected:text-legacy-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0',
				className,
			)}
			{...props}
		>
			{children}
		</CommandPrimitive.Item>
	)
}

function CommandShortcut({ className, ...props }: React.ComponentProps<'span'>) {
	return (
		<span
			data-slot='command-shortcut'
			className={cn(
				'ml-auto text-xs tracking-widest text-muted-foreground group-data-selected/command-item:text-legacy-foreground',
				className,
			)}
			{...props}
		/>
	)
}

export {
	Command,
	CommandDialog,
	CommandInput,
	CommandList,
	CommandEmpty,
	CommandGroup,
	CommandItem,
	CommandShortcut,
	CommandSeparator,
}

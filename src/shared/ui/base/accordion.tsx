import * as React from 'react'
import { Accordion as AccordionPrimitive } from 'radix-ui'

import { cn } from '@/shared/lib/utils'

function Accordion({
	className,
	...props
}: React.ComponentProps<typeof AccordionPrimitive.Root>) {
	return (
		<AccordionPrimitive.Root
			className={cn('flex flex-col gap-3', className)}
			data-slot='accordion'
			{...props}
		/>
	)
}

function AccordionItem({
	className,
	...props
}: React.ComponentProps<typeof AccordionPrimitive.Item>) {
	return (
		<AccordionPrimitive.Item
			className={cn('border-none', className)}
			data-slot='accordion-item'
			{...props}
		/>
	)
}

function AccordionTrigger({
	className,
	...props
}: React.ComponentProps<typeof AccordionPrimitive.Trigger>) {
	return (
		<AccordionPrimitive.Trigger
			className={cn('w-full', className)}
			data-slot='accordion-trigger'
			{...props}
		/>
	)
}

function AccordionContent({
	className,
	...props
}: React.ComponentProps<typeof AccordionPrimitive.Content>) {
	return (
		<AccordionPrimitive.Content
			className={cn(
				'overflow-hidden data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0',
				className,
			)}
			data-slot='accordion-content'
			{...props}
		/>
	)
}

function AccordionHeader({
	className,
	...props
}: React.ComponentProps<typeof AccordionPrimitive.Header>) {
	return (
		<AccordionPrimitive.Header
			className={cn('flex', className)}
			data-slot='accordion-header'
			{...props}
		/>
	)
}

export { Accordion, AccordionContent, AccordionHeader, AccordionItem, AccordionTrigger }

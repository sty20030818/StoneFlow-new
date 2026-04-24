import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'

import { cn } from '@/shared/lib/utils'

type SidebarContextValue = {
	open: boolean
	isMobile: boolean
}

const SidebarContext = React.createContext<SidebarContextValue | null>(null)

function useIsMobile() {
	const [isMobile, setIsMobile] = React.useState(false)

	React.useEffect(() => {
		const mediaQuery = window.matchMedia('(max-width: 768px)')
		const handleChange = () => setIsMobile(mediaQuery.matches)
		handleChange()
		mediaQuery.addEventListener('change', handleChange)
		return () => mediaQuery.removeEventListener('change', handleChange)
	}, [])

	return isMobile
}

/**
 * 这里保留 shadcn Sidebar 的组合式 API，但先不接 collapse / rail / mobile，
 * 避免打乱当前 shell 与 main card 的分层契约。
 */
function SidebarProvider({ className, children, ...props }: React.ComponentProps<'div'>) {
	const isMobile = useIsMobile()

	return (
		<SidebarContext.Provider value={{ open: true, isMobile }}>
			<div
				className={cn('group/sidebar-wrapper flex min-h-0 flex-1 overflow-hidden', className)}
				data-slot='sidebar-provider'
				{...props}
			>
				{children}
			</div>
		</SidebarContext.Provider>
	)
}

function useSidebar() {
	const context = React.useContext(SidebarContext)

	if (!context) {
		throw new Error('useSidebar 必须运行在 SidebarProvider 内部')
	}

	return context
}

function Sidebar({ className, ...props }: React.ComponentProps<'aside'>) {
	return (
		<aside
			className={cn(
				'flex h-full w-(--sf-shell-sidebar-width) shrink-0 flex-col overflow-hidden bg-(--sf-color-shell-chrome)',
				className,
			)}
			data-slot='sidebar'
			{...props}
		/>
	)
}

function SidebarHeader({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			className={cn('flex shrink-0 flex-col', className)}
			data-slot='sidebar-header'
			{...props}
		/>
	)
}

function SidebarContent({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			className={cn('flex min-h-0 flex-1 flex-col overflow-y-auto', className)}
			data-slot='sidebar-content'
			{...props}
		/>
	)
}

function SidebarFooter({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			className={cn('flex shrink-0 flex-col', className)}
			data-slot='sidebar-footer'
			{...props}
		/>
	)
}

function SidebarGroup({ className, ...props }: React.ComponentProps<'section'>) {
	return (
		<section
			className={cn('flex flex-col gap-1 px-3', className)}
			data-slot='sidebar-group'
			{...props}
		/>
	)
}

function SidebarGroupLabel({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			className={cn(
				'px-2.5 text-[10.5px] font-medium tracking-[0.06em] text-(--sf-color-shell-tertiary) uppercase',
				className,
			)}
			data-slot='sidebar-group-label'
			{...props}
		/>
	)
}

function SidebarGroupAction({
	className,
	asChild = false,
	...props
}: React.ComponentProps<'button'> & {
	asChild?: boolean
}) {
	const Comp = asChild ? Slot.Root : 'button'

	return (
		<Comp
			className={cn(
				'inline-flex size-7 shrink-0 items-center justify-center rounded-md border border-transparent text-(--sf-color-shell-secondary) transition-colors hover:bg-(--sf-color-shell-hover) hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/18 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*="size-"])]:size-3.5',
				className,
			)}
			data-slot='sidebar-group-action'
			{...props}
		/>
	)
}

function SidebarGroupContent({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			className={cn('flex flex-col gap-1', className)}
			data-slot='sidebar-group-content'
			{...props}
		/>
	)
}

function SidebarMenu({ className, ...props }: React.ComponentProps<'ul'>) {
	return (
		<ul className={cn('flex flex-col gap-0.5', className)} data-slot='sidebar-menu' {...props} />
	)
}

function SidebarMenuItem({ className, ...props }: React.ComponentProps<'li'>) {
	return (
		<li
			className={cn('group/sidebar-menu-item', className)}
			data-slot='sidebar-menu-item'
			{...props}
		/>
	)
}

const sidebarMenuButtonVariants = cva(
	'flex w-full min-w-0 items-center gap-2 rounded-md border border-transparent text-(--sf-color-shell-secondary) outline-none transition-colors select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/18 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*="size-"])]:size-3.5',
	{
		variants: {
			size: {
				default: 'h-8 px-2.5 text-[13px]',
				sm: 'h-7 px-2 text-[12px]',
				lg: 'h-10 px-2.5 text-[14px]',
			},
			isActive: {
				true: 'border-(--sf-color-border-subtle) bg-sidebar-accent font-medium text-foreground shadow-(--sf-shadow-panel)',
				false: 'hover:bg-(--sf-color-shell-hover) hover:text-foreground',
			},
		},
		defaultVariants: {
			size: 'default',
			isActive: false,
		},
	},
)

function SidebarMenuButton({
	className,
	asChild = false,
	isActive = false,
	size = 'default',
	...props
}: React.ComponentProps<'button'> &
	VariantProps<typeof sidebarMenuButtonVariants> & {
		asChild?: boolean
	}) {
	const Comp = asChild ? Slot.Root : 'button'

	return (
		<Comp
			className={cn(sidebarMenuButtonVariants({ className, isActive, size }))}
			data-active={isActive}
			data-slot='sidebar-menu-button'
			{...props}
		/>
	)
}

function SidebarMenuAction({
	className,
	asChild = false,
	...props
}: React.ComponentProps<'button'> & {
	asChild?: boolean
}) {
	const Comp = asChild ? Slot.Root : 'button'

	return (
		<Comp
			className={cn(
				'inline-flex size-7 shrink-0 items-center justify-center rounded-md border border-transparent text-(--sf-color-shell-secondary) transition-colors hover:bg-(--sf-color-shell-hover) hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/18 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*="size-"])]:size-3.5',
				className,
			)}
			data-slot='sidebar-menu-action'
			{...props}
		/>
	)
}

function SidebarMenuBadge({ className, ...props }: React.ComponentProps<'span'>) {
	return (
		<span
			className={cn(
				'ml-auto shrink-0 text-[12px] font-semibold text-(--sf-color-shell-secondary)',
				className,
			)}
			data-slot='sidebar-menu-badge'
			{...props}
		/>
	)
}

function SidebarMenuSub({ className, ...props }: React.ComponentProps<'ul'>) {
	return (
		<ul
			className={cn(
				'relative ml-5 flex flex-col gap-0.5 border-l border-(--sf-color-border-subtle) pl-3',
				className,
			)}
			data-slot='sidebar-menu-sub'
			{...props}
		/>
	)
}

function SidebarMenuSubItem({ className, ...props }: React.ComponentProps<'li'>) {
	return (
		<li className={cn('relative', className)} data-slot='sidebar-menu-sub-item' {...props} />
	)
}

const sidebarMenuSubButtonVariants = cva(
	'relative flex w-full min-w-0 items-center gap-2 rounded-md border border-transparent text-(--sf-color-shell-secondary) outline-none transition-colors select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/18 disabled:pointer-events-none disabled:opacity-50 before:absolute before:-left-3 before:top-1/2 before:h-px before:w-3 before:-translate-y-1/2 before:bg-(--sf-color-border-subtle) [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*="size-"])]:size-3.5',
	{
		variants: {
			size: {
				default: 'h-8 px-2.5 text-[13px]',
				sm: 'h-7 px-2 text-[12px]',
			},
			isActive: {
				true: 'border-(--sf-color-border-subtle) bg-sidebar-accent font-medium text-foreground shadow-(--sf-shadow-panel)',
				false: 'hover:bg-(--sf-color-shell-hover) hover:text-foreground',
			},
		},
		defaultVariants: {
			size: 'default',
			isActive: false,
		},
	},
)

function SidebarMenuSubButton({
	className,
	asChild = false,
	isActive = false,
	size = 'default',
	...props
}: React.ComponentProps<'a'> &
	VariantProps<typeof sidebarMenuSubButtonVariants> & {
		asChild?: boolean
	}) {
	const Comp = asChild ? Slot.Root : 'a'

	return (
		<Comp
			className={cn(sidebarMenuSubButtonVariants({ className, isActive, size }))}
			data-active={isActive}
			data-slot='sidebar-menu-sub-button'
			{...props}
		/>
	)
}

export {
	SidebarProvider,
	Sidebar,
	SidebarHeader,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupLabel,
	SidebarGroupAction,
	SidebarGroupContent,
	SidebarMenu,
	SidebarMenuItem,
	SidebarMenuButton,
	SidebarMenuAction,
	SidebarMenuBadge,
	SidebarMenuSub,
	SidebarMenuSubItem,
	SidebarMenuSubButton,
	useSidebar,
}

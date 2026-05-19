'use client'

import * as React from 'react'
import { AlertDialog as AlertDialogPrimitive } from 'radix-ui'

import { cn } from '@/shared/lib/utils'
import { useRegisterOpenModal } from '@/shared/lib/modal-guard'
import { buttonVariants } from '@/shared/ui/base/button'

// AlertDialog 内通过 data 属性定位确认/取消按钮，
// 让 Content 层的硬键盘合约（Enter/Escape）可以独立于焦点位置工作。
const ALERT_DIALOG_ACTION_SELECTOR = '[data-alert-dialog-action="true"]'
const ALERT_DIALOG_CANCEL_SELECTOR = '[data-slot="alert-dialog-cancel"]'

function AlertDialog({
	open,
	defaultOpen,
	onOpenChange,
	...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Root>) {
	// 内部维护一份 open 状态副本，以便受控与非受控两种用法都能接入 ModalGuard。
	const [internalOpen, setInternalOpen] = React.useState<boolean>(defaultOpen ?? false)
	const isControlled = open !== undefined
	const currentOpen = isControlled ? open : internalOpen

	const handleOpenChange = React.useCallback(
		(nextOpen: boolean) => {
			if (!isControlled) {
				setInternalOpen(nextOpen)
			}
			onOpenChange?.(nextOpen)
		},
		[isControlled, onOpenChange],
	)

	useRegisterOpenModal(currentOpen)

	return (
		<AlertDialogPrimitive.Root
			data-slot='alert-dialog'
			open={open}
			defaultOpen={defaultOpen}
			onOpenChange={handleOpenChange}
			{...props}
		/>
	)
}

function AlertDialogTrigger({
	...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Trigger>) {
	return <AlertDialogPrimitive.Trigger data-slot='alert-dialog-trigger' {...props} />
}

function AlertDialogPortal({ ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Portal>) {
	return <AlertDialogPrimitive.Portal data-slot='alert-dialog-portal' {...props} />
}

function AlertDialogOverlay({
	className,
	...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Overlay>) {
	return (
		<AlertDialogPrimitive.Overlay
			className={cn(
				'fixed inset-0 isolate z-50 bg-sf-overlay-scrim duration-100 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0',
				className,
			)}
			data-slot='alert-dialog-overlay'
			{...props}
		/>
	)
}

function AlertDialogContent({
	className,
	onOpenAutoFocus,
	onKeyDownCapture,
	...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Content>) {
	// 默认聚焦行为：把焦点放到 Content 容器本身（tabIndex=-1 + outline-none），
	// 这样既能保证焦点处于 Dialog 焦点陷阱内（键盘合约可生效），
	// 又不会在打开时显示任何可见的 focus ring。
	// 用户按 Tab 时焦点才会移动到第一个可聚焦按钮，呈现 focus-visible 状态。
	const handleOpenAutoFocus = React.useCallback(
		(event: Event) => {
			onOpenAutoFocus?.(event)
			if (event.defaultPrevented) {
				return
			}
			event.preventDefault()
			const content = event.currentTarget
			if (content instanceof HTMLElement) {
				content.focus({ preventScroll: true })
			}
		},
		[onOpenAutoFocus],
	)

	// 硬键盘合约：弹窗打开后只承认 Enter / Escape，其他键统一阻断冒泡。
	// - Enter  → 始终触发 data-alert-dialog-action 按钮（不依赖焦点位置）
	// - Escape → 始终触发 data-slot=alert-dialog-cancel 按钮（显式调用，确保 onCancel 副作用执行）
	// - 其他键 → stopPropagation 防止冒到 window 上的全局命令快捷键监听
	//   注意：不 preventDefault，以保留 Tab 等浏览器原生焦点切换行为。
	const handleKeyDownCapture = React.useCallback(
		(event: React.KeyboardEvent<HTMLDivElement>) => {
			onKeyDownCapture?.(event)

			const nativeEvent = event.nativeEvent
			const isComposing = 'isComposing' in nativeEvent && nativeEvent.isComposing
			if (isComposing) {
				return
			}

			const key = event.key

			if (key === 'Enter') {
				// 修饰键组合（Cmd/Ctrl/Alt/Shift+Enter）不视为"提交"，避免误触
				if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) {
					event.stopPropagation()
					return
				}
				// 焦点在可编辑控件内时让位给原生行为
				const target = event.target
				if (
					target instanceof HTMLElement &&
					(target.closest('textarea') ||
						target.closest('[contenteditable="true"]') ||
						target.getAttribute('role') === 'textbox')
				) {
					return
				}

				// 如果 Tab 已将焦点移到对话框内的某个可交互元素（按钮/链接等），
				// 显式 click 该元素并阻断冒泡，确保全局命令不感知此次 Enter。
				// 不依赖"原生 Enter 激活 button"，是为了在测试与实际行为保持一致。
				const focused = document.activeElement
				const dialogEl = event.currentTarget
				if (
					focused instanceof HTMLElement &&
					focused !== dialogEl &&
					dialogEl.contains(focused)
				) {
					event.preventDefault()
					event.stopPropagation()
					focused.click()
					return
				}

				// 没有按钮被聚焦时（焦点在 Content 容器本身），回退到确认按钮作为默认行为
				const action = dialogEl.querySelector<HTMLElement>(ALERT_DIALOG_ACTION_SELECTOR)
				if (action) {
					event.preventDefault()
					event.stopPropagation()
					action.click()
				}
				return
			}

			if (key === 'Escape') {
				const cancel = event.currentTarget.querySelector<HTMLElement>(
					ALERT_DIALOG_CANCEL_SELECTOR,
				)
				if (cancel) {
					event.preventDefault()
					event.stopPropagation()
					cancel.click()
				}
				return
			}

			// Tab / Shift+Tab：完全不拦截，交还给 Radix FocusTrap 处理，
			// 确保焦点在对话框内的两个按钮之间循环而不会逃逸。
			if (key === 'Tab') {
				return
			}

			// 其他所有按键：仅阻断向 window 冒泡，避免触发全局命令快捷键；
			// 不调用 preventDefault，保留浏览器默认行为。
			event.stopPropagation()
		},
		[onKeyDownCapture],
	)

	return (
		<AlertDialogPortal>
			<AlertDialogOverlay />
			<AlertDialogPrimitive.Content
				className={cn(
					'fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl border border-sf-border-secondary bg-popover p-4 text-sm text-popover-foreground shadow-(--sf-shadow-float) outline-none duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 sm:max-w-sm',
					className,
				)}
				data-slot='alert-dialog-content'
				tabIndex={-1}
				onOpenAutoFocus={handleOpenAutoFocus}
				onKeyDownCapture={handleKeyDownCapture}
				{...props}
			/>
		</AlertDialogPortal>
	)
}

function AlertDialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			className={cn('flex flex-col gap-2', className)}
			data-slot='alert-dialog-header'
			{...props}
		/>
	)
}

function AlertDialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			className={cn(
				'-mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-xl border-t border-sf-divider bg-muted/60 p-4 sm:flex-row sm:justify-end',
				className,
			)}
			data-slot='alert-dialog-footer'
			{...props}
		/>
	)
}

function AlertDialogTitle({
	className,
	...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Title>) {
	return (
		<AlertDialogPrimitive.Title
			className={cn('text-base leading-none font-medium', className)}
			data-slot='alert-dialog-title'
			{...props}
		/>
	)
}

function AlertDialogDescription({
	className,
	...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Description>) {
	return (
		<AlertDialogPrimitive.Description
			className={cn('text-sm text-muted-foreground', className)}
			data-slot='alert-dialog-description'
			{...props}
		/>
	)
}

function AlertDialogAction({
	className,
	...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Action>) {
	return (
		<AlertDialogPrimitive.Action
			data-alert-dialog-action='true'
			className={cn(buttonVariants(), className)}
			data-slot='alert-dialog-action'
			{...props}
		/>
	)
}

function AlertDialogCancel({
	className,
	...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Cancel>) {
	return (
		<AlertDialogPrimitive.Cancel
			className={cn(buttonVariants({ variant: 'outline' }), className)}
			data-slot='alert-dialog-cancel'
			{...props}
		/>
	)
}

export {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogOverlay,
	AlertDialogPortal,
	AlertDialogTitle,
	AlertDialogTrigger,
}

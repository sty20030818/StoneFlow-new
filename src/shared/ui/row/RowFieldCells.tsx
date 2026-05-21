import { forwardRef } from 'react'
import type { ComponentProps, ReactNode } from 'react'

import { cn } from '@/shared/lib/utils'
import { Button, buttonVariants } from '@/shared/ui/base/button'
import type { VariantProps } from 'class-variance-authority'

type StopEvent = {
	stopPropagation: () => void
}

function stopRowEventPropagation(event: StopEvent) {
	event.stopPropagation()
}

export type RowSelectionCellProps = {
	checked: boolean
	visible?: boolean
	disabled?: boolean
	ariaLabel: string
	onCheckedChange: () => void
}

export type RowTitleCellProps = {
	title: string
	doneLike?: boolean
	className?: string
}

export type RowMetaButtonProps = Omit<ComponentProps<'button'>, 'children'> &
	VariantProps<typeof buttonVariants> & {
		icon?: ReactNode
		label?: ReactNode
		trailing?: ReactNode
		children?: ReactNode
	}

export type RowActionButtonProps = ComponentProps<typeof Button>

/**
 * 行级选择框：保持固定 20x20 触发区域，未选中时只通过透明度变化，不改变占位。
 */
export function RowSelectionCell({
	checked,
	visible = false,
	disabled,
	ariaLabel,
	onCheckedChange,
}: RowSelectionCellProps) {
	const isVisible = checked || visible

	return (
		<button
			aria-checked={checked}
			aria-label={ariaLabel}
			className={cn(
				'flex size-5 shrink-0 items-center justify-center rounded-full bg-transparent p-0 outline-none transition-colors disabled:pointer-events-none disabled:opacity-40',
				isVisible ? 'opacity-100' : 'opacity-0',
				'focus-visible:border-border focus-visible:ring-0',
			)}
			data-checked={checked}
			disabled={disabled}
			onClick={(event) => {
				stopRowEventPropagation(event)
				onCheckedChange()
			}}
			onKeyDownCapture={stopRowEventPropagation}
			onPointerDownCapture={stopRowEventPropagation}
			role='checkbox'
			type='button'
		>
			<span
				className={cn(
					'flex size-4 items-center justify-center rounded-[5px] border transition-colors',
					checked
						? 'border-primary bg-primary text-primary-foreground'
						: 'border-sf-border-strong bg-transparent text-transparent hover:border-sf-icon-secondary',
				)}
			>
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
			</span>
		</button>
	)
}

export function RowTitleCell({ title, doneLike = false, className }: RowTitleCellProps) {
	return (
		<p
			className={cn(
				'truncate text-sm font-medium text-foreground transition-colors group-hover/row-shell:text-foreground',
				doneLike ? 'text-sf-text-tertiary line-through' : null,
				className,
			)}
		>
			{title}
		</p>
	)
}

/**
 * 统一行字段按钮壳：outline + icon + text + chevron，默认阻断事件冒泡，避免触发行点击。
 */
export const RowMetaButton = forwardRef<HTMLButtonElement, RowMetaButtonProps>(
	function RowMetaButton(
		{
			icon,
			label,
			trailing = null,
			children,
			className,
			variant = 'outline',
			size = 'sm',
			onClick,
			onPointerDown,
			onKeyDownCapture,
			...props
		},
		ref,
	) {
		return (
			<button
				{...props}
				className={cn(buttonVariants({ className: cn('max-w-45', className), size, variant }))}
				data-size={size}
				data-variant={variant}
				onClick={(event) => {
					stopRowEventPropagation(event)
					onClick?.(event)
				}}
				onKeyDownCapture={(event) => {
					stopRowEventPropagation(event)
					onKeyDownCapture?.(event)
				}}
				onPointerDown={(event) => {
					stopRowEventPropagation(event)
					onPointerDown?.(event)
				}}
				ref={ref}
			>
				{children ?? (
					<>
						{icon}
						<span className='min-w-0 truncate'>{label}</span>
						{trailing}
					</>
				)}
			</button>
		)
	},
)

export function RowActionButton({
	className,
	variant = 'outline',
	size = 'sm',
	onClick,
	onPointerDown,
	onKeyDownCapture,
	...props
}: RowActionButtonProps) {
	return (
		<Button
			{...props}
			className={className}
			onClick={(event) => {
				stopRowEventPropagation(event)
				onClick?.(event)
			}}
			onKeyDownCapture={(event) => {
				stopRowEventPropagation(event)
				onKeyDownCapture?.(event)
			}}
			onPointerDown={(event) => {
				stopRowEventPropagation(event)
				onPointerDown?.(event)
			}}
			size={size}
			variant={variant}
		/>
	)
}

export { stopRowEventPropagation }

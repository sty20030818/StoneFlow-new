import { forwardRef } from 'react'
import type { ComponentProps, ReactNode } from 'react'

import { cn } from '@/shared/lib/utils'
import { Button, buttonVariants } from '@/shared/components/base/button'
import { Checkbox } from '@/shared/components/base/checkbox'
import { ActionTooltip, DisabledActionTooltip, OverflowTooltip } from '@/shared/components/tooltip'
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
	disabledReason?: ReactNode
	label: string
	ariaLabel?: string
	tooltipShortcut?: ReactNode
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
 * 行级选择框：保持固定 20x20 布局占位；命中区域由基础 Checkbox 扩展。
 */
export function RowSelectionCell({
	checked,
	visible = false,
	disabled,
	disabledReason,
	label,
	ariaLabel,
	tooltipShortcut,
	onCheckedChange,
}: RowSelectionCellProps) {
	const accessibleLabel = ariaLabel ?? label
	// checked / visible（键盘 hover）强制显示；指针 hover 用 row-shell group，避免 React 全表 re-render
	const forceVisible = checked || visible
	const checkbox = (
		<Checkbox
			aria-label={accessibleLabel}
			checked={checked}
			disabled={disabled}
			onCheckedChange={() => onCheckedChange()}
			onClick={stopRowEventPropagation}
			onKeyDownCapture={stopRowEventPropagation}
			onPointerDownCapture={stopRowEventPropagation}
		/>
	)
	const cell = (
		<span
			className={cn(
				'flex size-5 shrink-0 items-center justify-center',
				forceVisible
					? 'opacity-100'
					: 'opacity-0 group-hover/row-shell:opacity-100 group-has-focus-visible/row-shell:opacity-100',
			)}
			data-slot='row-selection-cell'
		>
			{checkbox}
		</span>
	)

	if (disabled) {
		return disabledReason ? (
			<DisabledActionTooltip
				ariaLabel={accessibleLabel}
				label={label}
				reason={disabledReason}
				shortcut={tooltipShortcut}
			>
				{cell}
			</DisabledActionTooltip>
		) : (
			cell
		)
	}

	return (
		<ActionTooltip>
			<ActionTooltip.Trigger asChild>{cell}</ActionTooltip.Trigger>
			<ActionTooltip.Content>
				<ActionTooltip.Row label={label} shortcut={tooltipShortcut} />
			</ActionTooltip.Content>
		</ActionTooltip>
	)
}

export function RowTitleCell({ title, doneLike = false, className }: RowTitleCellProps) {
	return (
		<OverflowTooltip
			className={cn(
				'truncate text-sm font-medium text-legacy-foreground group-hover/row-shell:text-legacy-foreground',
				doneLike ? 'text-sf-text-tertiary line-through' : null,
				className,
			)}
			content={title}
		>
			{title}
		</OverflowTooltip>
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
						<OverflowTooltip className='min-w-0' content={label}>
							{label}
						</OverflowTooltip>
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

import { cn } from '@/shared/lib/utils'

type ShortcutMenuItemHintProps = {
	digit: string
	className?: string
}

/**
 * Dropdown 菜单项右侧数字提示。
 * 只负责展示，不承担任何行为。
 */
export function ShortcutMenuItemHint({ digit, className }: ShortcutMenuItemHintProps) {
	return (
		<span
			aria-hidden
			data-slot='shortcut-menu-item-hint'
			className={cn(
				'inline-flex shrink-0 items-center justify-center rounded-sm border border-transparent bg-muted/70 px-1.5 py-0.5 text-[11px] font-medium leading-none tabular-nums text-muted-foreground',
				className,
			)}
		>
			{digit}
		</span>
	)
}

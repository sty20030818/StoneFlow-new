import { cn } from '@/shared/lib/utils'
import { Kbd } from '@/shared/ui/base/kbd'

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
		<Kbd
			aria-hidden
			data-slot='shortcut-menu-item-hint'
			className={cn(
				'h-auto min-w-0 shrink-0 rounded-none border-0 bg-transparent px-0 text-[11px] font-medium text-muted-foreground shadow-none',
				className,
			)}
		>
			{digit}
		</Kbd>
	)
}

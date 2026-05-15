import { ArrowRightIcon } from 'lucide-react'

import { Kbd, KbdGroup } from '@/shared/ui/base/kbd'
import { cn } from '@/shared/lib/utils'
import type { ShortcutToken } from '@/features/command/keybinding'

type ShortcutTokensProps = {
	tokens: ShortcutToken[]
	className?: string
	kbdClassName?: string
	separatorClassName?: string
}

/**
 * Command 相关的快捷键展示统一走 token 渲染，避免不同面板各自拼字符串。
 */
export function ShortcutTokens({
	tokens,
	className,
	kbdClassName,
	separatorClassName,
}: ShortcutTokensProps) {
	if (tokens.length === 0) {
		return null
	}

	return (
		<KbdGroup className={cn('shrink-0 gap-1.5', className)}>
			{tokens.map((token, index) =>
				token.type === 'separator' ? (
					<ArrowRightIcon
						aria-hidden='true'
						className={cn('size-3 shrink-0 text-sf-text-quaternary', separatorClassName)}
						key={`${token.type}-${token.value}-${index}`}
					/>
				) : (
					<Kbd className={kbdClassName} key={`${token.type}-${token.value}-${index}`}>
						{token.value}
					</Kbd>
				),
			)}
		</KbdGroup>
	)
}

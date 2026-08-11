import { ArrowRightIcon } from 'lucide-react'

import { Kbd, KbdGroup } from '@/shared/components/base/kbd'
import { getShortcutAccessibilityLabel, type ShortcutToken } from '@/shared/lib/keyboardShortcut'
import { cn } from '@/shared/lib/utils'

type ShortcutTokensProps = {
	tokens: readonly ShortcutToken[]
	className?: string
	kbdClassName?: string
	separatorClassName?: string
}

/**
 * 统一渲染平台化快捷键 token，并为视觉符号提供可读的无障碍名称。
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
		<KbdGroup
			aria-label={getShortcutAccessibilityLabel(tokens)}
			className={cn('shrink-0 gap-1.5', className)}
		>
			{tokens.map((token, index) =>
				token.type === 'separator' ? (
					<ArrowRightIcon
						aria-hidden='true'
						className={cn('size-3 shrink-0 text-sf-text-quaternary', separatorClassName)}
						key={`${token.type}-${token.value}-${index}`}
					/>
				) : (
					<Kbd
						aria-hidden='true'
						className={kbdClassName}
						key={`${token.type}-${token.value}-${index}`}
					>
						{token.value}
					</Kbd>
				),
			)}
		</KbdGroup>
	)
}

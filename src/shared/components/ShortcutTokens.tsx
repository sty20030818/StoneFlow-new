import { Kbd } from '@heroui/react'
import { ArrowRightIcon } from 'lucide-react'

import { getShortcutAccessibilityLabel, type ShortcutToken } from '@/shared/lib/keyboardShortcut'
import { cn } from '@/shared/lib/utils'

type ShortcutTokensProps = {
	tokens: readonly ShortcutToken[]
	className?: string
}

/**
 * 统一渲染平台化快捷键 token，并为视觉符号提供可读的无障碍名称。
 */
export function ShortcutTokens({ tokens, className }: ShortcutTokensProps) {
	if (tokens.length === 0) {
		return null
	}

	return (
		<span
			aria-label={getShortcutAccessibilityLabel(tokens)}
			className={cn('inline-flex shrink-0 items-center gap-1.5', className)}
			role='group'
		>
			{tokens.map((token, index) =>
				token.type === 'separator' ? (
					<ArrowRightIcon
						aria-hidden='true'
						className='size-3 shrink-0 text-muted'
						key={`${token.type}-${token.value}-${index}`}
					/>
				) : (
					<Kbd aria-hidden='true' key={`${token.type}-${token.value}-${index}`}>
						<Kbd.Content>{token.value}</Kbd.Content>
					</Kbd>
				),
			)}
		</span>
	)
}

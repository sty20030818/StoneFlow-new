import { ArrowRightIcon } from 'lucide-react'

import { Kbd, KbdGroup } from '@/shared/components/base/kbd'
import { cn } from '@/shared/lib/utils'
import type { ShortcutToken } from '@/features/command/keybinding'
import { getShortcutAccessibilityLabel } from '@/features/command/shortcuts'

type ShortcutTokensProps = {
	tokens: readonly ShortcutToken[]
	accessibilityLabel?: string
	className?: string
	kbdClassName?: string
	separatorClassName?: string
}

/**
 * Command 相关的快捷键展示统一走 token 渲染，避免不同面板各自拼字符串。
 */
export function ShortcutTokens({
	tokens,
	accessibilityLabel,
	className,
	kbdClassName,
	separatorClassName,
}: ShortcutTokensProps) {
	if (tokens.length === 0) {
		return null
	}

	const keyedTokens = attachTokenKeys(tokens)
	const resolvedAccessibilityLabel = accessibilityLabel ?? getShortcutAccessibilityLabel(tokens)

	return (
		<KbdGroup aria-label={resolvedAccessibilityLabel} className={cn('shrink-0 gap-1.5', className)}>
			{keyedTokens.map(({ token, key }) =>
				token.type === 'separator' ? (
					<ArrowRightIcon
						aria-hidden='true'
						className={cn('size-3 shrink-0 text-sf-text-quaternary', separatorClassName)}
						key={key}
					/>
				) : (
					<Kbd aria-hidden='true' className={kbdClassName} key={key}>
						{token.value}
					</Kbd>
				),
			)}
		</KbdGroup>
	)
}

/**
 * 同一序列里可能出现重复 token（如非 Mac 平台 meta+ctrl 都渲染成 "Ctrl"），
 * 用内容 + 出现次数生成稳定 key，避免依赖数组下标。
 */
function attachTokenKeys(tokens: readonly ShortcutToken[]) {
	const seenCount = new Map<string, number>()
	return tokens.map((token) => {
		const base = `${token.type}-${token.value}`
		const occurrence = seenCount.get(base) ?? 0
		seenCount.set(base, occurrence + 1)
		return { token, key: occurrence === 0 ? base : `${base}-${occurrence}` }
	})
}

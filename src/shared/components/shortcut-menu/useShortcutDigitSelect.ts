import { useEffect, useMemo } from 'react'

import { buildDigitShortcutMap, type ShortcutMenuItem } from './buildDigitShortcutMap'
import { useLatestRef } from '@/shared/lib/useLatestRef'

type UseShortcutDigitSelectOptions<TValue> = {
	items: ShortcutMenuItem<TValue>[]
	onSelect: (item: ShortcutMenuItem<TValue>) => void
}

/**
 * dropdown 打开时的数字键接管器：
 * - 只在菜单内容挂载时生效；
 * - 仅处理单个数字键；
 * - 不改菜单项顺序，不改原有点击行为。
 */
export function useShortcutDigitSelect<TValue>({
	items,
	onSelect,
}: UseShortcutDigitSelectOptions<TValue>) {
	const digitShortcutMap = useMemo(() => buildDigitShortcutMap(items), [items])
	const onSelectRef = useLatestRef(onSelect)
	const mapRef = useLatestRef(digitShortcutMap)

	useEffect(() => {
		function handleKeyDown(event: KeyboardEvent) {
			if (
				event.defaultPrevented ||
				event.altKey ||
				event.ctrlKey ||
				event.metaKey ||
				event.isComposing
			) {
				return
			}

			const digit = normalizeDigitKey(event.key)
			if (!digit) {
				return
			}

			const entry = mapRef.current.find((item) => item.digit === digit && !item.item.disabled)
			if (!entry) {
				return
			}

			event.preventDefault()
			event.stopPropagation()
			onSelectRef.current(entry.item)
			closeDropdownMenu()
		}

		window.addEventListener('keydown', handleKeyDown, true)
		return () => window.removeEventListener('keydown', handleKeyDown, true)
		// mapRef/onSelectRef 由 useLatestRef 提供，引用稳定，纳入依赖只是满足 exhaustive-deps 检查。
	}, [mapRef, onSelectRef])

	return {
		digitShortcutMap,
	}
}

type ShortcutDigitSelectLayerProps<TValue> = UseShortcutDigitSelectOptions<TValue>

/**
 * 只在 DropdownMenuContent 挂载期间接管数字键。
 * 这样不需要把 Radix Root 做成受控组件，也不会在菜单关闭后保留监听。
 */
export function ShortcutDigitSelectLayer<TValue>(props: ShortcutDigitSelectLayerProps<TValue>) {
	useShortcutDigitSelect(props)
	return null
}

function normalizeDigitKey(key: string) {
	return /^[0-9]$/.test(key) ? key : null
}

function closeDropdownMenu() {
	const target = document.activeElement ?? document.body
	target.dispatchEvent(
		new KeyboardEvent('keydown', {
			key: 'Escape',
			bubbles: true,
			cancelable: true,
		}),
	)
}
